import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

// ----------------------------------------------------------------------------
// 1. Hosting Environment & Tokio Worker Optimization (CloudLinux LVE Compliant)
// ----------------------------------------------------------------------------
// Shared hosting environments (cPanel/CloudLinux) enforce strict process/thread
// limits (ulimit -u). Tokio defaults to host core count (e.g. 32 threads) which
// CloudLinux blocks, causing 'PANIC: timer has gone away'. Restricting to 1 thread
// prevents thread pool exhaustion panics.
process.env.TOKIO_WORKER_THREADS = "1";
process.env.RAYON_NUM_THREADS = "1";
process.env.PRISMA_CLIENT_ENGINE_TYPE = "library";
process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = "library";

// Load database URL strictly from environment configuration (never hardcode credentials)
const CONFIGURED_DB_URL = process.env.DATABASE_URL || process.env.DIRECT_URL || "";

if (!process.env.DATABASE_URL && CONFIGURED_DB_URL) {
  process.env.DATABASE_URL = CONFIGURED_DB_URL;
}
if (!process.env.DIRECT_URL && CONFIGURED_DB_URL) {
  process.env.DIRECT_URL = CONFIGURED_DB_URL;
}

export function buildPrismaUrl(url: string): string {
  if (!url) return url;
  if (!url.includes("connection_limit=")) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}connection_limit=3&pool_timeout=10`;
  }
  return url;
}

const connectionString = process.env.DATABASE_URL || CONFIGURED_DB_URL;

// ----------------------------------------------------------------------------
// 2. Linux / CloudLinux RHEL Query Engine Detection (Optional Local Fallback)
// ----------------------------------------------------------------------------
if (process.platform === "linux" && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "node_modules", ".prisma", "client", "libquery_engine-rhel-openssl-1.1.x.so.node"),
    path.join(cwd, ".prisma", "client", "libquery_engine-rhel-openssl-1.1.x.so.node"),
    path.join(cwd, "node_modules", ".prisma", "client", "libquery_engine-debian-openssl-1.1.x.so.node"),
    path.join(cwd, ".prisma", "client", "libquery_engine-debian-openssl-1.1.x.so.node"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = c;
      break;
    }
  }
}

// Mode setting: By default, pure-JS PostgreSQL driver (pg) is used for 100% of queries.
// Pure-JS pg uses standard Node.js TCP sockets and zero OS worker threads, completely
// eliminating CloudLinux LVE thread exhaustion, Tokio panics, and native addon aborts.
export const USE_PURE_PG = process.env.FORCE_PURE_PG !== "false";

// ----------------------------------------------------------------------------
// 3. Pure-JavaScript PostgreSQL Client Pool (Zero Native Threads / Zero Aborts)
// ----------------------------------------------------------------------------
function sanitizePgUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    // Strip Prisma-specific query params that standard pg might misinterpret or fail on
    u.searchParams.delete("connection_limit");
    u.searchParams.delete("pool_timeout");
    u.searchParams.delete("schema");
    return u.toString();
  } catch {
    return rawUrl;
  }
}

export function getPgPool(): any {
  const existingPool = global.__gfmsPgPool;
  if (existingPool && !existingPool.ending && !existingPool.ended) {
    return existingPool;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require("pg");
    const cleanedUrl = sanitizePgUrl(connectionString);
    // On shared cPanel / CloudLinux plans, Postgres max connections are typically 15-25.
    // Default 5 sockets per single-process worker handles heavy concurrent bursts cleanly while leaving headroom.
    const poolMax = Math.min(
      10,
      Math.max(2, parseInt(process.env.PG_POOL_MAX || "5", 10))
    );
    const pool = new Pool({
      connectionString: cleanedUrl,
      ssl:
        cleanedUrl.includes("localhost") || cleanedUrl.includes("127.0.0.1")
          ? false
          : { rejectUnauthorized: false },
      max: poolMax,
      min: 0, // Release idle sockets when idle so DB connection slots stay available
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      query_timeout: 15000,
      statement_timeout: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: true, // Never block worker shutdown/recycle on idle pool clients
    });

    // CRITICAL: Prevent uncaughtException from crashing the Node.js process when
    // shared hosting abruptly terminates idle client connections
    pool.on("error", (err: any) => {
      console.warn("[GFMS PostgreSQL Pool Warning - Handled]:", err?.message || err);
    });

    global.__gfmsPgPool = pool;
    return pool;
  } catch (err: any) {
    console.warn("[GFMS Server] Note: Native 'pg' module not loaded:", err.message);
    return null;
  }
}

// Helper for direct parameterized SQL execution with transient retry logic for high concurrency
export async function queryRawPg<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("PostgreSQL pool is not available on this server.");
  }

  let attempts = 0;
  const maxAttempts = 2;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    attempts++;
    let client: any = null;
    try {
      client = await pool.connect();
      const res = await client.query(sql, params);
      return res.rows;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isFatalSocket =
        errMsg.includes("Connection terminated") ||
        errMsg.includes("connection reset") ||
        errMsg.includes("read ECONNRESET") ||
        errMsg.includes("socket hang up");

      // Critical: Evict broken socket from the pool so dead sockets are not handed to subsequent queries
      if (client && isFatalSocket) {
        try {
          client.release(true);
        } catch {
          // ignore
        }
        client = null;
      }

      const isTransient =
        errMsg.includes("timeout") ||
        errMsg.includes("Connection terminated") ||
        errMsg.includes("connection reset") ||
        errMsg.includes("too many clients") ||
        errMsg.includes("remaining connection slots");

      const isOverloaded =
        (errMsg.includes("timeout") || errMsg.includes("too many clients")) &&
        (pool.waitingCount || 0) > 8;

      if (isTransient && !isOverloaded && attempts < maxAttempts) {
        const backoffMs = attempts * 120 + Math.floor(Math.random() * 100);
        console.warn(`[queryRawPg] Transient DB load spike (${errMsg}). Retrying attempt ${attempts + 1}/${maxAttempts} in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw err;
    } finally {
      if (client) {
        try {
          client.release();
        } catch {
          // ignore release error
        }
      }
    }
  }

  throw lastError;
}

// ----------------------------------------------------------------------------
// Database Auto-Heal & Sequence Synchronization Engine
// ----------------------------------------------------------------------------
export async function ensureDatabaseHealth(): Promise<void> {
  if (global.__gfmsHealPromise) return global.__gfmsHealPromise;
  global.__gfmsHealPromise = (async () => {
    try {
      const pool = getPgPool();
      if (!pool) return;

      // Fast lock-free pre-check so worker restarts avoid unnecessary ACCESS EXCLUSIVE ALTER TABLE locks
      let schemaReady = false;
      try {
        const rows = await queryRawPg<{ ready: boolean }>(`
          SELECT (
            (
              SELECT COUNT(*) FROM information_schema.columns
              WHERE table_schema = 'public'
                AND (
                  (table_name = 'students' AND column_name IN ('arm', 'gender', 'session', 'status'))
                  OR (table_name = 'objective_questions' AND (column_name = 'image_url' OR (column_name = 'points' AND data_type = 'numeric')))
                  OR (table_name = 'theory_questions' AND column_name = 'image_url')
                  OR (table_name = 'teacher_question_submissions' AND column_name = 'image_url')
                  OR (table_name = 'exams' AND column_name IN ('created_by', 'is_archived'))
                  OR (table_name = 'exam_attempts' AND (
                    column_name IN ('teacher_comment', 'is_transmitted_to_admin', 'graded_by_teacher_name')
                    OR (column_name IN ('objective_score', 'total_score', 'theory_score') AND data_type = 'numeric')
                  ))
                  OR (table_name = 'terminal_results' AND column_name IN ('term_label', 'total_possible', 'days_present', 'days_opened', 'days_absent', 'decision', 'is_published'))
                  OR (table_name = 'admin_users' AND column_name IN ('phone', 'assigned_class', 'assigned_subject', 'status'))
                  OR (table_name = 'scratch_cards' AND column_name = 'maxUsage' AND column_default LIKE '%3%')
                )
            ) = 28
            AND (
              SELECT COUNT(*) FROM pg_indexes
              WHERE schemaname = 'public'
                AND indexname IN (
                  'idx_students_adm_no',
                  'idx_exam_attempts_exam_id',
                  'idx_exam_attempts_student_exam',
                  'idx_exam_attempts_is_completed',
                  'idx_objective_questions_exam_id',
                  'idx_theory_questions_exam_id',
                  'idx_exams_is_active',
                  'idx_terminal_results_adm_no',
                  'idx_scratch_cards_pin'
                )
            ) = 9
            AND NOT EXISTS (SELECT 1 FROM "scratch_cards" WHERE "maxUsage" = 2 LIMIT 1)
          ) AS ready
        `);
        schemaReady = Boolean(rows[0]?.ready);
      } catch {
        schemaReady = false;
      }

      // 1. Auto-heal missing columns and performance indexes if anything is absent
      if (!schemaReady) {
        await queryRawPg(`
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "arm" TEXT DEFAULT '';
            ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'MALE';
            ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2025/2026';
            ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
            ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
            ALTER TABLE "objective_questions" ALTER COLUMN "points" TYPE NUMERIC USING points::numeric;
            ALTER TABLE "objective_questions" ALTER COLUMN "points" SET DEFAULT 0.5;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
            ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
            ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
            ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
            ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT false;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
            ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "teacher_comment" TEXT;
            ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "is_transmitted_to_admin" BOOLEAN DEFAULT false;
            ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "graded_by_teacher_name" TEXT;
            ALTER TABLE "exam_attempts" ALTER COLUMN "objective_score" TYPE NUMERIC USING objective_score::numeric;
            ALTER TABLE "exam_attempts" ALTER COLUMN "total_score" TYPE NUMERIC USING total_score::numeric;
            ALTER TABLE "exam_attempts" ALTER COLUMN "theory_score" TYPE NUMERIC USING theory_score::numeric;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
            ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "term_label" TEXT;
            ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "total_possible" INTEGER DEFAULT 0;
            ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "days_present" INTEGER DEFAULT 0;
            ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "days_opened" INTEGER DEFAULT 0;
            ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "days_absent" INTEGER DEFAULT 0;
            ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "decision" TEXT DEFAULT 'PASSED';
            ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN DEFAULT true;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          BEGIN
            ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
            ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_class" TEXT;
            ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_subject" TEXT;
            ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          -- Align scratch cards to 3 checks default
          BEGIN
            ALTER TABLE "scratch_cards" ALTER COLUMN "maxUsage" SET DEFAULT 3;
            UPDATE "scratch_cards" SET "maxUsage" = 3 WHERE "maxUsage" = 2;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          -- Performance indexes for heavy load CBT execution
          BEGIN
            CREATE INDEX IF NOT EXISTS "idx_students_adm_no" ON "students"("adm_no");
            CREATE INDEX IF NOT EXISTS "idx_exam_attempts_exam_id" ON "exam_attempts"("exam_id");
            CREATE INDEX IF NOT EXISTS "idx_exam_attempts_student_exam" ON "exam_attempts"("student_id", "exam_id");
            CREATE INDEX IF NOT EXISTS "idx_exam_attempts_is_completed" ON "exam_attempts"("is_completed");
            CREATE INDEX IF NOT EXISTS "idx_objective_questions_exam_id" ON "objective_questions"("exam_id");
            CREATE INDEX IF NOT EXISTS "idx_theory_questions_exam_id" ON "theory_questions"("exam_id");
            CREATE INDEX IF NOT EXISTS "idx_exams_is_active" ON "exams"("is_active");
            CREATE INDEX IF NOT EXISTS "idx_terminal_results_adm_no" ON "terminal_results"("adm_no");
            CREATE INDEX IF NOT EXISTS "idx_scratch_cards_pin" ON "scratch_cards"("pin");
            EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END $$;
      `);
      }

      // 2. Synchronize all autoincrement sequences to prevent P2002 id unique constraint errors
      await queryRawPg(`
        DO $$
        DECLARE
          tbl text;
          max_id int;
          seq_name text;
        BEGIN
          FOR tbl IN 
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
              AND table_name IN ('exams', 'students', 'objective_questions', 'theory_questions', 'exam_attempts', 'admin_users', 'teacher_question_submissions', 'terminal_results')
          LOOP
            BEGIN
              seq_name := pg_get_serial_sequence('"' || tbl || '"', 'id');
              IF seq_name IS NOT NULL THEN
                EXECUTE 'SELECT COALESCE(MAX(id), 0) FROM "' || tbl || '"' INTO max_id;
                IF max_id > 0 THEN
                  EXECUTE 'SELECT setval(''' || seq_name || ''', ' || max_id || ', true)';
                ELSE
                  EXECUTE 'SELECT setval(''' || seq_name || ''', 1, false)';
                END IF;
              END IF;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
          END LOOP;
        END $$;
      `);
      console.log("✓ [GFMS DB Auto-Heal] Database schema, indexes & autoincrement sequences verified and synchronized.");
    } catch (e: any) {
      console.warn("[GFMS DB Auto-Heal] Note during database auto-heal:", e.message);
    }
  })();
  return global.__gfmsHealPromise;
}

// ----------------------------------------------------------------------------
// 4. Lazy Raw Prisma Client Instantiation (Used only if native fallback is explicitly needed)
// ----------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: any | undefined;
  // eslint-disable-next-line no-var
  var rawPrisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __gfmsPgPool: any | undefined;
  // eslint-disable-next-line no-var
  var __gfmsHealPromise: Promise<void> | undefined;
}

let _rawPrismaInstance: PrismaClient | null = null;
export function getRawPrisma(): PrismaClient {
  if (!_rawPrismaInstance) {
    if (global.rawPrisma) {
      _rawPrismaInstance = global.rawPrisma;
    } else {
      _rawPrismaInstance = new PrismaClient({
        datasources: {
          db: {
            url: buildPrismaUrl(connectionString),
          },
        },
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      });
      global.rawPrisma = _rawPrismaInstance;
    }
  }
  return _rawPrismaInstance;
}

// Lazy proxy for backward compatibility if any module references rawPrisma directly
export const rawPrisma: PrismaClient = new Proxy({} as any, {
  get(_target, prop) {
    const real = getRawPrisma();
    const val = (real as any)[prop];
    return typeof val === "function" ? val.bind(real) : val;
  },
});

// ----------------------------------------------------------------------------
// 5. Pure-JS PostgreSQL Model Operation Fallback Engine
// ----------------------------------------------------------------------------
export let _prismaEnginePanicked = false;

// Pure-JS SQL fallback executor for mission-critical portal operations
async function executePgFallback(model: string, method: string, args: any): Promise<any> {
  // 1. adminUser
  if (model === "adminUser") {
    if (method === "findUnique" || method === "findFirst") {
      const email = args?.where?.email;
      const id = args?.where?.id;
      if (email) {
        const rows = await queryRawPg(
          "SELECT * FROM admin_users WHERE LOWER(email) = LOWER($1) LIMIT 1",
          [email]
        );
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          id: r.id,
          email: r.email,
          password: r.password,
          fullName: r.full_name,
          role: r.role,
          assignedClass: r.assigned_class,
          assignedSubject: r.assigned_subject,
          phone: r.phone,
          status: r.status,
          createdAt: r.created_at,
        };
      }
      if (id) {
        const rows = await queryRawPg("SELECT * FROM admin_users WHERE id = $1 LIMIT 1", [id]);
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          id: r.id,
          email: r.email,
          password: r.password,
          fullName: r.full_name,
          role: r.role,
          assignedClass: r.assigned_class,
          assignedSubject: r.assigned_subject,
          phone: r.phone,
          status: r.status,
          createdAt: r.created_at,
        };
      }
      return null;
    }
    if (method === "findMany") {
      const rows = await queryRawPg("SELECT * FROM admin_users ORDER BY id ASC");
      return rows.map((r: any) => ({
        id: r.id,
        email: r.email,
        password: r.password,
        fullName: r.full_name,
        role: r.role,
        assignedClass: r.assigned_class,
        assignedSubject: r.assigned_subject,
        phone: r.phone,
        status: r.status,
        createdAt: r.created_at,
      }));
    }
    if (method === "create") {
      const d = args?.data;
      const rows = await queryRawPg(
        `INSERT INTO admin_users (email, password, full_name, role, assigned_class, assigned_subject, phone, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
        [
          d.email,
          d.password,
          d.fullName,
          d.role || "TEACHER",
          d.assignedClass || null,
          d.assignedSubject || null,
          d.phone || null,
          d.status || "ACTIVE",
        ]
      );
      const r = rows[0];
      return {
        id: r.id,
        email: r.email,
        password: r.password,
        fullName: r.full_name,
        role: r.role,
        assignedClass: r.assigned_class,
        assignedSubject: r.assigned_subject,
        phone: r.phone,
        status: r.status,
        createdAt: r.created_at,
      };
    }
    if (method === "update") {
      const id = args?.where?.id;
      const email = args?.where?.email;
      const d = args?.data || {};
      let sql = "UPDATE admin_users SET ";
      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;
      if (d.fullName !== undefined) { sets.push(`full_name = $${idx++}`); params.push(d.fullName); }
      if (d.password !== undefined) { sets.push(`password = $${idx++}`); params.push(d.password); }
      if (d.role !== undefined) { sets.push(`role = $${idx++}`); params.push(d.role); }
      if (d.assignedClass !== undefined) { sets.push(`assigned_class = $${idx++}`); params.push(d.assignedClass); }
      if (d.assignedSubject !== undefined) { sets.push(`assigned_subject = $${idx++}`); params.push(d.assignedSubject); }
      if (d.phone !== undefined) { sets.push(`phone = $${idx++}`); params.push(d.phone); }
      if (d.status !== undefined) { sets.push(`status = $${idx++}`); params.push(d.status); }
      if (sets.length === 0) sets.push(`id = id`);
      sql += sets.join(", ");
      if (id) {
        sql += ` WHERE id = $${idx} RETURNING *`;
        params.push(id);
      } else {
        sql += ` WHERE LOWER(email) = LOWER($${idx}) RETURNING *`;
        params.push(email);
      }
      const rows = await queryRawPg(sql, params);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        email: r.email,
        password: r.password,
        fullName: r.full_name,
        role: r.role,
        assignedClass: r.assigned_class,
        assignedSubject: r.assigned_subject,
        phone: r.phone,
        status: r.status,
        createdAt: r.created_at,
      };
    }
    if (method === "delete") {
      const id = args?.where?.id;
      await queryRawPg("DELETE FROM admin_users WHERE id = $1", [id]);
      return { id };
    }
    if (method === "upsert") {
      const existing = await executePgFallback("adminUser", "findUnique", { where: args?.where });
      if (existing) {
        return await executePgFallback("adminUser", "update", { where: args?.where, data: args?.update || args?.create });
      } else {
        return await executePgFallback("adminUser", "create", { data: args?.create });
      }
    }
  }

  // 2. student
  if (model === "student") {
    if (method === "findUnique" || method === "findFirst") {
      const admNo = args?.where?.admNo;
      const id = args?.where?.id;
      if (admNo) {
        const rows = await queryRawPg("SELECT * FROM students WHERE adm_no = $1 LIMIT 1", [admNo]);
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          id: r.id,
          admNo: r.adm_no,
          surname: r.surname,
          fullName: r.full_name,
          currentClass: r.current_class,
          arm: r.arm || "",
          gender: r.gender,
          session: r.session,
          status: r.status,
          createdAt: r.created_at,
        };
      }
      if (id) {
        const rows = await queryRawPg("SELECT * FROM students WHERE id = $1 LIMIT 1", [id]);
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          id: r.id,
          admNo: r.adm_no,
          surname: r.surname,
          fullName: r.full_name,
          currentClass: r.current_class,
          arm: r.arm || "",
          gender: r.gender,
          session: r.session,
          status: r.status,
          createdAt: r.created_at,
        };
      }
      return null;
    }
    if (method === "findMany") {
      const targetClass = args?.where?.currentClass;
      const targetArm = args?.where?.arm;
      let sql = "SELECT * FROM students WHERE 1=1";
      const params: any[] = [];
      if (targetClass) {
        if (typeof targetClass === "string") {
          params.push(targetClass);
          sql += ` AND LOWER(TRIM(current_class)) = LOWER(TRIM($${params.length}))`;
        } else if (typeof targetClass === "object") {
          if (targetClass.contains) {
            params.push(`%${targetClass.contains}%`);
            sql += ` AND current_class ILIKE $${params.length}`;
          } else if (targetClass.equals) {
            params.push(targetClass.equals);
            sql += ` AND LOWER(TRIM(current_class)) = LOWER(TRIM($${params.length}))`;
          }
        }
      }
      if (targetArm) {
        if (typeof targetArm === "string") {
          params.push(targetArm);
          sql += ` AND LOWER(TRIM(COALESCE(arm, ''))) = LOWER(TRIM($${params.length}))`;
        } else if (typeof targetArm === "object") {
          if (targetArm.contains) {
            params.push(`%${targetArm.contains}%`);
            sql += ` AND COALESCE(arm, '') ILIKE $${params.length}`;
          } else if (targetArm.equals) {
            params.push(targetArm.equals);
            sql += ` AND LOWER(TRIM(COALESCE(arm, ''))) = LOWER(TRIM($${params.length}))`;
          }
        }
      }
      sql += " ORDER BY id ASC";
      const rows = await queryRawPg(sql, params).catch(() => []);

      let attCounts: Record<number, number> = {};
      if (args?.include?._count && rows.length > 0) {
        try {
          const studentIds = rows.map((r: any) => r.id);
          const countRows = await queryRawPg(
            "SELECT student_id, COUNT(*)::int as cnt FROM exam_attempts WHERE student_id = ANY($1::int[]) GROUP BY student_id",
            [studentIds]
          ).catch(() => []);
          for (const c of countRows) {
            attCounts[c.student_id] = parseInt(c.cnt, 10) || 0;
          }
        } catch {
          // non-fatal
        }
      }

      return rows.map((r: any) => ({
        id: r.id,
        admNo: r.adm_no,
        surname: r.surname,
        fullName: r.full_name,
        currentClass: r.current_class,
        arm: r.arm || "",
        gender: r.gender,
        session: r.session,
        status: r.status,
        createdAt: r.created_at,
        _count: {
          attempts: attCounts[r.id] ?? 0,
        },
      }));
    }
    if (method === "create") {
      const d = args?.data;
      const rows = await queryRawPg(
        `INSERT INTO students (adm_no, surname, full_name, current_class, arm, gender, session, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
        [
          d.admNo,
          d.surname,
          d.fullName,
          d.currentClass,
          d.arm || "",
          d.gender || "MALE",
          d.session || "2025/2026",
          d.status || "ACTIVE",
        ]
      );
      const r = rows[0];
      return {
        id: r.id,
        admNo: r.adm_no,
        surname: r.surname,
        fullName: r.full_name,
        currentClass: r.current_class,
        arm: r.arm || "",
        gender: r.gender,
        session: r.session,
        status: r.status,
        createdAt: r.created_at,
      };
    }
    if (method === "update") {
      const id = args?.where?.id;
      const admNo = args?.where?.admNo;
      const d = args?.data;
      let sql = `UPDATE students SET
          surname = COALESCE($1, surname),
          full_name = COALESCE($2, full_name),
          current_class = COALESCE($3, current_class),
          arm = COALESCE($4, arm),
          gender = COALESCE($5, gender),
          session = COALESCE($6, session),
          status = COALESCE($7, status)`;
      if (id) {
        sql += ` WHERE id = $8 RETURNING *`;
        const rows = await queryRawPg(sql, [d.surname, d.fullName, d.currentClass, d.arm, d.gender, d.session, d.status, id]);
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          admNo: r.adm_no,
          surname: r.surname,
          fullName: r.full_name,
          currentClass: r.current_class,
          arm: r.arm || "",
          gender: r.gender,
          session: r.session,
          status: r.status,
          createdAt: r.created_at,
        };
      } else {
        sql += ` WHERE adm_no = $8 RETURNING *`;
        const rows = await queryRawPg(sql, [d.surname, d.fullName, d.currentClass, d.arm, d.gender, d.session, d.status, admNo]);
        const r = rows[0];
        if (!r) return null;
        return {
          id: r.id,
          admNo: r.adm_no,
          surname: r.surname,
          fullName: r.full_name,
          currentClass: r.current_class,
          arm: r.arm || "",
          gender: r.gender,
          session: r.session,
          status: r.status,
          createdAt: r.created_at,
        };
      }
    }
    if (method === "delete") {
      const id = args?.where?.id;
      await queryRawPg("DELETE FROM students WHERE id = $1", [id]);
      return { id };
    }
    if (method === "upsert") {
      const existing = await executePgFallback("student", "findUnique", { where: args?.where });
      if (existing) {
        return await executePgFallback("student", "update", { where: args?.where, data: args?.update || args?.create });
      } else {
        return await executePgFallback("student", "create", { data: args?.create });
      }
    }
  }

  // 3. scratchCard
  if (model === "scratchCard") {
    if (method === "findUnique" || method === "findFirst") {
      const pin = args?.where?.pin;
      const id = args?.where?.id;
      let rows: any[] = [];
      try {
        if (pin) {
          rows = await queryRawPg(
            'SELECT * FROM scratch_cards WHERE UPPER(TRIM(pin)) = UPPER(TRIM($1)) LIMIT 1',
            [String(pin).trim()]
          );
        } else if (id) {
          rows = await queryRawPg('SELECT * FROM scratch_cards WHERE id = $1 LIMIT 1', [id]);
        }
      } catch {
        rows = [];
      }
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        pin: r.pin,
        serialNumber: r.serialNumber ?? r.serial_number ?? r.serialnumber ?? null,
        admNo: r.admNo ?? r.adm_no ?? r.admno ?? null,
        usageCount: r.usageCount ?? r.usage_count ?? r.usagecount ?? 0,
        maxUsage: r.maxUsage ?? r.max_usage ?? r.maxusage ?? 3,
        status: r.status || "active",
        session: r.session || null,
        term: r.term || null,
        createdAt: r.createdAt ?? r.created_at ?? r.createdat ?? new Date().toISOString(),
        updatedAt: r.updatedAt ?? r.updated_at ?? r.updatedat ?? new Date().toISOString(),
      };
    }
    if (method === "findMany") {
      let rows: any[] = [];
      try {
        rows = await queryRawPg('SELECT * FROM scratch_cards ORDER BY "createdAt" DESC');
      } catch {
        try {
          rows = await queryRawPg('SELECT * FROM scratch_cards ORDER BY created_at DESC');
        } catch {
          rows = await queryRawPg('SELECT * FROM scratch_cards').catch(() => []);
        }
      }
      return rows.map((r: any) => ({
        id: r.id,
        pin: r.pin,
        serialNumber: r.serialNumber ?? r.serial_number ?? r.serialnumber ?? null,
        admNo: r.admNo ?? r.adm_no ?? r.admno ?? null,
        usageCount: r.usageCount ?? r.usage_count ?? r.usagecount ?? 0,
        maxUsage: r.maxUsage ?? r.max_usage ?? r.maxusage ?? 3,
        status: r.status || "active",
        session: r.session || null,
        term: r.term || null,
        createdAt: r.createdAt ?? r.created_at ?? r.createdat ?? new Date().toISOString(),
        updatedAt: r.updatedAt ?? r.updated_at ?? r.updatedat ?? new Date().toISOString(),
      }));
    }
    if (method === "create") {
      const d = args?.data || {};
      const newId = d.id || `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let rows: any[] = [];
      try {
        rows = await queryRawPg(
          `INSERT INTO scratch_cards (id, pin, "serialNumber", "admNo", "usageCount", "maxUsage", status, session, term, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *`,
          [
            newId,
            d.pin,
            d.serialNumber || null,
            d.admNo || null,
            d.usageCount || 0,
            d.maxUsage || 3,
            d.status || "active",
            d.session || "2025/2026",
            d.term || "Third Term",
          ]
        );
      } catch {
        try {
          rows = await queryRawPg(
            `INSERT INTO scratch_cards (id, pin, serial_number, adm_no, usage_count, max_usage, status, session, term, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *`,
            [
              newId,
              d.pin,
              d.serialNumber || null,
              d.admNo || null,
              d.usageCount || 0,
              d.maxUsage || 3,
              d.status || "active",
              d.session || "2025/2026",
              d.term || "Third Term",
            ]
          );
        } catch {
          rows = [];
        }
      }
      const r = rows[0] || d;
      return {
        id: r.id || newId,
        pin: r.pin || d.pin,
        serialNumber: r.serialNumber ?? r.serial_number ?? d.serialNumber ?? null,
        admNo: r.admNo ?? r.adm_no ?? d.admNo ?? null,
        usageCount: r.usageCount ?? r.usage_count ?? d.usageCount ?? 0,
        maxUsage: r.maxUsage ?? r.max_usage ?? d.maxUsage ?? 3,
        status: r.status || d.status || "active",
        session: r.session || d.session || "2025/2026",
        term: r.term || d.term || "Third Term",
        createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
        updatedAt: r.updatedAt ?? r.updated_at ?? new Date().toISOString(),
      };
    }
    if (method === "update") {
      const pin = args?.where?.pin;
      const id = args?.where?.id;
      const d = args?.data || {};

      let sql = `UPDATE scratch_cards SET "updatedAt" = NOW()`;
      const params: any[] = [];
      let idx = 1;
      if (d.admNo !== undefined) { sql += `, "admNo" = $${idx++}`; params.push(d.admNo); }
      if (d.usageCount !== undefined) { sql += `, "usageCount" = $${idx++}`; params.push(d.usageCount); }
      if (d.status !== undefined) { sql += `, status = $${idx++}`; params.push(d.status); }
      if (d.session !== undefined) { sql += `, session = $${idx++}`; params.push(d.session); }
      if (d.term !== undefined) { sql += `, term = $${idx++}`; params.push(d.term); }
      if (pin) {
        sql += ` WHERE UPPER(TRIM(pin)) = UPPER(TRIM($${idx})) RETURNING *`;
        params.push(pin);
      } else {
        sql += ` WHERE id = $${idx} RETURNING *`;
        params.push(id);
      }
      let rows: any[] = [];
      try {
        rows = await queryRawPg(sql, params);
      } catch {
        let altSql = `UPDATE scratch_cards SET updated_at = NOW()`;
        const altParams: any[] = [];
        let aIdx = 1;
        if (d.admNo !== undefined) { altSql += `, adm_no = $${aIdx++}`; altParams.push(d.admNo); }
        if (d.usageCount !== undefined) { altSql += `, usage_count = $${aIdx++}`; altParams.push(d.usageCount); }
        if (d.status !== undefined) { altSql += `, status = $${aIdx++}`; altParams.push(d.status); }
        if (d.session !== undefined) { altSql += `, session = $${aIdx++}`; altParams.push(d.session); }
        if (d.term !== undefined) { altSql += `, term = $${aIdx++}`; altParams.push(d.term); }
        if (pin) {
          altSql += ` WHERE UPPER(TRIM(pin)) = UPPER(TRIM($${aIdx})) RETURNING *`;
          altParams.push(pin);
        } else {
          altSql += ` WHERE id = $${aIdx} RETURNING *`;
          altParams.push(id);
        }
        rows = await queryRawPg(altSql, altParams).catch(() => []);
      }
      const r = rows[0];
      if (!r) return { id, ...d };
      return {
        id: r.id,
        pin: r.pin,
        serialNumber: r.serialNumber ?? r.serial_number ?? r.serialnumber ?? null,
        admNo: r.admNo ?? r.adm_no ?? r.admno ?? null,
        usageCount: r.usageCount ?? r.usage_count ?? r.usagecount ?? 0,
        maxUsage: r.maxUsage ?? r.max_usage ?? r.maxusage ?? 3,
        status: r.status,
        session: r.session,
        term: r.term,
        createdAt: r.createdAt ?? r.created_at,
        updatedAt: r.updatedAt ?? r.updated_at,
      };
    }
    if (method === "delete") {
      const id = args?.where?.id;
      const pin = args?.where?.pin;
      if (id) {
        await queryRawPg('DELETE FROM scratch_cards WHERE id = $1', [id]).catch(() => {});
      } else if (pin) {
        await queryRawPg('DELETE FROM scratch_cards WHERE UPPER(TRIM(pin)) = UPPER(TRIM($1))', [pin]).catch(() => {});
      }
      return { id };
    }
    if (method === "deleteMany") {
      const pinIn = args?.where?.pin?.in;
      if (Array.isArray(pinIn) && pinIn.length > 0) {
        await queryRawPg(
          'DELETE FROM scratch_cards WHERE UPPER(TRIM(pin)) = ANY($1::text[])',
          [pinIn.map((p: any) => String(p).trim().toUpperCase())]
        ).catch(() => {});
      } else if (!args?.where || Object.keys(args.where).length === 0) {
        await queryRawPg('DELETE FROM scratch_cards').catch(() => {});
      }
      return { count: 0 };
    }
    if (method === "upsert") {
      const existing = await executePgFallback("scratchCard", "findUnique", { where: args?.where });
      if (existing) {
        return await executePgFallback("scratchCard", "update", { where: args?.where, data: args?.update || args?.create });
      } else {
        return await executePgFallback("scratchCard", "create", { data: args?.create });
      }
    }
  }

  // 4. terminalResult
  if (model === "terminalResult") {
    if (method === "findUnique") {
      const compound = args?.where?.admNo_session_term;
      const id = args?.where?.id;
      if (compound) {
        const rows = await queryRawPg(
          "SELECT * FROM terminal_results WHERE adm_no = $1 AND session = $2 AND term = $3 LIMIT 1",
          [compound.admNo, compound.session, compound.term]
        );
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          id: r.id,
          admNo: r.adm_no,
          studentName: r.student_name,
          className: r.class_name,
          session: r.session,
          term: r.term,
          termLabel: r.term_label,
          totalScore: r.total_score,
          totalPossible: r.total_possible,
          average: r.average,
          position: r.position,
          numberInClass: r.number_in_class,
          nextClass: r.next_class,
          nextTermBegins: r.next_term_begins,
          daysPresent: r.days_present,
          daysOpened: r.days_opened,
          daysAbsent: r.days_absent,
          decision: r.decision,
          teacherRemark: r.teacher_remark,
          principalRemark: r.principal_remark,
          resultPayload: r.result_payload,
          isPublished: r.is_published,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }
      if (id) {
        const rows = await queryRawPg("SELECT * FROM terminal_results WHERE id = $1 LIMIT 1", [id]);
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          id: r.id,
          admNo: r.adm_no,
          studentName: r.student_name,
          className: r.class_name,
          session: r.session,
          term: r.term,
          termLabel: r.term_label,
          totalScore: r.total_score,
          totalPossible: r.total_possible,
          average: r.average,
          position: r.position,
          numberInClass: r.number_in_class,
          nextClass: r.next_class,
          nextTermBegins: r.next_term_begins,
          daysPresent: r.days_present,
          daysOpened: r.days_opened,
          daysAbsent: r.days_absent,
          decision: r.decision,
          teacherRemark: r.teacher_remark,
          principalRemark: r.principal_remark,
          resultPayload: r.result_payload,
          isPublished: r.is_published,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }
      return null;
    }
    if (method === "findFirst") {
      const where = args?.where || {};
      let sql = "SELECT * FROM terminal_results WHERE 1=1";
      const params: any[] = [];

      if (where.admNo) {
        const val = typeof where.admNo === "object" ? (where.admNo.equals || "") : where.admNo;
        if (val) {
          params.push(val.trim());
          sql += ` AND UPPER(TRIM(adm_no)) = UPPER(TRIM($${params.length}))`;
        }
      }
      if (where.session) {
        const val = typeof where.session === "object" ? (where.session.contains || where.session.equals || "") : where.session;
        if (val) {
          params.push(val.trim());
          sql += ` AND session ILIKE '%' || $${params.length} || '%'`;
        }
      }
      if (where.term) {
        const val = typeof where.term === "object" ? (where.term.contains || where.term.equals || "") : where.term;
        if (val) {
          params.push(val.trim());
          sql += ` AND term ILIKE '%' || $${params.length} || '%'`;
        }
      }
      if (where.isPublished !== undefined) {
        params.push(where.isPublished);
        sql += ` AND is_published = $${params.length}`;
      }

      sql += " ORDER BY updated_at DESC, id DESC LIMIT 1";
      const rows = await queryRawPg(sql, params);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        admNo: r.adm_no,
        studentName: r.student_name,
        className: r.class_name,
        session: r.session,
        term: r.term,
        termLabel: r.term_label,
        totalScore: r.total_score,
        totalPossible: r.total_possible,
        average: r.average,
        position: r.position,
        numberInClass: r.number_in_class,
        nextClass: r.next_class,
        nextTermBegins: r.next_term_begins,
        daysPresent: r.days_present,
        daysOpened: r.days_opened,
        daysAbsent: r.days_absent,
        decision: r.decision,
        teacherRemark: r.teacher_remark,
        principalRemark: r.principal_remark,
        resultPayload: r.result_payload,
        isPublished: r.is_published,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }
    if (method === "delete") {
      const id = args?.where?.id;
      if (id) {
        await queryRawPg("DELETE FROM terminal_results WHERE id = $1", [id]);
        return { id };
      }
      return null;
    }
    if (method === "findMany") {
      const where = args?.where || {};
      const columns =
        args?.select && !args.select.resultPayload
          ? "id, adm_no, student_name, class_name, session, term, term_label, total_score, total_possible, average, position, number_in_class, is_published, created_at, updated_at"
          : "*";
      let sql = `SELECT ${columns} FROM terminal_results WHERE 1=1`;
      const params: any[] = [];
      if (where.admNo) {
        const val = typeof where.admNo === "object" ? (where.admNo.equals || where.admNo.contains || "") : where.admNo;
        if (val) {
          params.push(String(val).trim());
          sql += ` AND UPPER(TRIM(adm_no)) = UPPER(TRIM($${params.length}))`;
        }
      }
      if (where.className) {
        const val = typeof where.className === "object" ? (where.className.equals || where.className.contains || "") : where.className;
        if (val) {
          params.push(String(val).trim());
          sql += ` AND LOWER(TRIM(class_name)) = LOWER(TRIM($${params.length}))`;
        }
      }
      if (where.session) {
        const val = typeof where.session === "object" ? (where.session.equals || where.session.contains || "") : where.session;
        if (val) {
          params.push(String(val).trim());
          sql += ` AND LOWER(TRIM(session)) = LOWER(TRIM($${params.length}))`;
        }
      }
      if (where.term) {
        const val = typeof where.term === "object" ? (where.term.equals || where.term.contains || "") : where.term;
        if (val) {
          params.push(String(val).trim());
          sql += ` AND LOWER(TRIM(term)) = LOWER(TRIM($${params.length}))`;
        }
      }
      if (where.isPublished !== undefined) {
        params.push(where.isPublished);
        sql += ` AND is_published = $${params.length}`;
      }
      sql += " ORDER BY id DESC";
      const rows = await queryRawPg(sql, params);
      return rows.map((r: any) => ({
        id: r.id,
        admNo: r.adm_no,
        studentName: r.student_name,
        className: r.class_name,
        session: r.session,
        term: r.term,
        termLabel: r.term_label,
        totalScore: r.total_score,
        totalPossible: r.total_possible,
        average: r.average,
        position: r.position,
        numberInClass: r.number_in_class,
        nextClass: r.next_class,
        nextTermBegins: r.next_term_begins,
        daysPresent: r.days_present,
        daysOpened: r.days_opened,
        daysAbsent: r.days_absent,
        decision: r.decision,
        teacherRemark: r.teacher_remark,
        principalRemark: r.principal_remark,
        resultPayload: r.result_payload,
        isPublished: r.is_published,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
    if (method === "upsert") {
      const compound = args?.where?.admNo_session_term;
      const createData = args?.create;
      const updateData = args?.update;
      const existing = await queryRawPg(
        "SELECT id FROM terminal_results WHERE adm_no = $1 AND session = $2 AND term = $3 LIMIT 1",
        [compound.admNo, compound.session, compound.term]
      );
      if (existing.length > 0) {
        const id = existing[0].id;
        const rows = await queryRawPg(
          `UPDATE terminal_results SET
            student_name = $1, class_name = $2, term_label = $3, total_score = $4, total_possible = $5,
            average = $6, position = $7, number_in_class = $8, next_class = $9, next_term_begins = $10,
            days_present = $11, days_opened = $12, days_absent = $13, decision = $14,
            teacher_remark = $15, principal_remark = $16, result_payload = $17, is_published = $18,
            updated_at = NOW()
           WHERE id = $19 RETURNING *`,
          [
            updateData.studentName, updateData.className, updateData.termLabel, updateData.totalScore,
            updateData.totalPossible, updateData.average, updateData.position, updateData.numberInClass,
            updateData.nextClass, updateData.nextTermBegins, updateData.daysPresent, updateData.daysOpened,
            updateData.daysAbsent, updateData.decision, updateData.teacherRemark, updateData.principalRemark,
            updateData.resultPayload, updateData.isPublished ?? true, id
          ]
        );
        return rows[0];
      } else {
        const rows = await queryRawPg(
          `INSERT INTO terminal_results (
            adm_no, student_name, class_name, session, term, term_label, total_score, total_possible,
            average, position, number_in_class, next_class, next_term_begins, days_present, days_opened,
            days_absent, decision, teacher_remark, principal_remark, result_payload, is_published,
            created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW()) RETURNING *`,
          [
            createData.admNo, createData.studentName, createData.className, createData.session, createData.term,
            createData.termLabel, createData.totalScore, createData.totalPossible, createData.average,
            createData.position, createData.numberInClass, createData.nextClass, createData.nextTermBegins,
            createData.daysPresent, createData.daysOpened, createData.daysAbsent, createData.decision,
            createData.teacherRemark, createData.principalRemark, createData.resultPayload, createData.isPublished ?? true
          ]
        );
        return rows[0];
      }
    }
    if (method === "update") {
      const id = args?.where?.id;
      const d = args?.data || {};
      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (d.position !== undefined) { sets.push(`position = $${idx++}`); params.push(d.position); }
      if (d.numberInClass !== undefined) { sets.push(`number_in_class = $${idx++}`); params.push(d.numberInClass); }
      if (d.resultPayload !== undefined) { sets.push(`result_payload = $${idx++}`); params.push(d.resultPayload); }
      if (d.totalScore !== undefined) { sets.push(`total_score = $${idx++}`); params.push(d.totalScore); }
      if (d.totalPossible !== undefined) { sets.push(`total_possible = $${idx++}`); params.push(d.totalPossible); }
      if (d.average !== undefined) { sets.push(`average = $${idx++}`); params.push(d.average); }
      if (d.decision !== undefined) { sets.push(`decision = $${idx++}`); params.push(d.decision); }
      if (d.teacherRemark !== undefined) { sets.push(`teacher_remark = $${idx++}`); params.push(d.teacherRemark); }
      if (d.principalRemark !== undefined) { sets.push(`principal_remark = $${idx++}`); params.push(d.principalRemark); }
      if (d.isPublished !== undefined) { sets.push(`is_published = $${idx++}`); params.push(d.isPublished); }
      sets.push(`updated_at = NOW()`);

      params.push(id);
      const sql = `UPDATE terminal_results SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`;
      const rows = await queryRawPg(sql, params);
      const r = rows[0];
      if (!r) return { id, ...d };
      return {
        id: r.id,
        admNo: r.adm_no,
        studentName: r.student_name,
        className: r.class_name,
        session: r.session,
        term: r.term,
        termLabel: r.term_label,
        totalScore: r.total_score,
        totalPossible: r.total_possible,
        average: r.average,
        position: r.position,
        numberInClass: r.number_in_class,
        nextClass: r.next_class,
        nextTermBegins: r.next_term_begins,
        daysPresent: r.days_present,
        daysOpened: r.days_opened,
        daysAbsent: r.days_absent,
        decision: r.decision,
        teacherRemark: r.teacher_remark,
        principalRemark: r.principal_remark,
        resultPayload: r.result_payload,
        isPublished: r.is_published,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }
    if (method === "deleteMany") {
      await queryRawPg("DELETE FROM terminal_results").catch(() => {});
      return { count: 0 };
    }
  }

  // 5. exam
  if (model === "exam") {
    if (method === "findMany") {
      let sql = "SELECT * FROM exams WHERE 1=1";
      const params: any[] = [];
      const where = args?.where;
      if (where) {
        if (where.isActive !== undefined) {
          params.push(where.isActive);
          sql += ` AND is_active = $${params.length}`;
        }
        if (where.isArchived !== undefined) {
          params.push(where.isArchived);
          sql += ` AND is_archived = $${params.length}`;
        }
        if (where.id !== undefined) {
          params.push(where.id);
          sql += ` AND id = $${params.length}`;
        }
        if (where.createdBy !== undefined) {
          const cb = typeof where.createdBy === "string" ? where.createdBy : where.createdBy?.equals;
          if (cb) {
            params.push(cb);
            sql += ` AND LOWER(created_by) = LOWER($${params.length})`;
          }
        }
        if (where.subject) {
          if (typeof where.subject === "string") {
            params.push(where.subject);
            sql += ` AND LOWER(subject) = LOWER($${params.length})`;
          } else if (where.subject.contains) {
            params.push(`%${where.subject.contains}%`);
            sql += ` AND subject ILIKE $${params.length}`;
          } else if (where.subject.equals) {
            params.push(where.subject.equals);
            sql += ` AND LOWER(subject) = LOWER($${params.length})`;
          }
        }
        if (where.targetClass) {
          if (typeof where.targetClass === "string") {
            params.push(where.targetClass);
            sql += ` AND LOWER(target_class) = LOWER($${params.length})`;
          } else if (where.targetClass.contains) {
            params.push(`%${where.targetClass.contains}%`);
            sql += ` AND target_class ILIKE $${params.length}`;
          } else if (where.targetClass.equals) {
            params.push(where.targetClass.equals);
            sql += ` AND LOWER(target_class) = LOWER($${params.length})`;
          }
        }
        if (where.OR && Array.isArray(where.OR)) {
          const orClauses: string[] = [];
          for (const cond of where.OR) {
            if (cond.createdBy) {
              const cbVal = typeof cond.createdBy === "string" ? cond.createdBy : cond.createdBy?.equals;
              if (cbVal) {
                params.push(cbVal);
                orClauses.push(`LOWER(created_by) = LOWER($${params.length})`);
              }
            }
            if (cond.subject) {
              const subjVal = typeof cond.subject === "string" ? cond.subject : cond.subject.contains || cond.subject.equals;
              if (subjVal) {
                params.push(`%${subjVal}%`);
                orClauses.push(`subject ILIKE $${params.length}`);
              }
            }
            if (cond.targetClass?.contains) {
              params.push(`%${cond.targetClass.contains}%`);
              orClauses.push(`target_class ILIKE $${params.length}`);
            }
          }
          if (orClauses.length > 0) {
            sql += ` AND (${orClauses.join(" OR ")})`;
          }
        }
      }
      sql += " ORDER BY exam_date ASC, id DESC";

      const rows = await queryRawPg(sql, params).catch(() => []);
      const examIds = rows.map((r: any) => r.id);
      let objCounts: Record<number, number> = {};
      let thCounts: Record<number, number> = {};
      let attCounts: Record<number, number> = {};
      let studentAttemptsMap: Record<number, any[]> = {};

      if (examIds.length > 0) {
        try {
          const countRows = await queryRawPg(
            `SELECT 
               e.id as exam_id,
               COALESCE(oq.cnt, 0)::int as obj_cnt,
               COALESCE(tq.cnt, 0)::int as th_cnt,
               COALESCE(att.cnt, 0)::int as att_cnt
             FROM exams e
             LEFT JOIN (SELECT exam_id, COUNT(*) as cnt FROM objective_questions WHERE exam_id = ANY($1::int[]) GROUP BY exam_id) oq ON oq.exam_id = e.id
             LEFT JOIN (SELECT exam_id, COUNT(*) as cnt FROM theory_questions WHERE exam_id = ANY($1::int[]) GROUP BY exam_id) tq ON tq.exam_id = e.id
             LEFT JOIN (SELECT exam_id, COUNT(*) as cnt FROM exam_attempts WHERE exam_id = ANY($1::int[]) GROUP BY exam_id) att ON att.exam_id = e.id
             WHERE e.id = ANY($1::int[])`,
            [examIds]
          ).catch(() => []);

          for (const c of countRows) {
            objCounts[c.exam_id] = parseInt(c.obj_cnt, 10) || 0;
            thCounts[c.exam_id] = parseInt(c.th_cnt, 10) || 0;
            attCounts[c.exam_id] = parseInt(c.att_cnt, 10) || 0;
          }
        } catch {
          // non-fatal
        }

        if (args?.include?.attempts) {
          const studentId = args?.include?.attempts?.where?.studentId;
          try {
            let attSql = "SELECT * FROM exam_attempts WHERE exam_id = ANY($1::int[])";
            const attParams: any[] = [examIds];
            if (studentId) {
              attParams.push(studentId);
              attSql += ` AND student_id = $2`;
            }
            const attRows = await queryRawPg(attSql, attParams).catch(() => []);
            for (const att of attRows) {
              if (!studentAttemptsMap[att.exam_id]) {
                studentAttemptsMap[att.exam_id] = [];
              }
              studentAttemptsMap[att.exam_id].push({
                id: att.id,
                studentId: att.student_id,
                examId: att.exam_id,
                startedAt: att.started_at,
                submittedAt: att.submitted_at,
                isCompleted: att.is_completed,
                objectiveScore: att.objective_score,
                theoryScore: att.theory_score,
                totalScore: att.total_score,
                studentAnswers: att.student_answers,
                isTransmittedToAdmin: att.is_transmitted_to_admin,
                teacherComment: att.teacher_comment,
                gradedByTeacherName: att.graded_by_teacher_name,
              });
            }
          } catch {
            // non-fatal
          }
        }
      }

      return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        subject: r.subject,
        targetClass: r.target_class,
        examDate: r.exam_date,
        durationMinutes: r.duration_minutes,
        isActive: r.is_active,
        isArchived: r.is_archived ?? false,
        hasTheory: r.has_theory,
        createdBy: r.created_by || null,
        createdAt: r.created_at,
        _count: {
          objectiveQuestions: objCounts[r.id] ?? 0,
          theoryQuestions: thCounts[r.id] ?? 0,
          attempts: attCounts[r.id] ?? 0,
        },
        attempts: studentAttemptsMap[r.id] || [],
      }));
    }
    if (method === "findUnique" || method === "findFirst") {
      const id = args?.where?.id;
      const rows = await queryRawPg("SELECT * FROM exams WHERE id = $1 LIMIT 1", [id]);
      if (rows.length === 0) return null;
      const r = rows[0];
      const examData: any = {
        id: r.id,
        title: r.title,
        subject: r.subject,
        targetClass: r.target_class,
        examDate: r.exam_date,
        durationMinutes: r.duration_minutes,
        isActive: r.is_active,
        isArchived: r.is_archived ?? false,
        hasTheory: r.has_theory,
        createdBy: r.created_by || null,
        createdAt: r.created_at,
      };

      if (args?.include?.objectiveQuestions) {
        try {
          const objRows = await queryRawPg(
            "SELECT id, exam_id, question_text, options, correct_answer, points, image_url FROM objective_questions WHERE exam_id = $1 ORDER BY id ASC",
            [id]
          );
          examData.objectiveQuestions = objRows.map((oq: any) => ({
            id: oq.id,
            examId: oq.exam_id,
            questionText: oq.question_text,
            options: oq.options,
            correctAnswer: oq.correct_answer,
            points: oq.points != null ? Number(oq.points) : 0.5,
            imageUrl: oq.image_url || null,
          }));
        } catch {
          const objRows = await queryRawPg(
            "SELECT id, exam_id, question_text, options, correct_answer, points FROM objective_questions WHERE exam_id = $1 ORDER BY id ASC",
            [id]
          ).catch(() => []);
          examData.objectiveQuestions = objRows.map((oq: any) => ({
            id: oq.id,
            examId: oq.exam_id,
            questionText: oq.question_text,
            options: oq.options,
            correctAnswer: oq.correct_answer,
            points: oq.points != null ? Number(oq.points) : 0.5,
            imageUrl: null,
          }));
        }
      }

      if (args?.include?.theoryQuestions) {
        try {
          const thRows = await queryRawPg(
            "SELECT id, exam_id, question_num, question_text, max_score, instructions, image_url FROM theory_questions WHERE exam_id = $1 ORDER BY question_num ASC",
            [id]
          );
          examData.theoryQuestions = thRows.map((tq: any) => ({
            id: tq.id,
            examId: tq.exam_id,
            questionNum: tq.question_num,
            questionText: tq.question_text,
            maxScore: tq.max_score ?? 10,
            instructions: tq.instructions || null,
            imageUrl: tq.image_url || null,
          }));
        } catch {
          const thRows = await queryRawPg(
            "SELECT id, exam_id, question_num, question_text, max_score, instructions FROM theory_questions WHERE exam_id = $1 ORDER BY question_num ASC",
            [id]
          ).catch(() => []);
          examData.theoryQuestions = thRows.map((tq: any) => ({
            id: tq.id,
            examId: tq.exam_id,
            questionNum: tq.question_num,
            questionText: tq.question_text,
            maxScore: tq.max_score ?? 10,
            instructions: tq.instructions || null,
            imageUrl: null,
          }));
        }
      }

      return examData;
    }
    if (method === "create") {
      const d = args?.data;
      let rows: any[];
      try {
        rows = await queryRawPg(
          `INSERT INTO exams (title, subject, target_class, exam_date, duration_minutes, is_active, has_theory, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
          [
            d.title,
            d.subject,
            d.targetClass,
            d.examDate,
            d.durationMinutes ?? 60,
            d.isActive ?? true,
            d.hasTheory ?? true,
            d.createdBy || null,
          ]
        );
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isMissingCreatedBy = errMsg.includes("created_by");

        if (isMissingCreatedBy) {
          try {
            await queryRawPg('ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "created_by" TEXT');
            rows = await queryRawPg(
              `INSERT INTO exams (title, subject, target_class, exam_date, duration_minutes, is_active, has_theory, created_by, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
              [
                d.title,
                d.subject,
                d.targetClass,
                d.examDate,
                d.durationMinutes ?? 60,
                d.isActive ?? true,
                d.hasTheory ?? true,
                d.createdBy || null,
              ]
            );
          } catch {
            // Graceful fallback: insert without created_by so exam creation never fails
            rows = await queryRawPg(
              `INSERT INTO exams (title, subject, target_class, exam_date, duration_minutes, is_active, has_theory, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
              [
                d.title,
                d.subject,
                d.targetClass,
                d.examDate,
                d.durationMinutes ?? 60,
                d.isActive ?? true,
                d.hasTheory ?? true,
              ]
            );
          }
        } else {
          const maxRows = await queryRawPg("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM exams");
          const nextId = maxRows[0]?.next_id || 1;
          try {
            rows = await queryRawPg(
              `INSERT INTO exams (id, title, subject, target_class, exam_date, duration_minutes, is_active, has_theory, created_by, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *`,
              [
                nextId,
                d.title,
                d.subject,
                d.targetClass,
                d.examDate,
                d.durationMinutes ?? 60,
                d.isActive ?? true,
                d.hasTheory ?? true,
                d.createdBy || null,
              ]
            );
          } catch {
            rows = await queryRawPg(
              `INSERT INTO exams (id, title, subject, target_class, exam_date, duration_minutes, is_active, has_theory, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
              [
                nextId,
                d.title,
                d.subject,
                d.targetClass,
                d.examDate,
                d.durationMinutes ?? 60,
                d.isActive ?? true,
                d.hasTheory ?? true,
              ]
            );
          }
          await queryRawPg(`SELECT setval(pg_get_serial_sequence('"exams"', 'id'), $1, true)`, [nextId]).catch(() => {});
        }
      }
      const r = rows[0];
      return {
        id: r.id,
        title: r.title,
        subject: r.subject,
        targetClass: r.target_class,
        examDate: r.exam_date,
        durationMinutes: r.duration_minutes,
        isActive: r.is_active,
        hasTheory: r.has_theory,
        createdBy: r.created_by || null,
        createdAt: r.created_at,
      };
    }
    if (method === "delete") {
      const id = args?.where?.id;
      await queryRawPg("DELETE FROM objective_questions WHERE exam_id = $1", [id]);
      await queryRawPg("DELETE FROM theory_questions WHERE exam_id = $1", [id]);
      await queryRawPg("DELETE FROM exam_attempts WHERE exam_id = $1", [id]);
      await queryRawPg("DELETE FROM exams WHERE id = $1", [id]);
      return { id };
    }
    if (method === "update") {
      const id = args?.where?.id;
      const d = args?.data || {};
      const sets: string[] = [];
      const params: any[] = [];
      if (d.isActive !== undefined) {
        params.push(d.isActive);
        sets.push(`is_active = $${params.length}`);
      }
      if (d.isArchived !== undefined) {
        params.push(d.isArchived);
        sets.push(`is_archived = $${params.length}`);
      }
      if (d.title !== undefined) {
        params.push(d.title);
        sets.push(`title = $${params.length}`);
      }
      if (d.subject !== undefined) {
        params.push(d.subject);
        sets.push(`subject = $${params.length}`);
      }
      if (d.targetClass !== undefined) {
        params.push(d.targetClass);
        sets.push(`target_class = $${params.length}`);
      }
      if (d.durationMinutes !== undefined) {
        params.push(d.durationMinutes);
        sets.push(`duration_minutes = $${params.length}`);
      }
      if (sets.length > 0 && id) {
        params.push(id);
        try {
          await queryRawPg(`UPDATE exams SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
        } catch {
          await queryRawPg('ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT false').catch(() => {});
          await queryRawPg(`UPDATE exams SET ${sets.join(", ")} WHERE id = $${params.length}`, params).catch(() => {});
        }
      }
      return { id, ...d };
    }
    if (method === "upsert") {
      const id = args?.where?.id;
      const existing = id ? await executePgFallback("exam", "findUnique", { where: { id } }) : null;
      if (existing) {
        return await executePgFallback("exam", "update", { where: { id }, data: args?.update || args?.create });
      } else {
        return await executePgFallback("exam", "create", { data: args?.create });
      }
    }
  }

  // 6. objectiveQuestion
  if (model === "objectiveQuestion") {
    if (method === "findMany") {
      const examId = args?.where?.examId;
      try {
        const rows = await queryRawPg("SELECT * FROM objective_questions WHERE exam_id = $1 ORDER BY id ASC", [examId]);
        return rows.map((r: any) => ({
          id: r.id,
          examId: r.exam_id,
          questionText: r.question_text,
          options: r.options,
          correctAnswer: r.correct_answer,
          points: r.points,
          imageUrl: r.image_url || null,
        }));
      } catch {
        const rows = await queryRawPg("SELECT id, exam_id, question_text, options, correct_answer, points FROM objective_questions WHERE exam_id = $1 ORDER BY id ASC", [examId]);
        return rows.map((r: any) => ({
          id: r.id,
          examId: r.exam_id,
          questionText: r.question_text,
          options: r.options,
          correctAnswer: r.correct_answer,
          points: r.points,
          imageUrl: null,
        }));
      }
    }
    if (method === "create") {
      const d = args?.data;
      let rows: any[];
      try {
        rows = await queryRawPg(
          `INSERT INTO objective_questions (exam_id, question_text, options, correct_answer, points, image_url)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [d.examId, d.questionText, d.options, d.correctAnswer, d.points ?? 0.5, d.imageUrl || null]
        );
      } catch {
        rows = await queryRawPg(
          `INSERT INTO objective_questions (exam_id, question_text, options, correct_answer, points)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [d.examId, d.questionText, d.options, d.correctAnswer, d.points ?? 0.5]
        );
      }
      const r = rows[0];
      return {
        id: r.id,
        examId: r.exam_id,
        questionText: r.question_text,
        options: r.options,
        correctAnswer: r.correct_answer,
        points: r.points != null ? Number(r.points) : 0.5,
        imageUrl: r.image_url || null,
      };
    }
    if (method === "delete") {
      const id = args?.where?.id;
      await queryRawPg("DELETE FROM objective_questions WHERE id = $1", [id]);
      return { id };
    }
    if (method === "deleteMany") {
      const examId = args?.where?.examId;
      if (examId) {
        await queryRawPg("DELETE FROM objective_questions WHERE exam_id = $1", [examId]);
      } else {
        await queryRawPg("DELETE FROM objective_questions");
      }
      return { count: 1 };
    }
    if (method === "findUnique" || method === "findFirst") {
      const id = args?.where?.id;
      let rows: any[] = [];
      try {
        rows = await queryRawPg("SELECT * FROM objective_questions WHERE id = $1 LIMIT 1", [id]);
      } catch {
        rows = await queryRawPg("SELECT id, exam_id, question_text, options, correct_answer, points FROM objective_questions WHERE id = $1 LIMIT 1", [id]).catch(() => []);
      }
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        examId: r.exam_id,
        questionText: r.question_text,
        options: r.options,
        correctAnswer: r.correct_answer,
        points: r.points,
        imageUrl: r.image_url || null,
      };
    }
    if (method === "update") {
      const id = args?.where?.id;
      const d = args?.data || {};
      const sets: string[] = [];
      const params: any[] = [];
      if (d.questionText !== undefined) {
        params.push(d.questionText);
        sets.push(`question_text = $${params.length}`);
      }
      if (d.options !== undefined) {
        params.push(typeof d.options === "string" ? d.options : JSON.stringify(d.options));
        sets.push(`options = $${params.length}`);
      }
      if (d.correctAnswer !== undefined) {
        params.push(d.correctAnswer);
        sets.push(`correct_answer = $${params.length}`);
      }
      if (d.points !== undefined) {
        params.push(d.points != null ? Number(d.points) : 0.5);
        sets.push(`points = $${params.length}`);
      }
      if (d.imageUrl !== undefined) {
        params.push(d.imageUrl || null);
        sets.push(`image_url = $${params.length}`);
      }
      if (sets.length > 0 && id) {
        params.push(id);
        try {
          await queryRawPg(`UPDATE objective_questions SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
        } catch {
          await queryRawPg('ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT').catch(() => {});
          await queryRawPg(`UPDATE objective_questions SET ${sets.join(", ")} WHERE id = $${params.length}`, params).catch(() => {});
        }
      }
      return { id, ...d };
    }
    if (method === "createMany") {
      const list = Array.isArray(args?.data) ? args.data : [args?.data];
      let inserted = 0;
      for (const item of list) {
        if (!item) continue;
        await executePgFallback("objectiveQuestion", "create", { data: item });
        inserted++;
      }
      return { count: inserted };
    }
  }

  // 7. theoryQuestion
  if (model === "theoryQuestion") {
    if (method === "findMany") {
      const examId = args?.where?.examId;
      try {
        const rows = await queryRawPg("SELECT * FROM theory_questions WHERE exam_id = $1 ORDER BY question_num ASC", [examId]);
        return rows.map((r: any) => ({
          id: r.id,
          examId: r.exam_id,
          questionNum: r.question_num,
          questionText: r.question_text,
          maxScore: r.max_score,
          instructions: r.instructions,
          imageUrl: r.image_url || null,
        }));
      } catch {
        const rows = await queryRawPg("SELECT id, exam_id, question_num, question_text, max_score, instructions FROM theory_questions WHERE exam_id = $1 ORDER BY question_num ASC", [examId]);
        return rows.map((r: any) => ({
          id: r.id,
          examId: r.exam_id,
          questionNum: r.question_num,
          questionText: r.question_text,
          maxScore: r.max_score,
          instructions: r.instructions,
          imageUrl: null,
        }));
      }
    }
    if (method === "create") {
      const d = args?.data;
      let rows: any[];
      try {
        rows = await queryRawPg(
          `INSERT INTO theory_questions (exam_id, question_num, question_text, max_score, instructions, image_url)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [d.examId, d.questionNum ?? 1, d.questionText, d.maxScore ?? 10, d.instructions || null, d.imageUrl || null]
        );
      } catch {
        rows = await queryRawPg(
          `INSERT INTO theory_questions (exam_id, question_num, question_text, max_score, instructions)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [d.examId, d.questionNum ?? 1, d.questionText, d.maxScore ?? 10, d.instructions || null]
        );
      }
      const r = rows[0];
      return {
        id: r.id,
        examId: r.exam_id,
        questionNum: r.question_num,
        questionText: r.question_text,
        maxScore: r.max_score,
        instructions: r.instructions,
        imageUrl: r.image_url || null,
      };
    }
    if (method === "delete") {
      const id = args?.where?.id;
      await queryRawPg("DELETE FROM theory_questions WHERE id = $1", [id]);
      return { id };
    }
    if (method === "deleteMany") {
      const examId = args?.where?.examId;
      if (examId) {
        await queryRawPg("DELETE FROM theory_questions WHERE exam_id = $1", [examId]);
      } else {
        await queryRawPg("DELETE FROM theory_questions");
      }
      return { count: 1 };
    }
    if (method === "findUnique" || method === "findFirst") {
      const id = args?.where?.id;
      let rows: any[] = [];
      try {
        rows = await queryRawPg("SELECT * FROM theory_questions WHERE id = $1 LIMIT 1", [id]);
      } catch {
        rows = await queryRawPg("SELECT id, exam_id, question_num, question_text, max_score, instructions FROM theory_questions WHERE id = $1 LIMIT 1", [id]).catch(() => []);
      }
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        examId: r.exam_id,
        questionNum: r.question_num,
        questionText: r.question_text,
        maxScore: r.max_score,
        instructions: r.instructions,
        imageUrl: r.image_url || null,
      };
    }
    if (method === "update") {
      const id = args?.where?.id;
      const d = args?.data || {};
      const sets: string[] = [];
      const params: any[] = [];
      if (d.questionNum !== undefined) {
        params.push(d.questionNum);
        sets.push(`question_num = $${params.length}`);
      }
      if (d.questionText !== undefined) {
        params.push(d.questionText);
        sets.push(`question_text = $${params.length}`);
      }
      if (d.maxScore !== undefined) {
        params.push(d.maxScore);
        sets.push(`max_score = $${params.length}`);
      }
      if (d.instructions !== undefined) {
        params.push(d.instructions || null);
        sets.push(`instructions = $${params.length}`);
      }
      if (d.imageUrl !== undefined) {
        params.push(d.imageUrl || null);
        sets.push(`image_url = $${params.length}`);
      }
      if (sets.length > 0 && id) {
        params.push(id);
        try {
          await queryRawPg(`UPDATE theory_questions SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
        } catch {
          await queryRawPg('ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT').catch(() => {});
          await queryRawPg(`UPDATE theory_questions SET ${sets.join(", ")} WHERE id = $${params.length}`, params).catch(() => {});
        }
      }
      return { id, ...d };
    }
    if (method === "createMany") {
      const list = Array.isArray(args?.data) ? args.data : [args?.data];
      let inserted = 0;
      for (const item of list) {
        if (!item) continue;
        await executePgFallback("theoryQuestion", "create", { data: item });
        inserted++;
      }
      return { count: inserted };
    }
  }

  // 8. examAttempt
  if (model === "examAttempt") {
    if (method === "deleteMany") {
      const examId = args?.where?.examId;
      if (examId) {
        await queryRawPg("DELETE FROM exam_attempts WHERE exam_id = $1", [examId]);
      } else {
        await queryRawPg("DELETE FROM exam_attempts");
      }
      return { count: 1 };
    }
    if (method === "delete") {
      const id = args?.where?.id;
      if (id) {
        await queryRawPg("DELETE FROM exam_attempts WHERE id = $1", [id]);
        return { id };
      }
      return null;
    }
    if (method === "findUnique" || method === "findFirst") {
      const compound = args?.where?.studentId_examId;
      const id = args?.where?.id;
      let row: any = null;
      if (compound) {
        const rows = await queryRawPg(
          "SELECT * FROM exam_attempts WHERE student_id = $1 AND exam_id = $2 LIMIT 1",
          [compound.studentId, compound.examId]
        );
        if (rows.length > 0) row = rows[0];
      } else if (id) {
        const rows = await queryRawPg("SELECT * FROM exam_attempts WHERE id = $1 LIMIT 1", [id]);
        if (rows.length > 0) row = rows[0];
      }
      if (!row) return null;

      const result: any = {
        id: row.id,
        studentId: row.student_id,
        examId: row.exam_id,
        startedAt: row.started_at,
        submittedAt: row.submitted_at,
        isCompleted: row.is_completed,
        objectiveScore: row.objective_score,
        theoryScore: row.theory_score,
        totalScore: row.total_score,
        studentAnswers: row.student_answers,
        isTransmittedToAdmin: row.is_transmitted_to_admin,
        teacherComment: row.teacher_comment,
        gradedByTeacherName: row.graded_by_teacher_name,
      };

      if (args?.include?.student) {
        const sRows = await queryRawPg("SELECT * FROM students WHERE id = $1 LIMIT 1", [row.student_id]).catch(() => []);
        if (sRows.length > 0) {
          const s = sRows[0];
          result.student = {
            id: s.id,
            admNo: s.adm_no,
            surname: s.surname,
            fullName: s.full_name,
            currentClass: s.current_class,
            gender: s.gender,
            session: s.session,
            status: s.status,
          };
        }
      }
      if (args?.include?.exam) {
        const eRows = await queryRawPg("SELECT * FROM exams WHERE id = $1 LIMIT 1", [row.exam_id]).catch(() => []);
        if (eRows.length > 0) {
          const e = eRows[0];
          result.exam = {
            id: e.id,
            title: e.title,
            subject: e.subject,
            targetClass: e.target_class,
            examDate: e.exam_date,
            durationMinutes: e.duration_minutes,
            isActive: e.is_active,
            hasTheory: e.has_theory,
          };
        }
      }
      return result;
    }
    if (method === "findMany") {
      let sql = "SELECT ea.* FROM exam_attempts ea";
      const params: any[] = [];
      const where = args?.where || {};

      const hasExamFilter = where.exam?.subject || where.exam?.targetClass || where.exam?.createdBy;
      if (hasExamFilter) {
        sql += " JOIN exams e ON e.id = ea.exam_id";
      }

      sql += " WHERE 1=1";

      if (where.examId !== undefined) {
        if (typeof where.examId === "number" || typeof where.examId === "string") {
          params.push(where.examId);
          sql += ` AND ea.exam_id = $${params.length}`;
        } else if (where.examId?.in && Array.isArray(where.examId.in)) {
          if (where.examId.in.length === 0) {
            sql += " AND 1=0";
          } else {
            params.push(where.examId.in);
            sql += ` AND ea.exam_id = ANY($${params.length}::int[])`;
          }
        }
      }
      if (where.studentId !== undefined) {
        params.push(where.studentId);
        sql += ` AND ea.student_id = $${params.length}`;
      }
      if (where.isCompleted !== undefined) {
        params.push(where.isCompleted);
        sql += ` AND ea.is_completed = $${params.length}`;
      }
      if (where.exam?.createdBy) {
        const cbVal = typeof where.exam.createdBy === "string" ? where.exam.createdBy : where.exam.createdBy?.equals;
        if (cbVal) {
          params.push(cbVal);
          sql += ` AND LOWER(e.created_by) = LOWER($${params.length})`;
        }
      }
      if (where.exam?.subject?.contains) {
        params.push(`%${where.exam.subject.contains}%`);
        sql += ` AND e.subject ILIKE $${params.length}`;
      }
      if (where.exam?.targetClass?.contains) {
        params.push(`%${where.exam.targetClass.contains}%`);
        sql += ` AND e.target_class ILIKE $${params.length}`;
      }

      sql += " ORDER BY ea.submitted_at DESC NULLS LAST, ea.id DESC";

      const rows = await queryRawPg(sql, params).catch(() => []);

      let studentMap: Record<number, any> = {};
      let examMap: Record<number, any> = {};

      if (args?.include?.student && rows.length > 0) {
        const studentIds = Array.from(new Set(rows.map((r: any) => r.student_id)));
        const sRows = await queryRawPg("SELECT * FROM students WHERE id = ANY($1::int[])", [studentIds]).catch(() => []);
        for (const s of sRows) {
          studentMap[s.id] = {
            id: s.id,
            admNo: s.adm_no,
            surname: s.surname,
            fullName: s.full_name,
            currentClass: s.current_class,
            gender: s.gender,
            session: s.session,
            status: s.status,
          };
        }
      }

      if (args?.include?.exam && rows.length > 0) {
        const examIds = Array.from(new Set(rows.map((r: any) => r.exam_id)));
        const eRows = await queryRawPg("SELECT * FROM exams WHERE id = ANY($1::int[])", [examIds]).catch(() => []);
        for (const e of eRows) {
          examMap[e.id] = {
            id: e.id,
            title: e.title,
            subject: e.subject,
            targetClass: e.target_class,
            examDate: e.exam_date,
            durationMinutes: e.duration_minutes,
            isActive: e.is_active,
            hasTheory: e.has_theory,
          };
        }
      }

      return rows.map((r: any) => {
        const item: any = {
          id: r.id,
          studentId: r.student_id,
          examId: r.exam_id,
          startedAt: r.started_at,
          submittedAt: r.submitted_at,
          isCompleted: r.is_completed,
          objectiveScore: r.objective_score,
          theoryScore: r.theory_score,
          totalScore: r.total_score,
          studentAnswers: r.student_answers,
          isTransmittedToAdmin: r.is_transmitted_to_admin,
          teacherComment: r.teacher_comment,
          gradedByTeacherName: r.graded_by_teacher_name,
        };
        if (args?.include?.student) {
          item.student = studentMap[r.student_id] || {
            id: r.student_id,
            admNo: "N/A",
            fullName: "Student",
            currentClass: "N/A",
          };
        }
        if (args?.include?.exam) {
          item.exam = examMap[r.exam_id] || {
            id: r.exam_id,
            title: "Exam",
            subject: "General",
            targetClass: "SS",
            hasTheory: false,
          };
        }
        return item;
      });
    }
    if (method === "create") {
      const d = args?.data;
      let rows: any[];
      try {
        rows = await queryRawPg(
          `INSERT INTO exam_attempts (student_id, exam_id, started_at, is_completed, objective_score, theory_score, total_score, student_answers, is_transmitted_to_admin, teacher_comment, graded_by_teacher_name)
           VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            d.studentId,
            d.examId,
            d.isCompleted ?? false,
            d.objectiveScore ?? 0,
            d.theoryScore ?? 0,
            d.totalScore ?? 0,
            JSON.stringify(d.studentAnswers || {}),
            d.isTransmittedToAdmin ?? false,
            d.teacherComment || null,
            d.gradedByTeacherName || null,
          ]
        );
      } catch {
        const maxRows = await queryRawPg("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM exam_attempts");
        const nextId = maxRows[0]?.next_id || 1;
        rows = await queryRawPg(
          `INSERT INTO exam_attempts (id, student_id, exam_id, started_at, is_completed, objective_score, theory_score, total_score, student_answers, is_transmitted_to_admin, teacher_comment, graded_by_teacher_name)
           VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [
            nextId,
            d.studentId,
            d.examId,
            d.isCompleted ?? false,
            d.objectiveScore ?? 0,
            d.theoryScore ?? 0,
            d.totalScore ?? 0,
            JSON.stringify(d.studentAnswers || {}),
            d.isTransmittedToAdmin ?? false,
            d.teacherComment || null,
            d.gradedByTeacherName || null,
          ]
        );
        await queryRawPg(`SELECT setval(pg_get_serial_sequence('"exam_attempts"', 'id'), $1, true)`, [nextId]).catch(() => {});
      }
      const r = rows[0];
      return {
        id: r.id,
        studentId: r.student_id,
        examId: r.exam_id,
        startedAt: r.started_at,
        submittedAt: r.submitted_at,
        isCompleted: r.is_completed,
        objectiveScore: r.objective_score,
        theoryScore: r.theory_score,
        totalScore: r.total_score,
        studentAnswers: r.student_answers,
        isTransmittedToAdmin: r.is_transmitted_to_admin,
        teacherComment: r.teacher_comment,
        gradedByTeacherName: r.graded_by_teacher_name,
      };
    }
    if (method === "update") {
      const id = args?.where?.id;
      const compound = args?.where?.studentId_examId;
      const d = args?.data || {};

      let sql = "UPDATE exam_attempts SET ";
      const sets: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      if (d.submittedAt !== undefined) { sets.push(`submitted_at = $${pIdx++}`); params.push(d.submittedAt); }
      if (d.isCompleted !== undefined) { sets.push(`is_completed = $${pIdx++}`); params.push(d.isCompleted); }
      if (d.objectiveScore !== undefined) { sets.push(`objective_score = $${pIdx++}`); params.push(d.objectiveScore); }
      if (d.theoryScore !== undefined) { sets.push(`theory_score = $${pIdx++}`); params.push(d.theoryScore); }
      if (d.totalScore !== undefined) { sets.push(`total_score = $${pIdx++}`); params.push(d.totalScore); }
      if (d.studentAnswers !== undefined) { sets.push(`student_answers = $${pIdx++}`); params.push(typeof d.studentAnswers === "object" ? JSON.stringify(d.studentAnswers) : d.studentAnswers); }
      if (d.isTransmittedToAdmin !== undefined) { sets.push(`is_transmitted_to_admin = $${pIdx++}`); params.push(d.isTransmittedToAdmin); }
      if (d.teacherComment !== undefined) { sets.push(`teacher_comment = $${pIdx++}`); params.push(d.teacherComment); }
      if (d.gradedByTeacherName !== undefined) { sets.push(`graded_by_teacher_name = $${pIdx++}`); params.push(d.gradedByTeacherName); }

      if (sets.length === 0) sets.push(`id = id`);
      sql += sets.join(", ");

      if (id) {
        sql += ` WHERE id = $${pIdx} RETURNING *`;
        params.push(id);
      } else if (compound) {
        sql += ` WHERE student_id = $${pIdx++} AND exam_id = $${pIdx} RETURNING *`;
        params.push(compound.studentId, compound.examId);
      }

      const rows = await queryRawPg(sql, params);
      const r = rows[0];
      if (!r) return null;

      const result: any = {
        id: r.id,
        studentId: r.student_id,
        examId: r.exam_id,
        startedAt: r.started_at,
        submittedAt: r.submitted_at,
        isCompleted: r.is_completed,
        objectiveScore: r.objective_score,
        theoryScore: r.theory_score,
        totalScore: r.total_score,
        studentAnswers: r.student_answers,
        isTransmittedToAdmin: r.is_transmitted_to_admin,
        teacherComment: r.teacher_comment,
        gradedByTeacherName: r.graded_by_teacher_name,
      };

      if (args?.include?.student) {
        const sRows = await queryRawPg("SELECT * FROM students WHERE id = $1 LIMIT 1", [r.student_id]).catch(() => []);
        if (sRows.length > 0) {
          const s = sRows[0];
          result.student = {
            id: s.id,
            admNo: s.adm_no,
            surname: s.surname,
            fullName: s.full_name,
            currentClass: s.current_class,
            gender: s.gender,
            session: s.session,
            status: s.status,
          };
        }
      }

      if (args?.include?.exam) {
        const eRows = await queryRawPg("SELECT * FROM exams WHERE id = $1 LIMIT 1", [r.exam_id]).catch(() => []);
        if (eRows.length > 0) {
          const e = eRows[0];
          result.exam = {
            id: e.id,
            title: e.title,
            subject: e.subject,
            targetClass: e.target_class,
            examDate: e.exam_date,
            durationMinutes: e.duration_minutes,
            isActive: e.is_active,
            hasTheory: e.has_theory,
          };
        }
      }

      return result;
    }
    if (method === "updateMany") {
      const where = args?.where || {};
      const d = args?.data || {};

      const sets: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      if (d.submittedAt !== undefined) { sets.push(`submitted_at = $${pIdx++}`); params.push(d.submittedAt); }
      if (d.startedAt !== undefined) { sets.push(`started_at = $${pIdx++}`); params.push(d.startedAt); }
      if (d.isCompleted !== undefined) { sets.push(`is_completed = $${pIdx++}`); params.push(d.isCompleted); }
      if (d.objectiveScore !== undefined) { sets.push(`objective_score = $${pIdx++}`); params.push(d.objectiveScore); }
      if (d.theoryScore !== undefined) { sets.push(`theory_score = $${pIdx++}`); params.push(d.theoryScore); }
      if (d.totalScore !== undefined) { sets.push(`total_score = $${pIdx++}`); params.push(d.totalScore); }
      if (d.studentAnswers !== undefined) { sets.push(`student_answers = $${pIdx++}`); params.push(typeof d.studentAnswers === "object" ? JSON.stringify(d.studentAnswers) : d.studentAnswers); }
      if (d.isTransmittedToAdmin !== undefined) { sets.push(`is_transmitted_to_admin = $${pIdx++}`); params.push(d.isTransmittedToAdmin); }
      if (d.teacherComment !== undefined) { sets.push(`teacher_comment = $${pIdx++}`); params.push(d.teacherComment); }
      if (d.gradedByTeacherName !== undefined) { sets.push(`graded_by_teacher_name = $${pIdx++}`); params.push(d.gradedByTeacherName); }

      if (sets.length === 0) return { count: 0 };

      const conds: string[] = [];
      if (where.id !== undefined) { conds.push(`id = $${pIdx++}`); params.push(where.id); }
      if (where.studentId !== undefined) { conds.push(`student_id = $${pIdx++}`); params.push(where.studentId); }
      if (where.examId !== undefined) { conds.push(`exam_id = $${pIdx++}`); params.push(where.examId); }
      if (where.isCompleted !== undefined) { conds.push(`is_completed = $${pIdx++}`); params.push(where.isCompleted); }

      let sql = `UPDATE exam_attempts SET ${sets.join(", ")}`;
      if (conds.length > 0) {
        sql += ` WHERE ${conds.join(" AND ")}`;
      }
      sql += " RETURNING id";

      const rows = await queryRawPg(sql, params);
      return { count: rows.length };
    }
  }

  // 9. teacherQuestionSubmission
  if (model === "teacherQuestionSubmission") {
    if (method === "findMany") {
      const statusFilter = args?.where?.status;
      const teacherEmail = args?.where?.teacherEmail;
      let sql = "SELECT * FROM teacher_question_submissions WHERE 1=1";
      const params: any[] = [];
      if (statusFilter && statusFilter !== "ALL") {
        sql += ` AND status = $${params.length + 1}`;
        params.push(statusFilter);
      }
      if (teacherEmail) {
        sql += ` AND LOWER(teacher_email) = LOWER($${params.length + 1})`;
        params.push(teacherEmail);
      }
      sql += " ORDER BY id DESC";
      const rows = await queryRawPg(sql, params);
      return rows.map((r: any) => ({
        id: r.id,
        teacherName: r.teacher_name,
        teacherEmail: r.teacher_email,
        subject: r.subject,
        targetClass: r.target_class,
        submissionType: r.submission_type,
        durationMinutes: r.duration_minutes,
        totalMarks: r.total_marks,
        questionData: r.question_data,
        imageUrl: r.image_url,
        instructions: r.instructions,
        status: r.status,
        adminFeedback: r.admin_feedback,
        createdAt: r.created_at,
      }));
    }
    if (method === "findUnique" || method === "findFirst") {
      const id = args?.where?.id;
      const rows = await queryRawPg("SELECT * FROM teacher_question_submissions WHERE id = $1 LIMIT 1", [id]);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        teacherName: r.teacher_name,
        teacherEmail: r.teacher_email,
        subject: r.subject,
        targetClass: r.target_class,
        submissionType: r.submission_type,
        durationMinutes: r.duration_minutes,
        totalMarks: r.total_marks,
        questionData: r.question_data,
        imageUrl: r.image_url,
        instructions: r.instructions,
        status: r.status,
        adminFeedback: r.admin_feedback,
        createdAt: r.created_at,
      };
    }
    if (method === "create") {
      const d = args?.data;
      const rows = await queryRawPg(
        `INSERT INTO teacher_question_submissions (
          teacher_name, teacher_email, subject, target_class, submission_type,
          duration_minutes, total_marks, question_data, image_url, instructions,
          status, admin_feedback, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING *`,
        [
          d.teacherName,
          d.teacherEmail || null,
          d.subject,
          d.targetClass,
          d.submissionType || "MANUAL",
          d.durationMinutes ?? 60,
          d.totalMarks ?? 100,
          d.questionData || null,
          d.imageUrl || null,
          d.instructions || null,
          d.status || "PENDING",
          d.adminFeedback || null,
        ]
      );
      const r = rows[0];
      return {
        id: r.id,
        teacherName: r.teacher_name,
        teacherEmail: r.teacher_email,
        subject: r.subject,
        targetClass: r.target_class,
        submissionType: r.submission_type,
        durationMinutes: r.duration_minutes,
        totalMarks: r.total_marks,
        questionData: r.question_data,
        imageUrl: r.image_url,
        instructions: r.instructions,
        status: r.status,
        adminFeedback: r.admin_feedback,
        createdAt: r.created_at,
      };
    }
    if (method === "update") {
      const id = args?.where?.id;
      const d = args?.data || {};
      let sql = "UPDATE teacher_question_submissions SET ";
      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;
      if (d.teacherName !== undefined) { sets.push(`teacher_name = $${idx++}`); params.push(d.teacherName); }
      if (d.teacherEmail !== undefined) { sets.push(`teacher_email = $${idx++}`); params.push(d.teacherEmail); }
      if (d.subject !== undefined) { sets.push(`subject = $${idx++}`); params.push(d.subject); }
      if (d.targetClass !== undefined) { sets.push(`target_class = $${idx++}`); params.push(d.targetClass); }
      if (d.submissionType !== undefined) { sets.push(`submission_type = $${idx++}`); params.push(d.submissionType); }
      if (d.durationMinutes !== undefined) { sets.push(`duration_minutes = $${idx++}`); params.push(d.durationMinutes); }
      if (d.totalMarks !== undefined) { sets.push(`total_marks = $${idx++}`); params.push(d.totalMarks); }
      if (d.questionData !== undefined) { sets.push(`question_data = $${idx++}`); params.push(d.questionData); }
      if (d.imageUrl !== undefined) { sets.push(`image_url = $${idx++}`); params.push(d.imageUrl); }
      if (d.instructions !== undefined) { sets.push(`instructions = $${idx++}`); params.push(d.instructions); }
      if (d.status !== undefined) { sets.push(`status = $${idx++}`); params.push(d.status); }
      if (d.adminFeedback !== undefined) { sets.push(`admin_feedback = $${idx++}`); params.push(d.adminFeedback); }
      if (sets.length === 0) sets.push(`id = id`);
      sql += sets.join(", ");
      sql += ` WHERE id = $${idx} RETURNING *`;
      params.push(id);
      const rows = await queryRawPg(sql, params);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        teacherName: r.teacher_name,
        teacherEmail: r.teacher_email,
        subject: r.subject,
        targetClass: r.target_class,
        submissionType: r.submission_type,
        durationMinutes: r.duration_minutes,
        totalMarks: r.total_marks,
        questionData: r.question_data,
        imageUrl: r.image_url,
        instructions: r.instructions,
        status: r.status,
        adminFeedback: r.admin_feedback,
        createdAt: r.created_at,
      };
    }
    if (method === "delete") {
      const id = args?.where?.id;
      await queryRawPg("DELETE FROM teacher_question_submissions WHERE id = $1", [id]);
      return { id };
    }
  }

  // Universal count method for all models
  if (method === "count") {
    const tableMap: Record<string, string> = {
      adminUser: "admin_users",
      student: "students",
      exam: "exams",
      objectiveQuestion: "objective_questions",
      theoryQuestion: "theory_questions",
      examAttempt: "exam_attempts",
      scratchCard: "scratch_cards",
      terminalResult: "terminal_results",
      teacherQuestionSubmission: "teacher_question_submissions",
    };
    const tableName = tableMap[model] || model;
    const rows = await queryRawPg(`SELECT COUNT(*)::int AS cnt FROM "${tableName}"`);
    return rows[0]?.cnt || 0;
  }

  return null;
}

interface FallbackExecutionResult {
  handled: boolean;
  value?: any;
}

export async function executePgFallbackSafe(model: string, method: string, args: any): Promise<FallbackExecutionResult> {
  const supportedModels = [
    "adminUser",
    "student",
    "exam",
    "objectiveQuestion",
    "theoryQuestion",
    "examAttempt",
    "scratchCard",
    "terminalResult",
    "teacherQuestionSubmission",
  ];

  if (!supportedModels.includes(model)) {
    return { handled: false };
  }

  try {
    const val = await executePgFallback(model, method, args);
    return { handled: true, value: val };
  } catch (err: any) {
    console.error(`[GFMS Pure-JS DB Error] on ${model}.${method}:`, err);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// 6. Fail-Safe Prisma Proxy Engine (Zero Tokio Panic / Zero Native Aborts)
// ----------------------------------------------------------------------------
function createPrismaProxy(targetProvider: () => PrismaClient): any {
  // Defer database auto-heal by 3.5s at runtime (skip during `next build` static generation workers)
  if (typeof setTimeout !== "undefined" && process.env.NEXT_PHASE !== "phase-production-build") {
    setTimeout(() => {
      ensureDatabaseHealth().catch(() => {});
    }, 3500).unref?.();
  }

  const dummyTracing = {
    getActiveContext: () => ({}),
    runInChildSpan: (_name: any, fn: any) => (typeof fn === "function" ? fn() : undefined),
  };
  const dummyMiddlewares = {
    get: () => [],
  };

  const handler: ProxyHandler<any> = {
    get(_targetObj: any, prop: string | symbol) {
      if (typeof prop !== "string") {
        return undefined;
      }

      // 1. Intercept Prisma internal tracing & middleware helpers
      if (prop === "_tracingHelper") return dummyTracing;
      if (prop === "_middlewares") return dummyMiddlewares;
      if (prop === "_runtimeDataModel") return {};

      // 2. Intercept raw SQL execution methods ($executeRawUnsafe, $queryRawUnsafe, etc.)
      if (prop === "$executeRawUnsafe") {
        return async (sql: string, ...params: any[]) => {
          const res = await queryRawPg(sql, params);
          return res.length;
        };
      }
      if (prop === "$queryRawUnsafe") {
        return async (sql: string, ...params: any[]) => {
          return await queryRawPg(sql, params);
        };
      }
      if (prop === "$executeRaw") {
        return async (queryObj: any, ...values: any[]) => {
          const sql = typeof queryObj === "string" ? queryObj : queryObj?.strings ? queryObj.strings.join("$") : String(queryObj);
          const res = await queryRawPg(sql, values);
          return res.length;
        };
      }
      if (prop === "$queryRaw") {
        return async (queryObj: any, ...values: any[]) => {
          const sql = typeof queryObj === "string" ? queryObj : queryObj?.strings ? queryObj.strings.join("$") : String(queryObj);
          return await queryRawPg(sql, values);
        };
      }
      if (prop === "$connect") {
        return async () => {
          const pool = getPgPool();
          if (pool) {
            const client = await pool.connect();
            client.release();
          }
        };
      }
      if (prop === "$disconnect") {
        return async () => {};
      }

      // 3. Model operations proxy (e.g. prisma.student.findUnique, prisma.exam.findMany)
      return new Proxy({}, {
        get(_mTarget: any, actionProp: string | symbol) {
          if (typeof actionProp !== "string") return undefined;

          return async (...args: any[]) => {
            // First check if pure-JS PG can handle this operation
            const fallbackResult = await executePgFallbackSafe(prop, actionProp, args[0]);
            if (fallbackResult.handled) {
              return fallbackResult.value;
            }

            // If not handled by pure-JS PG, and pure-JS is enforced (e.g. on Linux/production),
            // return null to prevent calling native Prisma query engine and crashing via Tokio panic
            if (USE_PURE_PG) {
              console.warn(`[GFMS Pure-JS DB] Unhandled operation ${prop}.${actionProp}, returning null.`);
              return null;
            }

            // Local development fallback: delegate to raw Prisma instance
            const realPrisma = targetProvider();
            const realModel = (realPrisma as any)[prop];
            if (realModel && typeof realModel[actionProp] === "function") {
              return await realModel[actionProp].apply(realModel, args);
            }
            return null;
          };
        },
      });
    },
  };

  return new Proxy({}, handler);
}

export const prisma: PrismaClient = global.prismaInstance || createPrismaProxy(getRawPrisma);

// Guarantee process-wide singleton across all server chunks/modules in production
if (!global.prismaInstance) {
  global.prismaInstance = prisma;
}

export default prisma;

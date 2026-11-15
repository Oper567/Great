/**
 * Great-Favour Montessori School (GFMS)
 * Production HTTP Server for cPanel / CloudLinux (Phusion Passenger)
 *
 * Phusion Passenger dynamically injects `process.env.PORT` as either:
 *  1. A numeric port (e.g. 3000, 49200)
 *  2. A Unix domain socket path (e.g. /tmp/passenger.xxx/socket)
 */

// Disable Next.js telemetry to conserve CPU/RAM on shared hosting
process.env.NEXT_TELEMETRY_DISABLED = '1';

// Default to production environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Synchronous Zero-Dependency .env Loader for Phusion Passenger / cPanel
const fs = require('fs');
const path = require('path');

function loadEnvSync(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  } catch (e) {
    console.warn('[GFMS Server] Could not read env file:', filePath, e.message);
  }
}

// Load env files in priority order
loadEnvSync(path.join(__dirname, '.env.production'));
loadEnvSync(path.join(__dirname, '.env.local'));
loadEnvSync(path.join(__dirname, '.env'));

if (process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

// Load or persist cryptographically random Server Actions & Session keys when unset in env
// Prevents deployment skew across restarts without storing static secrets in source control
const nodeCrypto = require('crypto');
const runtimeSecretsPath = path.join(process.cwd(), '.gfms_runtime_secrets.json');
let persistedSecrets = {};
try {
  if (fs.existsSync(runtimeSecretsPath)) {
    persistedSecrets = JSON.parse(fs.readFileSync(runtimeSecretsPath, 'utf8') || '{}') || {};
  }
} catch (_) {
  persistedSecrets = {};
}
let runtimeSecretsUpdated = false;
if (!process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
  if (!persistedSecrets.actionsKey || typeof persistedSecrets.actionsKey !== 'string') {
    persistedSecrets.actionsKey = nodeCrypto.randomBytes(32).toString('base64');
    runtimeSecretsUpdated = true;
  }
  process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = persistedSecrets.actionsKey;
}
if (!process.env.SESSION_SECRET) {
  if (!persistedSecrets.sessionSecret || typeof persistedSecrets.sessionSecret !== 'string') {
    persistedSecrets.sessionSecret = nodeCrypto.randomBytes(32).toString('hex');
    runtimeSecretsUpdated = true;
  }
  process.env.SESSION_SECRET = persistedSecrets.sessionSecret;
}
if (runtimeSecretsUpdated) {
  try {
    fs.writeFileSync(runtimeSecretsPath, JSON.stringify(persistedSecrets), { mode: 0o600 });
  } catch (_) {}
}

// Enable Pure-JS PostgreSQL driver to prevent CloudLinux thread exhaustion / Tokio panics
if (!process.env.FORCE_PURE_PG) {
  process.env.FORCE_PURE_PG = 'true';
}

// Restrict Tokio/libuv/V8 thread spawning to prevent CloudLinux LVE NPROC exhaustion
process.env.TOKIO_WORKER_THREADS = '1';
process.env.RAYON_NUM_THREADS = '1';
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = 'library';
if (!process.env.UV_THREADPOOL_SIZE) {
  process.env.UV_THREADPOOL_SIZE = '2';
}

// Guarantee minimal connection pool to prevent CloudLinux nproc thread exhaustion
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('connection_limit=')) {
  const sep = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${sep}connection_limit=3&pool_timeout=10`;
}
if (process.env.DIRECT_URL && !process.env.DIRECT_URL.includes('connection_limit=')) {
  const sep = process.env.DIRECT_URL.includes('?') ? '&' : '?';
  process.env.DIRECT_URL = `${process.env.DIRECT_URL}${sep}connection_limit=3&pool_timeout=10`;
}

// Tailored connection pool max for starter plan hosting (prevents PostgreSQL connection exhaustion)
if (!process.env.PG_POOL_MAX) {
  process.env.PG_POOL_MAX = '5';
}

// Enforce heap & V8 pool defaults for any child processes (set in cPanel Env Vars for main process)
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=384 --v8-pool-size=1';
} else {
  if (!process.env.NODE_OPTIONS.includes('--max-old-space-size')) {
    process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS} --max-old-space-size=384`.trim();
  }
  if (!process.env.NODE_OPTIONS.includes('--v8-pool-size')) {
    process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS} --v8-pool-size=1`.trim();
  }
}

// 1. Auto-normalize permissions to prevent EACCES / dlopen errors in cPanel/CloudLinux
function normalizePermissions(targetPath) {
  try {
    if (!fs.existsSync(targetPath)) return;
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      try { fs.chmodSync(targetPath, 0o755); } catch (_) {}
      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      for (const entry of entries) {
        normalizePermissions(path.join(targetPath, entry.name));
      }
    } else {
      const lower = targetPath.toLowerCase();
      if (lower.endsWith('.node') || lower.endsWith('.so') || lower.endsWith('.sh')) {
        try { fs.chmodSync(targetPath, 0o755); } catch (_) {}
      } else {
        try { fs.chmodSync(targetPath, 0o644); } catch (_) {}
      }
    }
  } catch (err) {
    // Non-fatal: continue even if host restricts chmod
  }
}

const localPrisma = path.join(__dirname, '.prisma');
const targetPrisma = path.join(__dirname, 'node_modules', '.prisma');
const nextDirPath = path.join(__dirname, '.next');
const buildIdPath = path.join(nextDirPath, 'BUILD_ID');
const bootMarkerPath = path.join(nextDirPath, '.gfms_boot_synced');

// 2. Locate cPanel Node VirtualEnv lib directory safely inside user home only
let venvLib = null;
const userHome = process.env.HOME || '';
if (userHome && fs.existsSync(userHome)) {
  const candidate = path.join(userHome, 'nodevenv', 'gfms_app', '20', 'lib');
  if (fs.existsSync(candidate)) {
    venvLib = candidate;
  }
}

if (venvLib) {
  const venvEnv = path.join(venvLib, '.env');
  const localEnv = path.join(__dirname, '.env');
  if (fs.existsSync(localEnv)) {
    try {
      let needsEnvSync = !fs.existsSync(venvEnv);
      if (!needsEnvSync) {
        const localStat = fs.statSync(localEnv);
        const venvStat = fs.statSync(venvEnv);
        needsEnvSync = localStat.mtimeMs > venvStat.mtimeMs || localStat.size !== venvStat.size;
      }
      if (needsEnvSync) {
        fs.copyFileSync(localEnv, venvEnv);
        console.log('✓ Successfully synced .env to cPanel virtualenv path:', venvEnv);
      }
    } catch (_) {}
  }
}

// Compute current build stamp so recursive chmod & .prisma copies run once per deploy instead of blocking every worker cold start
let currentBootStamp = 'no-build-id';
try {
  if (fs.existsSync(buildIdPath)) {
    currentBootStamp = fs.readFileSync(buildIdPath, 'utf8').trim() || 'empty-build-id';
  }
} catch (_) {}
currentBootStamp = `${currentBootStamp}:${fs.existsSync(localPrisma) ? '1' : '0'}:${__dirname}`;

let alreadySyncedThisBuild = false;
try {
  if (fs.existsSync(bootMarkerPath)) {
    alreadySyncedThisBuild = fs.readFileSync(bootMarkerPath, 'utf8').trim() === currentBootStamp;
  }
} catch (_) {}

const prismaTargets = [];
if (venvLib && fs.existsSync(path.join(venvLib, 'node_modules'))) {
  prismaTargets.push(path.join(venvLib, 'node_modules', '.prisma'));
}
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
  prismaTargets.push(targetPrisma);
}
const missingPrismaTarget =
  fs.existsSync(localPrisma) &&
  prismaTargets.some((t) => !fs.existsSync(path.join(t, 'client', 'default.js')));

if (!alreadySyncedThisBuild || missingPrismaTarget) {
  normalizePermissions(path.join(__dirname, 'public'));
  normalizePermissions(nextDirPath);
  normalizePermissions(localPrisma);

  // 2b. Auto-sync pre-bundled packages (pg, bcryptjs) into virtualenv / symlinked node_modules (Zero-Install)
  const prebundledDir = path.join(__dirname, 'prebundled_modules');
  if (fs.existsSync(prebundledDir)) {
    const targetNm = (venvLib && fs.existsSync(path.join(venvLib, 'node_modules')))
      ? path.join(venvLib, 'node_modules')
      : (fs.existsSync(path.join(__dirname, 'node_modules')) ? path.join(__dirname, 'node_modules') : null);

    if (targetNm && fs.existsSync(targetNm)) {
      try {
        const pkgs = fs.readdirSync(prebundledDir);
        for (const pkg of pkgs) {
          const src = path.join(prebundledDir, pkg);
          const dest = path.join(targetNm, pkg);
          if (!fs.existsSync(dest)) {
            fs.cpSync(src, dest, { recursive: true });
          }
        }
        console.log(`✓ Successfully synced zero-install packages (pg, bcryptjs) into ${path.relative(__dirname, targetNm)}`);
      } catch (err) {
        console.warn('[GFMS Server] Warning syncing prebundled packages:', err.message);
      }
    }
  }

  // 3. Auto-sync pre-packaged .prisma engines into virtualenv and symlinked node_modules
  if (fs.existsSync(localPrisma)) {
    for (const tPrisma of prismaTargets) {
      try {
        if (!fs.existsSync(tPrisma)) {
          fs.mkdirSync(tPrisma, { recursive: true });
        }
        fs.cpSync(localPrisma, tPrisma, { recursive: true, force: true });
        normalizePermissions(tPrisma);
        console.log(`✓ Successfully synced pre-compiled Prisma client into ${path.relative(__dirname, tPrisma)}`);
      } catch (err) {
        console.warn('[GFMS Server] Warning syncing .prisma into target:', err.message);
      }
    }
  }

  if (fs.existsSync(nextDirPath)) {
    try {
      fs.writeFileSync(bootMarkerPath, currentBootStamp, 'utf8');
    } catch (_) {}
  }
}

// 4. Force-resolve the correct Linux/RHEL query engine for CloudLinux CageFS
if (process.platform === 'linux' && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  const candidateEngines = [
    'libquery_engine-rhel-openssl-1.1.x.so.node',
    'libquery_engine-rhel-openssl-3.0.x.so.node',
    'libquery_engine-debian-openssl-1.1.x.so.node',
    'libquery_engine-debian-openssl-3.0.x.so.node',
  ];

  const searchDirs = [
    path.join(targetPrisma, 'client'),
    path.join(localPrisma, 'client'),
  ];
  if (venvLib && fs.existsSync(venvLib)) {
    searchDirs.push(path.join(venvLib, 'node_modules', '.prisma', 'client'));
  }

  for (const candidate of candidateEngines) {
    for (const sDir of searchDirs) {
      const fullCandidate = path.join(sDir, candidate);
      if (fs.existsSync(fullCandidate)) {
        try { fs.chmodSync(fullCandidate, 0o755); } catch (_) {}
        process.env.PRISMA_QUERY_ENGINE_LIBRARY = fullCandidate;
        console.log(`✓ Configured PRISMA_QUERY_ENGINE_LIBRARY = ${fullCandidate}`);
        break;
      }
    }
    if (process.env.PRISMA_QUERY_ENGINE_LIBRARY) break;
  }
}

// Log detected Prisma Query Engines for diagnostics
const engineSearchDir = fs.existsSync(path.join(targetPrisma, 'client'))
  ? path.join(targetPrisma, 'client')
  : (fs.existsSync(path.join(localPrisma, 'client')) ? path.join(localPrisma, 'client') : null);

if (engineSearchDir) {
  try {
    const engines = fs.readdirSync(engineSearchDir).filter((f) => f.includes('query_engine'));
    console.log(`✓ Prisma Query Engines available in ${path.relative(__dirname, engineSearchDir)}:`, engines.join(', '));
  } catch (_) {}
}

// 5. Verify pre-compiled Prisma client
const targetClientJs = path.join(targetPrisma, 'client', 'default.js');
if (fs.existsSync(targetClientJs)) {
  console.log('✓ Verified pre-compiled Prisma client in node_modules/.prisma/client');
}

const { createServer } = require('http');
const { parse } = require('url');

let next;
try {
  next = require('next');
} catch (e) {
  console.error('\n❌ [GFMS Fatal] "next" module not found in node_modules.');
  console.error('Please run "npm install" inside the application virtual environment in cPanel.\n');
  process.exit(1);
}

const dev = process.env.NODE_ENV !== 'production';
const rawPort = process.env.PORT || 3000;
const isSocket = isNaN(rawPort);
const port = isSocket ? 3000 : Number(rawPort);
const hostname = process.env.HOSTNAME || '0.0.0.0';

// Initialize Next.js App
const app = next({
  dev,
  hostname,
  port,
  dir: __dirname,
});

const handle = app.getRequestHandler();

const cssDir = path.join(__dirname, '.next', 'static', 'css');
const cachedCssFileMap = new Map();
let cachedFallbackCssFile = null;

function resolveStaticCssTarget(requestedFile) {
  if (cachedCssFileMap.has(requestedFile)) {
    return cachedCssFileMap.get(requestedFile);
  }
  const exactPath = path.join(cssDir, requestedFile);
  if (fs.existsSync(exactPath)) {
    cachedCssFileMap.set(requestedFile, { filePath: exactPath, exact: true });
    return { filePath: exactPath, exact: true };
  }
  if (!cachedFallbackCssFile && fs.existsSync(cssDir)) {
    const firstCss = fs.readdirSync(cssDir).find((f) => f.endsWith('.css'));
    if (firstCss) {
      cachedFallbackCssFile = path.join(cssDir, firstCss);
    }
  }
  if (cachedFallbackCssFile) {
    cachedCssFileMap.set(requestedFile, { filePath: cachedFallbackCssFile, exact: false });
    return { filePath: cachedFallbackCssFile, exact: false };
  }
  return null;
}

app.prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      try {
        // Normalize multi-hop proxy headers (e.g. "cbt.domain.com, cbt.domain.com" -> "cbt.domain.com")
        // cPanel / LiteSpeed / Passenger appends duplicate hosts across reverse proxy hops.
        if (req.headers['x-forwarded-host']) {
          const rawFwdHost = Array.isArray(req.headers['x-forwarded-host'])
            ? req.headers['x-forwarded-host'][0]
            : req.headers['x-forwarded-host'];
          req.headers['x-forwarded-host'] = rawFwdHost.split(',')[0].trim();
        }

        if (req.headers['x-forwarded-proto']) {
          const rawFwdProto = Array.isArray(req.headers['x-forwarded-proto'])
            ? req.headers['x-forwarded-proto'][0]
            : req.headers['x-forwarded-proto'];
          const cleanProto = rawFwdProto.split(',')[0].trim();
          req.headers['x-forwarded-proto'] = cleanProto;
          res.setHeader('X-Forwarded-Proto', cleanProto);
        }

        if (req.headers['x-forwarded-for']) {
          const rawFwdFor = Array.isArray(req.headers['x-forwarded-for'])
            ? req.headers['x-forwarded-for'][0]
            : req.headers['x-forwarded-for'];
          req.headers['x-forwarded-for'] = rawFwdFor.split(',')[0].trim();
        }

        // Normalize cPanel subdomain subdirectory prefixing (e.g. when cbt.* document root is public_html/cbt)
        if (req.url) {
          if (
            req.url.startsWith('/cbt/_next/') ||
            req.url.startsWith('/cbt/assets/') ||
            req.url.startsWith('/cbt/api/') ||
            req.url.startsWith('/cbt/cbt/') ||
            req.url === '/cbt/cbt' ||
            req.url.startsWith('/cbt/admin') ||
            req.url.startsWith('/cbt/staff') ||
            req.url.startsWith('/cbt/result') ||
            req.url.startsWith('/cbt/logo.jpg') ||
            req.url.startsWith('/cbt/favicon.ico') ||
            req.url.startsWith('/cbt/icon.jpg') ||
            req.url.startsWith('/cbt/apple-icon.jpg') ||
            req.url.startsWith('/cbt/cbt-sw.js') ||
            req.url.startsWith('/cbt/cbt-manifest.webmanifest') ||
            req.url.startsWith('/cbt/cbt-offline.html')
          ) {
            req.url = req.url.replace(/^\/cbt/, '') || '/';
          }
        }

        // Parse request URL
        const parsedUrl = parse(req.url, true);

        // Direct resilient CSS responder: serves .next/static/css/*.css directly from RAM-cached path lookup
        if (
          parsedUrl.pathname &&
          parsedUrl.pathname.startsWith('/_next/static/css/') &&
          parsedUrl.pathname.endsWith('.css')
        ) {
          const requestedFile = path.basename(parsedUrl.pathname);
          const resolvedCss = resolveStaticCssTarget(requestedFile);

          if (resolvedCss) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader(
              'Cache-Control',
              resolvedCss.exact ? 'public, max-age=86400, stale-while-revalidate=3600' : 'public, max-age=3600, must-revalidate'
            );
            fs.createReadStream(resolvedCss.filePath).pipe(res);
            return;
          }
        }

        // Sanitize and intercept malformed / bot probe Server Actions (e.g. Next-Action: "x" or '""x""')
        const rawNextAction = req.headers['next-action'];
        if (rawNextAction) {
          const actionVal = Array.isArray(rawNextAction) ? rawNextAction[0] : rawNextAction;
          const cleanAction = typeof actionVal === 'string' ? actionVal.replace(/["']/g, '').trim() : '';
          // Legitimate Next.js Server Action IDs are hexadecimal or base64 hashes (typically >= 16 chars)
          // Reject single-letter bot probes ("x", "test", etc.) before Next.js throws 'Cannot read properties of undefined (reading workers)'
          if (!cleanAction || cleanAction.length < 16) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Bad Request - Invalid Server Action Header');
            return;
          }
        }

        // Delegate routing, dynamic pages, static chunks, and Server Actions to Next.js
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error(`[GFMS Server Error] ${req.method} ${req.url}:`, err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('500 Internal Server Error - Great-Favour Montessori School');
        }
      }
    });

    // HTTP Keep-Alive & Timeout Configuration for Shared Hosting Reverse Proxies (LiteSpeed/Passenger/Apache)
    // Short keep-alive + socket reuse cap prevents stale idle proxy sockets or socket starvation under bursts
    server.keepAliveTimeout = 15000;
    server.headersTimeout = 16000;
    server.requestTimeout = 30000;
    server.maxRequestsPerSocket = 100;

    // Exit cleanly on fatal socket bind errors so broken workers cannot linger as zombies
    server.on('error', (err) => {
      console.error('❌ [GFMS Server Socket Error]:', err);
      if (!server.listening || err?.code === 'EADDRINUSE' || err?.code === 'EACCES') {
        process.exit(1);
      }
    });

    // Server listening configuration
    if (isSocket) {
      // Unix domain socket binding (Phusion Passenger / LiteSpeed LSAPI on cPanel)
      server.listen(rawPort, () => {
        console.log(`✓ GFMS Production Server active on Unix Socket: ${rawPort}`);
      });
    } else {
      // Standard TCP Port binding (Local dev, standalone VPS, or TCP-mode reverse proxy)
      server.listen(port, hostname, () => {
        console.log(`✓ GFMS Production Server listening at http://${hostname}:${port} (NODE_ENV: ${process.env.NODE_ENV})`);
      });
    }

    // Critical Process Crash Resilience for Shared Hosting
    // Preserve process on transient runtime errors, but exit if the HTTP listener itself failed/died
    process.on('uncaughtException', (err) => {
      console.error('[GFMS Critical Resilience] Intercepted uncaught exception:', err?.message || err);
      if (!server.listening || err?.code === 'EADDRINUSE' || err?.code === 'EACCES') {
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[GFMS Critical Resilience] Intercepted unhandled rejection (process preserved):', reason);
    });

    // Fast, guaranteed shutdown so recycled LiteSpeed/Passenger workers never accumulate against CloudLinux NPROC limits
    let isShuttingDown = false;
    const gracefulShutdown = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`[GFMS Server] Received ${signal}. Initiating fast graceful shutdown...`);

      const forceExitTimer = setTimeout(() => {
        console.warn('[GFMS Server] Closing remaining sockets on shutdown timeout.');
        if (typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
        process.exit(0);
      }, 3000);

      if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
      }

      if (global.__gfmsPgPool && typeof global.__gfmsPgPool.end === 'function') {
        global.__gfmsPgPool.end().catch(() => {});
      }

      server.close(() => {
        clearTimeout(forceExitTimer);
        console.log('[GFMS Server] All connections closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
    process.on('disconnect', () => gracefulShutdown('IPC_DISCONNECT'));
  })
  .catch((err) => {
    console.error('❌ [GFMS Server Fatal] Failed to prepare Next.js app:', err);
    process.exit(1);
  });

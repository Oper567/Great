/**
 * Great-Favour Montessori School (GFMS)
 * In-Memory High-Concurrency Cache for CBT Examination Engine
 * Specifically engineered for low-resource / cheap shared hosting (cPanel/CloudLinux)
 * 
 * Under high concurrency (e.g. 50-100 students clicking "Start Exam" or "Submit"),
 * fetching exam questions and evaluating answers from memory reduces database queries
 * by over 95%, eliminating database connection pool exhaustion and CPU spikes.
 */

import { ClientObjectiveQuestion, ClientTheoryQuestion } from "@/types/cbt";

export interface CachedExamPayload {
  exam: {
    id: number;
    title: string;
    subject: string;
    targetClass: string;
    durationMinutes: number;
    hasTheory: boolean;
    examDate: string;
    isActive: boolean;
  };
  sanitizedObjectiveQuestions: ClientObjectiveQuestion[];
  sanitizedTheoryQuestions: ClientTheoryQuestion[];
  answerKey: Record<number, { correctAnswer: string; points: number }>;
  totalPossiblePoints: number;
  totalQuestions: number;
  cachedAt: number;
}

// Global cache store across server invocations within the same Node process
declare global {
  // eslint-disable-next-line no-var
  var __gfmsCbtExamCache: Map<number, CachedExamPayload> | undefined;
}

const examCache: Map<number, CachedExamPayload> =
  global.__gfmsCbtExamCache || (global.__gfmsCbtExamCache = new Map());

// Cache Time-To-Live: 45 minutes (2,700,000 ms) — admin updates immediately invalidate cache by examId
const CACHE_TTL_MS = 45 * 60 * 1000;

export function getCachedExamPayload(examId: number): CachedExamPayload | null {
  const cached = examCache.get(examId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    examCache.delete(examId);
    return null;
  }
  return cached;
}

export function setCachedExamPayload(
  examId: number,
  payload: Omit<CachedExamPayload, "cachedAt">
): void {
  // Prevent unbounded memory growth on cheap hosting: keep max 25 active exams in RAM
  if (examCache.size >= 25) {
    const oldestKey = examCache.keys().next().value;
    if (oldestKey !== undefined) examCache.delete(oldestKey);
  }

  examCache.set(examId, {
    ...payload,
    cachedAt: Date.now(),
  });
}

export function invalidateExamCache(examId?: number): void {
  if (examId !== undefined) {
    examCache.delete(examId);
  } else {
    examCache.clear();
  }
}

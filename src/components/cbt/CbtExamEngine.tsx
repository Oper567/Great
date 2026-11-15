"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  HelpCircle,
  X,
  AlertCircle,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ImageIcon,
  ZoomIn,
  RefreshCw,
  Shuffle,
  Calculator as CalcIcon,
} from "lucide-react";
import CbtMiniCalculator from "./CbtMiniCalculator";
import { FormattedMathText } from "./FormattedMathText";
import { shuffleArrayWithSeed } from "@/lib/cbt-utils";
import {
  ClientExamPayload,
  ClientObjectiveQuestion,
  ClientTheoryQuestion,
  StudentSession,
} from "@/types/cbt";
import {
  getSinglePayloadExamAction,
  submitExamAttemptAction,
  saveExamProgressCheckpointAction,
} from "@/app/actions/cbt-exam";

interface Props {
  examId: number;
  student: StudentSession;
  initialResult?: {
    success: boolean;
    error?: string;
    alreadyCompleted?: boolean;
    objectiveScore?: number;
    payload?: ClientExamPayload;
  };
}

export default function CbtExamEngine({ examId, student, initialResult }: Props) {
  const router = useRouter();

  // Core Engine States - initialized synchronously from initialResult
  const [isLoading, setIsLoading] = useState(!initialResult);
  const [loadError, setLoadError] = useState<string | null>(
    initialResult && !initialResult.success
      ? initialResult.alreadyCompleted
        ? `You have already completed this examination. (Score: ${initialResult.objectiveScore} pts)`
        : initialResult.error || "Failed to load examination."
      : null
  );
  const [payload, setPayload] = useState<ClientExamPayload | null>(
    initialResult?.success && initialResult.payload ? initialResult.payload : null
  );

  // Active View & Navigation
  const [activeTab, setActiveTab] = useState<"objective" | "theory">("objective");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Real-time answers & index refs to guarantee zero lost state in event handlers without re-triggering syncs on navigation
  const answersRef = useRef<Record<number, string>>({});
  const currentIndexRef = useRef<number>(0);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Countdown Timer (Initialized synchronously from server payload duration/remainingSeconds)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    const initPayload = initialResult?.success ? initialResult.payload : null;
    if (!initPayload) return 3600;
    const totalSec =
      initPayload.durationSeconds ||
      Math.max(1, Number(initPayload.exam?.durationMinutes) || 60) * 60;
    return initPayload.remainingSeconds != null && initPayload.remainingSeconds > 0
      ? Math.min(totalSec, initPayload.remainingSeconds)
      : totalSec;
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const clientDeadlineMsRef = useRef<number>(0);
  const perfDeadlineMsRef = useRef<number>(0);
  const lastTickSecRef = useRef<number>(-1);
  const hasAutoSubmitted = useRef(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState<boolean>(
    Boolean(initialResult?.success && initialResult.payload?.recoveredSession)
  );

  // Modals & Submission state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const isSyncingRef = useRef(false);
  const lastSyncedSignatureRef = useRef<string>("");
  const lastSyncedAtMsRef = useRef<number>(0);
  const [submissionReason, setSubmissionReason] = useState<"manual" | "time_expired" | "tab_switch_violation">("manual");
  const [submissionResult, setSubmissionResult] = useState<{
    objectiveScore: number;
    totalPossiblePoints: number;
    answeredCount: number;
    totalQuestions: number;
    submissionReason?: string;
  } | null>(null);

  // Storage Keys: Strictly isolated by Student Admission Number, Attempt ID & Duration to prevent stale/cross-candidate state leakage
  const cleanAdmNo = (student?.admNo || String(student?.studentId || "default")).replace(/[^a-zA-Z0-9]/g, "_");
  const answersStorageKey = `exam_${examId}_${cleanAdmNo}_answers`;
  const legacyTimerStorageKey = `exam_${examId}_${cleanAdmNo}_startTime`;
  const flagsStorageKey = `exam_${examId}_${cleanAdmNo}_flags`;
  const strikesStorageKey = `exam_${examId}_${cleanAdmNo}_strikes`;
  const qOrderStorageKey = `exam_${examId}_${cleanAdmNo}_qOrder`;
  const currentIndexStorageKey = `exam_${examId}_${cleanAdmNo}_currentIndex`;

  const getTimerStorageKey = useCallback(
    (examPayload: ClientExamPayload | null) => {
      const attId = examPayload?.attemptId ?? 0;
      const durMin = Math.max(1, Number(examPayload?.exam?.durationMinutes) || 60);
      return `gfms_cbt_timer_v2_exam_${examId}_adm_${cleanAdmNo}_att_${attId}_dur_${durMin}`;
    },
    [examId, cleanAdmNo]
  );

  // Shuffled Objective Questions - uniquely & deterministically ordered for this candidate terminal
  const [shuffledObjectiveQuestions, setShuffledObjectiveQuestions] = useState<ClientObjectiveQuestion[]>(() => {
    if (initialResult?.success && initialResult.payload?.objectiveQuestions) {
      const questions = initialResult.payload.objectiveQuestions;
      const seed = `${cleanAdmNo}_exam_${examId}_seed`;
      return shuffleArrayWithSeed(questions, seed);
    }
    return [];
  });
  
  // Proctoring Strike System (Strict 3 Strikes Allowed)
  const [tabViolationStrikes, setTabViolationStrikes] = useState(0);
  const [showViolationWarningModal, setShowViolationWarningModal] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Helper to load client state from localStorage + Server Power-Off Recovery Checkpoint
  const setupClientState = useCallback((examPayload: ClientExamPayload) => {
    if (examPayload.recoveredSession) {
      setShowRecoveryBanner(true);
    }

    // 1. Shuffled objective questions setup (Seed-based deterministic shuffle + localStorage / server order persistence)
    if (examPayload.objectiveQuestions && examPayload.objectiveQuestions.length > 0) {
      let finalQuestions: ClientObjectiveQuestion[] = [];
      try {
        const cachedOrder = localStorage.getItem(qOrderStorageKey);
        const orderSource: number[] | null = cachedOrder
          ? JSON.parse(cachedOrder)
          : Array.isArray(examPayload.savedQuestionOrder) && examPayload.savedQuestionOrder.length > 0
          ? examPayload.savedQuestionOrder
          : null;

        if (orderSource && Array.isArray(orderSource)) {
          const qMap = new Map(examPayload.objectiveQuestions.map((q) => [q.id, q]));
          const restored: ClientObjectiveQuestion[] = [];
          orderSource.forEach((id) => {
            const q = qMap.get(Number(id));
            if (q) {
              restored.push(q);
              qMap.delete(Number(id));
            }
          });
          // Append any questions that weren't in cached IDs
          qMap.forEach((q) => restored.push(q));
          if (restored.length === examPayload.objectiveQuestions.length) {
            finalQuestions = restored;
          }
        }
      } catch {
        finalQuestions = [];
      }

      if (finalQuestions.length === 0) {
        const seed = `${cleanAdmNo}_exam_${examId}_seed`;
        finalQuestions = shuffleArrayWithSeed(examPayload.objectiveQuestions, seed);
      }

      try {
        localStorage.setItem(qOrderStorageKey, JSON.stringify(finalQuestions.map((q) => q.id)));
      } catch {
        // ignore
      }

      setShuffledObjectiveQuestions(finalQuestions);
    }

    // 2. Load & merge existing answers from server checkpoint and localStorage
    let mergedAnswers: Record<number, string> = {
      ...(examPayload.existingAnswers || {}),
    };
    try {
      const cached = localStorage.getItem(answersStorageKey);
      if (cached) {
        const parsedLocal = JSON.parse(cached);
        if (parsedLocal && typeof parsedLocal === "object") {
          mergedAnswers = { ...mergedAnswers, ...parsedLocal };
        }
      }
      localStorage.setItem(answersStorageKey, JSON.stringify(mergedAnswers));
    } catch {
      // ignore
    }
    setAnswers(mergedAnswers);
    answersRef.current = mergedAnswers;

    // 3. Load flags from server recovery + localStorage
    try {
      let restoredFlags: Record<number, boolean> = {};
      if (Array.isArray(examPayload.savedFlaggedIds)) {
        examPayload.savedFlaggedIds.forEach((id) => {
          restoredFlags[Number(id)] = true;
        });
      }
      const cachedFlags = localStorage.getItem(flagsStorageKey);
      if (cachedFlags) {
        restoredFlags = { ...restoredFlags, ...JSON.parse(cachedFlags) };
      }
      setFlagged(restoredFlags);
    } catch {
      // ignore
    }

    // 3b. Restore current question index from localStorage or server checkpoint
    try {
      const cachedIdx = localStorage.getItem(currentIndexStorageKey);
      const totalQ = examPayload.objectiveQuestions?.length || 1;
      if (cachedIdx !== null) {
        const parsedIdx = parseInt(cachedIdx, 10);
        if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < totalQ) {
          setCurrentIndex(parsedIdx);
        }
      } else if (
        typeof examPayload.savedCurrentIndex === "number" &&
        examPayload.savedCurrentIndex >= 0 &&
        examPayload.savedCurrentIndex < totalQ
      ) {
        setCurrentIndex(examPayload.savedCurrentIndex);
      }
    } catch {
      // ignore
    }

    // 4. Load proctor strikes from localStorage
    try {
      const storedStrikes = localStorage.getItem(strikesStorageKey);
      if (storedStrikes) {
        const parsed = parseInt(storedStrikes, 10);
        if (!isNaN(parsed) && parsed > 0) setTabViolationStrikes(parsed);
      }
    } catch {
      // ignore
    }

    // 5. Initialize Drift-Free, Clock-Skew-Immune & Power-Off-Protected Timer
    // Uses server-computed remainingSeconds (which accounts for power-off checkpoint protection)
    const safeDurationMinutes = Math.max(1, Number(examPayload.exam?.durationMinutes) || 60);
    const totalDurationSec = examPayload.durationSeconds || safeDurationMinutes * 60;
    const serverRemainingSec =
      examPayload.remainingSeconds != null && examPayload.remainingSeconds > 0
        ? Math.min(totalDurationSec, examPayload.remainingSeconds)
        : totalDurationSec;

    const activeTimerKey = getTimerStorageKey(examPayload);
    let effectiveRemainingSec = serverRemainingSec;

    try {
      // Purge legacy unversioned timer key that caused clock-skew bugs
      localStorage.removeItem(legacyTimerStorageKey);

      const storedTimerRaw = localStorage.getItem(activeTimerKey);
      if (storedTimerRaw && !examPayload.recoveredSession) {
        const parsedTimer = JSON.parse(storedTimerRaw);
        if (
          parsedTimer &&
          typeof parsedTimer.clientDeadlineMs === "number" &&
          parsedTimer.durationSeconds === totalDurationSec
        ) {
          const localRemainingSec = Math.round((parsedTimer.clientDeadlineMs - Date.now()) / 1000);
          // Only trust stored local deadline if it is positive and within totalDurationSec
          if (localRemainingSec > 0 && localRemainingSec <= totalDurationSec) {
            effectiveRemainingSec = Math.min(localRemainingSec, serverRemainingSec);
          }
        }
      }

      const clientDeadlineMs = Date.now() + effectiveRemainingSec * 1000;
      localStorage.setItem(
        activeTimerKey,
        JSON.stringify({
          clientDeadlineMs,
          durationSeconds: totalDurationSec,
          savedAtMs: Date.now(),
        })
      );
      clientDeadlineMsRef.current = clientDeadlineMs;
    } catch {
      clientDeadlineMsRef.current = Date.now() + effectiveRemainingSec * 1000;
    }

    const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
    perfDeadlineMsRef.current = nowPerf + effectiveRemainingSec * 1000;
    lastTickSecRef.current = effectiveRemainingSec;
    setTimeLeftSeconds(effectiveRemainingSec);
  }, [answersStorageKey, flagsStorageKey, strikesStorageKey, legacyTimerStorageKey, getTimerStorageKey, qOrderStorageKey, currentIndexStorageKey, cleanAdmNo, examId]);

  // --------------------------------------------------------------------------
  // 1. Initial Single Payload Setup
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // If initialResult was passed from the server, initialize immediately!
    if (initialResult) {
      if (initialResult.success && initialResult.payload) {
        setupClientState(initialResult.payload);
      }
      setIsLoading(false);
      return;
    }

    // Fallback: client-side fetch if initialResult wasn't provided
    async function initExam() {
      setIsLoading(true);
      setLoadError(null);

      const res = await getSinglePayloadExamAction(examId);
      if (!isMounted) return;

      if (!res.success) {
        if (res.alreadyCompleted) {
          setLoadError(`You have already completed this examination. (Score: ${res.objectiveScore} pts)`);
          try {
            localStorage.removeItem(answersStorageKey);
            localStorage.removeItem(legacyTimerStorageKey);
            localStorage.removeItem(flagsStorageKey);
            localStorage.removeItem(strikesStorageKey);
            localStorage.removeItem(qOrderStorageKey);
          } catch {
            // ignore
          }
        } else {
          setLoadError(res.error || "Failed to load examination.");
        }
        setIsLoading(false);
        return;
      }

      if (res.payload) {
        setPayload(res.payload);
        setupClientState(res.payload);
      }

      setIsLoading(false);
    }

    initExam();

    return () => {
      isMounted = false;
    };
  }, [examId, initialResult, setupClientState, answersStorageKey, legacyTimerStorageKey, flagsStorageKey, strikesStorageKey, qOrderStorageKey]);

  // --------------------------------------------------------------------------
  // 2. Submission Handler (Manual, Timer Expired, or Tab Switch Violation)
  // Engineered with auto-retry resilience for low-tier shared hosting under heavy load
  // --------------------------------------------------------------------------
  const executeSubmission = useCallback(async (reason: "manual" | "time_expired" | "tab_switch_violation" = "manual") => {
    if (hasAutoSubmitted.current || isSubmittingRef.current || submissionResult) return;
    hasAutoSubmitted.current = true;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmissionReason(reason);
    setSubmissionError(null);

    // Stop countdown timer immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      // Use latest real-time answers from ref to guarantee no lost state
      const currentAnswers = answersRef.current;
      const answersMap: Record<string, string> = {};
      Object.entries(currentAnswers).forEach(([k, v]) => {
        answersMap[k] = v;
      });

      // Transient spike resilience: Auto-retry up to 3 times before displaying manual fallback
      let res: any = null;
      let lastErr: any = null;
      const MAX_RETRIES = 3;

      for (let attemptNum = 1; attemptNum <= MAX_RETRIES; attemptNum++) {
        try {
          res = await submitExamAttemptAction(examId, answersMap, reason);
          if (res?.success) break;
          // If server confirmed completion or rejected session, do not loop
          if (res?.alreadyCompleted || res?.error?.includes("already submitted")) break;
        } catch (err: any) {
          lastErr = err;
          console.warn(`[CBT Exam Terminal] Submission spike on attempt ${attemptNum}/${MAX_RETRIES}, retrying...`);
          if (attemptNum < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, attemptNum * 1200));
          }
        }
      }

      if (res && res.success) {
        // Clear local storage on final successful submission
        try {
          localStorage.removeItem(answersStorageKey);
          localStorage.removeItem(legacyTimerStorageKey);
          localStorage.removeItem(getTimerStorageKey(payload));
          localStorage.removeItem(flagsStorageKey);
          localStorage.removeItem(strikesStorageKey);
          localStorage.removeItem(qOrderStorageKey);
          localStorage.removeItem(currentIndexStorageKey);
        } catch {
          // ignore
        }

        setSubmissionResult({
          objectiveScore: res.objectiveScore ?? 0,
          totalPossiblePoints: res.totalPossiblePoints ?? 0,
          answeredCount: res.answeredCount ?? Object.keys(currentAnswers).length,
          totalQuestions: res.totalQuestions ?? (shuffledObjectiveQuestions.length || payload?.objectiveQuestions.length || 0),
          submissionReason: res.submissionReason || reason,
        });
        setIsSubmitModalOpen(false);
        setSubmissionError(null);
      } else {
        const errorMsg = res?.error || (lastErr ? "Server terminal is processing high load. Your answers are safely stored in your browser. Tap 'Retry Final Submission' to submit." : "Submission encountered an issue. Please retry.");
        setSubmissionError(errorMsg);
        hasAutoSubmitted.current = false;
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Submission error:", err);
      setSubmissionError("A network delay occurred. Your answers remain 100% safe. Please click 'Retry Final Submission'.");
      hasAutoSubmitted.current = false;
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [submissionResult, examId, payload, answersStorageKey, legacyTimerStorageKey, getTimerStorageKey, flagsStorageKey, strikesStorageKey, qOrderStorageKey, shuffledObjectiveQuestions]);

  const executeSubmissionRef = useRef(executeSubmission);
  useEffect(() => {
    executeSubmissionRef.current = executeSubmission;
  }, [executeSubmission]);

  // --------------------------------------------------------------------------
  // 3. High-Precision, Drift-Free Monotonic Countdown Timer Engine
  // Anchored to performance.now() + clientDeadlineMsRef so option clicks or tab
  // throttling never cause cumulative second drift or premature expiration.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isLoading || !payload || submissionResult) return;

    // Ensure deadlines are initialized if not already set
    if (clientDeadlineMsRef.current <= 0) {
      const fallbackSec =
        payload.remainingSeconds ||
        payload.durationSeconds ||
        Math.max(1, Number(payload.exam?.durationMinutes) || 60) * 60;
      clientDeadlineMsRef.current = Date.now() + fallbackSec * 1000;
      const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
      perfDeadlineMsRef.current = nowPerf + fallbackSec * 1000;
      lastTickSecRef.current = fallbackSec;
    }

    const tick = () => {
      if (hasAutoSubmitted.current || isSubmittingRef.current) return;

      const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
      const perfRemainingMs = perfDeadlineMsRef.current - nowPerf;
      const wallRemainingMs = clientDeadlineMsRef.current - Date.now();

      // Use monotonic performance.now() primary; resync to wall clock if device slept/hibernated (>4s delta)
      let effectiveRemainingMs = perfRemainingMs;
      if (Math.abs(perfRemainingMs - wallRemainingMs) > 4000) {
        effectiveRemainingMs = wallRemainingMs;
        perfDeadlineMsRef.current = nowPerf + wallRemainingMs;
      }

      const nextSec = Math.max(0, Math.ceil(effectiveRemainingMs / 1000));
      if (nextSec !== lastTickSecRef.current) {
        lastTickSecRef.current = nextSec;
        setTimeLeftSeconds(nextSec);
      }

      if (nextSec <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        executeSubmissionRef.current("time_expired");
      }
    };

    timerRef.current = setInterval(tick, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, payload, submissionResult]);

  // --------------------------------------------------------------------------
  // 3b. Debounced & Heartbeat Power-Off Recovery Checkpoint (Zero Data & Time Loss)
  // Saves answers, remaining timer seconds, current question index, flagged items,
  // and question order so that if a student's PC shuts down or restarts, their
  // exact state and remaining time are restored when they log back in.
  // --------------------------------------------------------------------------
  useEffect(() => {
    currentIndexRef.current = currentIndex;
    try {
      localStorage.setItem(currentIndexStorageKey, String(currentIndex));
    } catch {
      // ignore
    }
  }, [currentIndex, currentIndexStorageKey]);

  const syncProgressToServer = useCallback(async (force = false) => {
    if (isLoading || !payload || submissionResult || isSubmittingRef.current || isSyncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const mapToSave: Record<string, string> = {};
    Object.entries(answersRef.current).forEach(([k, v]) => {
      mapToSave[k] = v;
    });

    const flaggedIds = Object.entries(flagged)
      .filter(([, isFlagged]) => Boolean(isFlagged))
      .map(([k]) => Number(k))
      .filter((n) => !isNaN(n));

    const signature = JSON.stringify({ mapToSave, flaggedIds, idx: currentIndexRef.current });
    const elapsedSinceSync = Date.now() - lastSyncedAtMsRef.current;
    if (!force && signature === lastSyncedSignatureRef.current && elapsedSinceSync < 35000) {
      return;
    }

    const questionOrder =
      shuffledObjectiveQuestions.length > 0
        ? shuffledObjectiveQuestions.map((q) => q.id)
        : undefined;

    isSyncingRef.current = true;
    try {
      const res = await saveExamProgressCheckpointAction(examId, mapToSave, {
        attemptId: payload.attemptId,
        remainingSeconds: lastTickSecRef.current > 0 ? lastTickSecRef.current : undefined,
        currentIndex: currentIndexRef.current,
        flaggedIds,
        questionOrder,
      }).catch(() => ({ success: false }));

      if (res?.success) {
        const now = Date.now();
        lastSyncedSignatureRef.current = signature;
        lastSyncedAtMsRef.current = now;
        setLastSyncedAt(now);
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [isLoading, payload, submissionResult, flagged, shuffledObjectiveQuestions, examId]);

  useEffect(() => {
    if (isLoading || !payload || submissionResult || isSubmitting) return;
    const debounceTimer = setTimeout(() => {
      syncProgressToServer(false);
    }, 2500);
    return () => clearTimeout(debounceTimer);
  }, [answers, flagged, isLoading, payload, submissionResult, isSubmitting, syncProgressToServer]);

  useEffect(() => {
    if (isLoading || !payload || submissionResult || isSubmitting) return;
    const jitteredIntervalMs = 45000 + Math.floor(Math.random() * 10000);
    const heartbeat = setInterval(() => {
      syncProgressToServer(true);
    }, jitteredIntervalMs);
    return () => clearInterval(heartbeat);
  }, [isLoading, payload, submissionResult, isSubmitting, syncProgressToServer]);

  // --------------------------------------------------------------------------
  // 4. Anti-Cheating & Proctoring Engine: Strictly 3 Violations Allowed
  // Strike 1: Warning modal (2 strikes remaining)
  // Strike 2: Warning modal (FINAL WARNING - 1 strike remaining)
  // Strike 3: Immediate Auto-Submission
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isLoading || !payload || submissionResult) return;

    // Detect opening a new tab, switching away from tab, or minimizing browser
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" || document.hidden) {
        if (!hasAutoSubmitted.current && !isSubmittingRef.current) {
          setTabViolationStrikes((prev) => {
            const nextStrikes = prev + 1;
            try {
              localStorage.setItem(strikesStorageKey, String(nextStrikes));
            } catch {
              // ignore
            }

            if (nextStrikes < 3) {
              setShowViolationWarningModal(true);
              return nextStrikes;
            } else {
              console.warn("3rd tab switch detected! Auto-submitting CBT paper.");
              executeSubmissionRef.current("tab_switch_violation");
              return nextStrikes;
            }
          });
        }
      }
    };

    // Detect tab navigation or window unload
    const handlePageHide = () => {
      if (!hasAutoSubmitted.current && !isSubmittingRef.current && !submissionResult) {
        setTabViolationStrikes((prev) => {
          const nextStrikes = prev + 1;
          try {
            localStorage.setItem(strikesStorageKey, String(nextStrikes));
          } catch {
            // ignore
          }

          if (nextStrikes >= 3) {
            executeSubmissionRef.current("tab_switch_violation");
          }
          return nextStrikes;
        });
      }
    };

    // Warn if candidate attempts to close or reload browser window during active exam
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasAutoSubmitted.current && !submissionResult) {
        e.preventDefault();
        e.returnValue = "You have an active examination in progress. Leaving will submit your examination.";
        return e.returnValue;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isLoading, payload, submissionResult, strikesStorageKey]);

  // --------------------------------------------------------------------------
  // 5. Local State Updates & Keyboard Navigation Shortcuts
  // --------------------------------------------------------------------------
  const handleSelectOption = useCallback((questionId: number, letter: string) => {
    setAnswers((prev) => {
      const nextAnswers = { ...prev, [questionId]: letter };
      answersRef.current = nextAnswers;
      try {
        localStorage.setItem(answersStorageKey, JSON.stringify(nextAnswers));
      } catch {
        // ignore
      }
      return nextAnswers;
    });
  }, [answersStorageKey]);

  const handleClearAnswer = useCallback((questionId: number) => {
    setAnswers((prev) => {
      const nextAnswers = { ...prev };
      delete nextAnswers[questionId];
      answersRef.current = nextAnswers;
      try {
        localStorage.setItem(answersStorageKey, JSON.stringify(nextAnswers));
      } catch {
        // ignore
      }
      return nextAnswers;
    });
  }, [answersStorageKey]);

  const handleToggleFlag = useCallback((questionId: number) => {
    setFlagged((prev) => {
      const nextFlags = { ...prev, [questionId]: !prev[questionId] };
      try {
        localStorage.setItem(flagsStorageKey, JSON.stringify(nextFlags));
      } catch {
        // ignore
      }
      return nextFlags;
    });
  }, [flagsStorageKey]);

  // Keyboard shortcuts: A/B/C/D to pick option, Left/Right or P/N to navigate, F to flag
  useEffect(() => {
    if (
      isLoading ||
      !payload ||
      submissionResult ||
      activeTab !== "objective" ||
      isSubmitModalOpen ||
      showViolationWarningModal ||
      Boolean(lightboxImageUrl) ||
      isCalculatorOpen
    ) {
      return;
    }

    const questionsList =
      shuffledObjectiveQuestions.length > 0
        ? shuffledObjectiveQuestions
        : payload.objectiveQuestions || [];
    const activeQ = questionsList[currentIndex];
    if (!activeQ) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(key)) {
        e.preventDefault();
        handleSelectOption(activeQ.id, key);
      } else if (e.key === "ArrowRight" || key === "N") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(questionsList.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" || key === "P") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (key === "F") {
        e.preventDefault();
        handleToggleFlag(activeQ.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isLoading,
    payload,
    submissionResult,
    activeTab,
    isSubmitModalOpen,
    showViolationWarningModal,
    lightboxImageUrl,
    isCalculatorOpen,
    shuffledObjectiveQuestions,
    currentIndex,
    handleSelectOption,
    handleToggleFlag,
  ]);

  // Format Timer Display
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // --------------------------------------------------------------------------
  // Loading & Error States
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-900/40 border-2 border-blue-500 border-t-yellow-400 animate-spin flex items-center justify-center shadow-2xl shadow-blue-500/20" />
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-white tracking-tight">
            Preparing Examination Terminal...
          </h3>
          <p className="text-xs text-slate-400">
            Fetching single exam payload. All questions are loaded into secure memory.
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !payload) {
    const isCompleted = initialResult?.alreadyCompleted;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
              isCompleted
                ? "bg-emerald-950/80 border border-emerald-500 text-emerald-400"
                : "bg-rose-950 border border-rose-800 text-rose-400"
            }`}
          >
            {isCompleted ? <CheckCircle2 className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
          </div>
          <h3 className="text-lg font-bold text-white">
            {isCompleted ? "Examination Paper Completed" : "Examination Access Notice"}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">{loadError}</p>
          <button
            onClick={() => {
              router.push("/cbt/dashboard");
            }}
            className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition shadow"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Post-Submission Instant Score Card View
  // --------------------------------------------------------------------------
  if (submissionResult) {
    const isViolation =
      submissionReason === "tab_switch_violation" ||
      submissionResult.submissionReason === "tab_switch_violation";

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div
            className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
              isViolation
                ? "from-rose-600 via-amber-500 to-rose-600"
                : "from-emerald-500 via-yellow-400 to-emerald-500"
            }`}
          />

          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg ${
              isViolation
                ? "bg-rose-950/80 border border-rose-500 text-rose-400 shadow-rose-950"
                : "bg-emerald-950/80 border border-emerald-500 text-emerald-400 shadow-emerald-950"
            }`}
          >
            {isViolation ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>

          <div>
            <span
              className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                isViolation
                  ? "text-rose-400 bg-rose-950/60 border-rose-800"
                  : "text-emerald-400 bg-emerald-950/60 border-emerald-800"
              }`}
            >
              {isViolation ? "Exam Auto-Submitted (Security Violation)" : "Exam Submitted Successfully"}
            </span>
            <h2 className="text-2xl font-black text-white mt-3">
              {payload.exam.subject} Examination
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Candidate: <strong className="text-white">{student.fullName}</strong> ({student.admNo})
            </p>
          </div>

          {isViolation && (
            <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 text-left flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 leading-relaxed">
                <strong className="text-rose-300 block font-bold mb-1">
                  Tab Switch / Window Violation Detected
                </strong>
                The CBT proctor detected that you opened another browser tab or navigated away from this examination window. In accordance with examination credibility standards, your test paper was immediately locked and submitted with your current recorded answers.
              </div>
            </div>
          )}

          {/* Objective Score Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Objective Section (Auto-Graded)
            </div>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-4xl sm:text-5xl font-black text-yellow-400 font-mono">
                {submissionResult.objectiveScore}
              </span>
              <span className="text-slate-500 text-base font-semibold">
                / {submissionResult.totalPossiblePoints} pts
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              You answered {submissionResult.answeredCount} of {submissionResult.totalQuestions} objective questions.
            </div>
          </div>

          {/* Theory Section Status */}
          {payload.exam.hasTheory && (
            <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-4 text-left flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-yellow-400 block font-semibold mb-0.5">
                  Physical Theory Booklet
                </strong>
                Ensure your physical answer sheets have been submitted to the invigilator. Your teacher will evaluate your written solutions, and your total examination grade will be finalized on the report portal.
              </div>
            </div>
          )}

          <button
            onClick={() => {
              router.push("/cbt/dashboard");
              router.refresh();
            }}
            className="w-full py-3 px-5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Return to Examination Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Current Objective Question (Shuffled deterministically per candidate terminal)
  const displayObjectiveQuestions =
    shuffledObjectiveQuestions.length > 0
      ? shuffledObjectiveQuestions
      : (payload?.objectiveQuestions || []);
  const totalObj = displayObjectiveQuestions.length;
  const currentQ: ClientObjectiveQuestion | undefined = displayObjectiveQuestions[currentIndex];
  const currentSelectedAnswer = currentQ ? answers[currentQ.id] : undefined;
  const answeredCount = Object.keys(answers).length;
  const isTimeUrgent = timeLeftSeconds <= 300; // < 5 mins
  const isTimeWarning = timeLeftSeconds <= 600; // < 10 mins

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-yellow-500 selection:text-blue-950">
      {/* -------------------------------------------------------------------- */}
      {/* Top High-Stakes Exam Header Bar */}
      {/* -------------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 shadow-lg">
        {/* Left: Branding & Subject */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0">
            <Image
              src="/assets/images/school-logo.jpg"
              alt="GFMS"
              width={28}
              height={28}
              className="rounded-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs sm:text-sm text-white tracking-tight">
                {payload.exam.subject}
              </span>
              <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded bg-blue-900 text-yellow-300 font-bold">
                {payload.exam.targetClass}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block truncate max-w-xs">
              {payload.exam.title}
            </p>
          </div>
        </div>

        {/* Center-Left: Anti-Malpractice Badges */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-300 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Live Proctor Active</span>
          </div>
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-[10px] text-blue-300 font-bold"
            title="Questions are uniquely reshuffled for each student terminal to prevent peeking"
          >
            <Shuffle className="w-3.5 h-3.5 text-yellow-400" />
            <span>Shuffled Question Order Active</span>
          </div>
        </div>

        {/* Center: Tabs Switcher (Objective vs Theory) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("objective")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "objective"
                ? "bg-blue-700 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Section A (Obj)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/80 font-mono">
              {answeredCount}/{totalObj}
            </span>
          </button>

          {payload.exam.hasTheory && (
            <button
              onClick={() => setActiveTab("theory")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "theory"
                  ? "bg-yellow-500 text-slate-950 shadow font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Section B (Theory)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
                {payload.theoryQuestions.length}
              </span>
            </button>
          )}
        </div>

        {/* Right: Countdown Clock, Calculator & Submit Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* On-Screen Mini Calculator Toggle */}
          <button
            type="button"
            onClick={() => setIsCalculatorOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
              isCalculatorOpen
                ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow"
                : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-850"
            }`}
            title="Toggle On-Screen Scientific Calculator"
          >
            <CalcIcon className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden sm:inline">Calculator</span>
          </button>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-black text-xs sm:text-sm transition-colors ${
              isTimeUrgent
                ? "bg-rose-950/90 text-rose-300 border-rose-600 animate-pulse"
                : isTimeWarning
                ? "bg-yellow-950/80 text-yellow-300 border-yellow-600"
                : "bg-slate-950 text-emerald-400 border-slate-800"
            }`}
            title={`Allocated Time: ${payload.exam.durationMinutes} Minutes`}
          >
            <Clock className={`w-4 h-4 ${isTimeUrgent ? "text-rose-400 animate-spin" : "text-yellow-400"}`} />
            <span>{formatTime(timeLeftSeconds)}</span>
            <span className="hidden xl:inline text-[10px] font-sans font-semibold text-slate-400 pl-1 border-l border-slate-800">
              /{payload.exam.durationMinutes}m
            </span>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Submit Exam</span>
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* Active Tab Body */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {activeTab === "objective" ? (
          <>
            {/* Main Center Area: Question Viewer */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-4xl mx-auto w-full space-y-6">
              {/* Power-Off / Session Recovery Notification Banner */}
              {showRecoveryBanner && (
                <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-100 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-emerald-300">Power-Off Recovery Active:</strong> Welcome back! Your{" "}
                      <strong>{answeredCount} saved {answeredCount === 1 ? "answer" : "answers"}</strong>, question position, and remaining time (
                      <strong className="font-mono">{formatTime(timeLeftSeconds)}</strong>) have been safely restored.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryBanner(false)}
                    className="p-1 text-emerald-300 hover:text-white rounded-lg transition shrink-0"
                    title="Dismiss notice"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Anti-Cheating Credibility Reminder Banner */}
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-blue-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span>
                    <strong className="text-yellow-400">Credibility &amp; Auto-Recovery Protocol:</strong> Every answer and timer checkpoint is auto-saved to the server—if your PC goes off, log back in to continue where you stopped. Do not switch tabs.
                  </span>
                </div>
                <span className="hidden sm:inline-block text-[9px] uppercase font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                  {lastSyncedAt ? "Cloud Saved ✓" : "Auto-Save Armed"}
                </span>
              </div>

              {currentQ ? (
                <div className="space-y-6">
                  {/* Question Meta Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-yellow-400 bg-yellow-500/15 border border-yellow-500/30 px-2.5 py-1 rounded-lg">
                        Question {currentIndex + 1} of {totalObj}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({currentQ.points === 0.5 ? "1/2 mark" : `${currentQ.points} ${currentQ.points === 1 ? "mark" : "marks"}`})
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleFlag(currentQ.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg border transition ${
                        flagged[currentQ.id]
                          ? "bg-amber-950/80 text-amber-300 border-amber-600"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${flagged[currentQ.id] ? "fill-amber-400 text-amber-400" : ""}`} />
                      <span>{flagged[currentQ.id] ? "Flagged" : "Flag for Review"}</span>
                    </button>
                  </div>

                  {/* Question Prompt */}
                  <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-inner">
                    <div className="text-base sm:text-lg text-white font-medium leading-relaxed">
                      <FormattedMathText text={currentQ.questionText} />
                    </div>
                  </div>

                  {/* Question Diagram / Image (if question has an attached figure) */}
                  {currentQ.imageUrl && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-2 shadow-inner">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold flex items-center gap-1.5 text-yellow-400">
                          <ImageIcon className="w-4 h-4" />
                          <span>Question Diagram / Figure</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(currentQ.imageUrl || null)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 border border-slate-700"
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Tap to Enlarge</span>
                        </button>
                      </div>
                      <div
                        className="relative w-full max-h-80 sm:max-h-96 rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-pointer group"
                        onClick={() => setLightboxImageUrl(currentQ.imageUrl || null)}
                      >
                        <img
                          src={currentQ.imageUrl}
                          alt={`Diagram for Question ${currentIndex + 1}`}
                          className="max-h-80 sm:max-h-96 w-auto max-w-full object-contain rounded-lg group-hover:opacity-95 transition"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <span className="px-3 py-1.5 bg-slate-950/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xl border border-white/20">
                            <ZoomIn className="w-4 h-4 text-yellow-400" />
                            Click to View Full Size
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options List */}
                  <div className="space-y-3">
                    {["A", "B", "C", "D"].map((letter, idx) => {
                      const optionText = currentQ.options[idx] || `Option ${letter}`;
                      const isSelected = currentSelectedAnswer === letter;

                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => handleSelectOption(currentQ.id, letter)}
                          className={`w-full text-left p-4 rounded-xl border flex items-start gap-3.5 transition-all group ${
                            isSelected
                              ? "bg-blue-950/80 border-blue-500 text-white shadow-lg shadow-blue-900/30 ring-1 ring-blue-500"
                              : "bg-slate-900/60 border-slate-800/80 text-slate-200 hover:bg-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                              isSelected
                                ? "bg-yellow-500 text-slate-950 font-black shadow"
                                : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="text-sm sm:text-base font-normal pt-0.5 leading-snug">
                            <FormattedMathText text={optionText} />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation Toolbar */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                      disabled={currentIndex === 0}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl border border-slate-800 flex items-center gap-1.5 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    {currentSelectedAnswer && (
                      <button
                        onClick={() => handleClearAnswer(currentQ.id)}
                        className="text-xs text-slate-400 hover:text-rose-400 underline transition"
                      >
                        Clear Selection
                      </button>
                    )}

                    {currentIndex < totalObj - 1 ? (
                      <button
                        onClick={() => setCurrentIndex((i) => Math.min(totalObj - 1, i + 1))}
                        className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow border border-blue-500/40 flex items-center gap-1.5 transition"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsSubmitModalOpen(true)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition"
                      >
                        <span>Review & Submit</span>
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Keyboard Shortcuts & Auto-Save Status Bar */}
                  <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/40 border border-slate-800/60 rounded-xl px-3.5 py-2">
                    <div className="flex items-center gap-3">
                      <span>
                        <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono text-[10px]">A</kbd>
                        –
                        <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono text-[10px]">D</kbd>{" "}
                        Select Option
                      </span>
                      <span>
                        <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono text-[10px]">←</kbd>{" "}
                        <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono text-[10px]">→</kbd>{" "}
                        Navigate
                      </span>
                      <span>
                        <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono text-[10px]">F</kbd>{" "}
                        Flag
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400/90 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {lastSyncedAt ? "Progress synced to server & browser" : "Auto-saved to browser"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No objective questions found in this examination paper.
                </div>
              )}
            </main>

            {/* Sidebar: Question Navigation Palette */}
            <aside className="w-full md:w-72 lg:w-80 bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-yellow-400" />
                    Question Palette
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {answeredCount} of {totalObj} Answered
                  </span>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-600 shrink-0" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 shrink-0" />
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500 shrink-0" />
                    <span>Flagged</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-600 ring-2 ring-yellow-400 shrink-0" />
                    <span>Current</span>
                  </div>
                </div>

                {/* Numbers Grid */}
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2 pt-2">
                  {displayObjectiveQuestions.map((q, idx) => {
                    const isAnswered = !!answers[q.id];
                    const isFlagged = !!flagged[q.id];
                    const isCurrent = idx === currentIndex;

                    let bgStyle = "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white";

                    if (isCurrent) {
                      bgStyle = "bg-blue-700 text-white border-yellow-400 ring-2 ring-yellow-400/80 font-black shadow";
                    } else if (isFlagged) {
                      bgStyle = "bg-amber-600 text-slate-950 font-bold border-amber-500";
                    } else if (isAnswered) {
                      bgStyle = "bg-emerald-600 text-white font-bold border-emerald-500";
                    }

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-9 rounded-lg border text-xs font-mono transition-all flex items-center justify-center ${bgStyle}`}
                        title={`Go to Question ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress Summary Bar at bottom of sidebar */}
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span>Completion Rate</span>
                  <span className="font-bold text-white">
                    {totalObj > 0 ? Math.round((answeredCount / totalObj) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${totalObj > 0 ? (answeredCount / totalObj) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </aside>
          </>
        ) : (
          /* ------------------------------------------------------------------ */
          /* Section B: Theory Section (Read-Only prompts, unmissable banner) */
          /* ------------------------------------------------------------------ */
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-4xl mx-auto w-full space-y-6">
            {/* UNMISSABLE PHYSICAL BOOKLET WARNING BANNER */}
            <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 border-2 border-yellow-400 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg font-black text-xl">
                  ✍️
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-yellow-300 tracking-tight uppercase">
                    Physical Answer Booklet Required
                  </h3>
                  <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
                    Write all theory answers on your physical answer booklet. No typing required.
                  </p>
                  <p className="text-[11px] text-blue-200">
                    Your written sheets will be physically marked by your course instructor. Write your candidate name, admission number, and class clearly on the top of each page.
                  </p>
                </div>
              </div>
            </div>

            {/* Theory Questions List */}
            {payload.theoryQuestions.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No theory questions assigned to this examination paper.
              </div>
            ) : (
              <div className="space-y-6">
                {payload.theoryQuestions.map((tq, idx) => (
                  <div
                    key={tq.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-black uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-md">
                        Theory Question {tq.questionNum || idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md">
                        {tq.maxScore} Marks
                      </span>
                    </div>

                    {tq.instructions && (
                      <div className="text-xs font-semibold text-blue-300 bg-blue-950/40 p-2.5 rounded-lg border border-blue-900/60">
                        <strong>Instructions:</strong> {tq.instructions}
                      </div>
                    )}

                    <div className="text-base text-white leading-relaxed font-medium">
                      <FormattedMathText text={tq.questionText} />
                    </div>

                    {/* Theory Question Diagram / Image */}
                    {tq.imageUrl && (
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-bold flex items-center gap-1.5 text-yellow-400">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Theory Diagram / Figure</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setLightboxImageUrl(tq.imageUrl || null)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 border border-slate-700"
                          >
                            <ZoomIn className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Enlarge</span>
                          </button>
                        </div>
                        <div
                          className="relative w-full max-h-72 rounded-lg overflow-hidden bg-black flex items-center justify-center cursor-pointer group"
                          onClick={() => setLightboxImageUrl(tq.imageUrl || null)}
                        >
                          <img
                            src={tq.imageUrl}
                            alt={`Diagram for Theory Question ${tq.questionNum || idx + 1}`}
                            className="max-h-72 w-auto max-w-full object-contain rounded group-hover:opacity-95 transition"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2 text-[11px] text-slate-500 italic flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/80" />
                      Answer this question on your physical answer paper.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Submission Confirmation Modal */}
      {/* -------------------------------------------------------------------- */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-white">
                Submit Examination Paper?
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Please confirm your submission. Once submitted, your objective answers are final and will be graded immediately.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Answered</div>
                <div className="text-lg font-black text-emerald-400">{answeredCount}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Unanswered</div>
                <div className="text-lg font-black text-rose-400">
                  {Math.max(0, totalObj - answeredCount)}
                </div>
              </div>
            </div>

            {totalObj - answeredCount > 0 && (
              <div className="text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You have unanswered questions remaining.</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="w-1/2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                Return to Test
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => executeSubmission("manual")}
                className="w-1/2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Grading...</span>
                  </>
                ) : (
                  <span>Yes, Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Tab Switch Warning Modal (Strictly 3 Strikes Allowed) */}
      {showViolationWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`bg-slate-900 border-2 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 text-center ${
            tabViolationStrikes === 2 ? "border-rose-500" : "border-amber-500"
          }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
              tabViolationStrikes === 2 ? "bg-rose-500/20 text-rose-400 animate-pulse" : "bg-amber-500/20 text-amber-400"
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                tabViolationStrikes === 1
                  ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  : "text-rose-400 bg-rose-500/10 border-rose-500/20 font-black animate-pulse"
              }`}>
                Proctor Alert &bull; Strike {tabViolationStrikes} of 3 {tabViolationStrikes === 2 ? "(FINAL WARNING)" : ""}
              </span>
              <h3 className="text-lg font-black text-white pt-1">
                {tabViolationStrikes === 2 ? "Final Warning: 1 Strike Left!" : "Tab Navigation Warning"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {tabViolationStrikes === 1 ? (
                  <>
                    You navigated away from the exam terminal or minimized the window. You have <strong className="text-amber-400 font-bold">2 warnings remaining</strong> before your examination paper is locked and submitted.
                  </>
                ) : (
                  <>
                    <strong className="text-rose-400 font-black">CRITICAL NOTICE:</strong> This is your second proctoring infraction. Switching tabs, opening secondary windows, or navigating away <strong className="text-rose-400 font-bold">a 3rd time will automatically submit your exam paper</strong> immediately.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowViolationWarningModal(false)}
              className={`w-full py-3 px-4 text-xs font-black rounded-xl transition shadow-lg ${
                tabViolationStrikes === 2
                  ? "bg-rose-500 hover:bg-rose-400 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
              }`}
            >
              I Understand &mdash; Return to Exam Paper
            </button>
          </div>
        </div>
      )}

      {/* Submission Retry & Heavy-Load Resilience Modal */}
      {submissionError && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Answers 100% Preserved Offline
              </span>
              <h3 className="text-lg font-black text-white pt-1">
                Server Traffic Congestion
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {submissionError}
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => executeSubmission("manual")}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting Final Paper...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Retry Final Submission Now</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSubmissionError(null)}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition"
              >
                Dismiss & Review Answers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-3 py-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-yellow-400" />
                Examination Diagram / Figure (High-Resolution View)
              </span>
              <button
                type="button"
                onClick={() => setLightboxImageUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center max-h-[80vh]">
              <img
                src={lightboxImageUrl}
                alt="Fullscreen Diagram"
                className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Mini Calculator Quick Launcher (Bottom Right) */}
      {!isCalculatorOpen && (
        <button
          type="button"
          onClick={() => setIsCalculatorOpen(true)}
          className="fixed bottom-5 right-5 z-40 p-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-full shadow-2xl border border-blue-400/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
          title="Open CBT Calculator"
        >
          <CalcIcon className="w-5 h-5 text-yellow-300 group-hover:rotate-12 transition-transform" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-xs font-bold pl-0 group-hover:pl-2 whitespace-nowrap">
            Calculator
          </span>
        </button>
      )}

      {/* CBT Mini Calculator Window */}
      <CbtMiniCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}

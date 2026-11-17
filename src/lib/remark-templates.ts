export type RemarkBadgeColor = "emerald" | "blue" | "cyan" | "amber" | "rose";

export interface PerformanceRemarkTemplateTier {
  id: string;
  label: string;
  minScore: number;
  maxScore: number;
  teacherRemark: string;
  principalRemark: string;
  badgeColor?: RemarkBadgeColor;
}

export const REMARK_TEMPLATES_STORAGE_KEY = "gfms_performance_remark_templates";

export const DEFAULT_REMARK_TEMPLATES: PerformanceRemarkTemplateTier[] = [
  {
    id: "excellent",
    label: "Excellent Result",
    minScore: 75,
    maxScore: 100,
    teacherRemark:
      "An exceptionally diligent scholar with commendable character and outstanding academic mastery.",
    principalRemark:
      "Excellent result! Distinguished performance—keep soaring higher.",
    badgeColor: "emerald",
  },
  {
    id: "very_good",
    label: "Very Good",
    minScore: 65,
    maxScore: 74,
    teacherRemark:
      "A very good performance demonstrating consistent effort and strong understanding across subjects.",
    principalRemark:
      "Very good result. Maintain this focus and aim for distinction next term.",
    badgeColor: "blue",
  },
  {
    id: "good",
    label: "Good",
    minScore: 55,
    maxScore: 64,
    teacherRemark:
      "Good academic progress shown this term. With sustained effort, even higher distinction is within reach.",
    principalRemark:
      "Good result overall. Stay consistent with daily study habits to climb into the top bracket.",
    badgeColor: "cyan",
  },
  {
    id: "fair",
    label: "Fair",
    minScore: 45,
    maxScore: 54,
    teacherRemark:
      "Fair academic performance. Encouraged to revise core concepts more consistently and stay attentive in class.",
    principalRemark:
      "Fair result. Greater dedication and structured study will yield stronger academic outcomes.",
    badgeColor: "amber",
  },
  {
    id: "pass",
    label: "Pass",
    minScore: 0,
    maxScore: 44,
    teacherRemark:
      "Pass attainment recorded. Needs stronger daily focus, extra guided practice, and closer academic monitoring.",
    principalRemark:
      "Pass result. Satisfactory minimum reached, but substantial extra effort is advised next term.",
    badgeColor: "rose",
  },
];

const VALID_COLORS = new Set<RemarkBadgeColor>(["emerald", "blue", "cyan", "amber", "rose"]);

/**
 * Validates, clamps (0-100), and orders custom or persisted remark template tiers
 * cleanly from highest performance band down to lowest.
 */
export function normalizeRemarkTemplates(
  input: unknown
): PerformanceRemarkTemplateTier[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_REMARK_TEMPLATES.map((t) => ({ ...t }));
  }

  const normalized: PerformanceRemarkTemplateTier[] = [];
  input.forEach((raw: any, idx: number) => {
    if (!raw || typeof raw !== "object") return;
    const minRaw = Number(raw.minScore);
    const maxRaw = Number(raw.maxScore);
    const minScore = Number.isFinite(minRaw) ? Math.max(0, Math.min(100, Math.round(minRaw))) : 0;
    const maxScore = Number.isFinite(maxRaw)
      ? Math.max(minScore, Math.min(100, Math.round(maxRaw)))
      : 100;

    const label = String(raw.label || "").trim() || `Tier ${idx + 1}`;
    const teacherRemark = String(raw.teacherRemark || "").trim();
    const principalRemark = String(raw.principalRemark || "").trim();
    if (!teacherRemark && !principalRemark) return;

    const fallbackDefault =
      DEFAULT_REMARK_TEMPLATES.find((d) => d.id === raw.id) || DEFAULT_REMARK_TEMPLATES[Math.min(idx, DEFAULT_REMARK_TEMPLATES.length - 1)];

    const badgeColor: RemarkBadgeColor = VALID_COLORS.has(raw.badgeColor)
      ? raw.badgeColor
      : fallbackDefault?.badgeColor || "blue";

    normalized.push({
      id: String(raw.id || `remark-tier-${idx + 1}`).trim() || `remark-tier-${idx + 1}`,
      label,
      minScore,
      maxScore,
      teacherRemark: teacherRemark || fallbackDefault?.teacherRemark || "",
      principalRemark: principalRemark || fallbackDefault?.principalRemark || "",
      badgeColor,
    });
  });

  if (normalized.length === 0) {
    return DEFAULT_REMARK_TEMPLATES.map((t) => ({ ...t }));
  }

  return normalized.sort((a, b) => b.minScore - a.minScore || b.maxScore - a.maxScore);
}

/**
 * Replaces optional dynamic tokens ({name}, {firstName}, {average}, {class})
 * inside template remarks when student context is provided.
 */
export function formatRemarkTemplateText(
  templateText: string,
  context?: {
    studentName?: string;
    average?: number;
    className?: string;
  }
): string {
  let out = String(templateText || "");
  if (!context) return out;

  const fullName = (context.studentName || "").trim();
  const firstName = fullName.split(/\s+/)[0] || "";
  const avgStr =
    context.average !== undefined && Number.isFinite(context.average)
      ? String(Number(context.average.toFixed(1)))
      : "";
  const cls = (context.className || "").trim();

  if (fullName) {
    out = out.replace(/\{name\}/gi, fullName);
  }
  if (firstName) {
    out = out.replace(/\{firstName\}/gi, firstName);
  }
  if (avgStr) {
    out = out.replace(/\{average\}/gi, avgStr);
  }
  if (cls) {
    out = out.replace(/\{class\}/gi, cls);
  }

  return out;
}

/**
 * Matches a student's overall performance average (%) to the corresponding remark template
 * and returns formatted Teacher and Principal remarks.
 */
export function resolvePerformanceRemark(
  average: number,
  templates: PerformanceRemarkTemplateTier[] = DEFAULT_REMARK_TEMPLATES,
  context?: {
    studentName?: string;
    className?: string;
  }
): {
  tier: PerformanceRemarkTemplateTier;
  teacherRemark: string;
  principalRemark: string;
} {
  const ordered = normalizeRemarkTemplates(templates);
  const rawAvg = Number.isFinite(Number(average)) ? Number(average) : 0;
  const clampedAvg = Math.max(0, Math.min(100, rawAvg));
  const roundedScore = Math.round(clampedAvg);

  let matched = ordered.find(
    (t) => roundedScore >= Number(t.minScore) && roundedScore <= Number(t.maxScore)
  );

  if (!matched) {
    matched = ordered.find((t) => roundedScore >= Number(t.minScore));
  }

  if (!matched) {
    matched = ordered[ordered.length - 1];
  }

  const fmtContext = {
    studentName: context?.studentName,
    average: clampedAvg,
    className: context?.className,
  };

  return {
    tier: matched,
    teacherRemark: formatRemarkTemplateText(matched.teacherRemark, fmtContext),
    principalRemark: formatRemarkTemplateText(matched.principalRemark, fmtContext),
  };
}

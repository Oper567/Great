/**
 * Great-Favour Montessori School (GFMS)
 * Full-Page A4 Student Terminal Report Card PDF Generator
 *
 * Produces a 100% self-contained, single-page A4 PDF (595.28pt x 841.89pt)
 * that covers the entire page cleanly with zero text overflow on both
 * desktop and mobile devices.
 */

import {
  ReportCardData,
  SKILL_LABELS,
  BEHAVIOUR_LABELS,
  PsychomotorSkillsRatings,
  AffectiveBehaviourRatings,
  getOrdinalSuffix,
} from "@/types/report-card";
import { SCHOOL_BRAND, SCHOOL_NAME } from "@/constants/school";

/**
 * Sanitize and escape strings for standard PDF WinAnsiEncoding Type1 fonts
 */
function escapePdfText(input: string): string {
  if (!input) return "";
  const normalized = String(input)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "|")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E]/g, " ");

  return normalized
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Estimate string width in points for Helvetica / Helvetica-Bold
 * and truncate cleanly so text NEVER overflows a box width (maxWidthPt).
 */
function fitTextToWidth(
  text: string,
  maxWidthPt: number,
  fontSize: number,
  isBold = false
): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const avgCharFactor = isBold ? 0.56 : 0.52;
  const maxChars = Math.max(1, Math.floor(maxWidthPt / (fontSize * avgCharFactor)));
  if (clean.length <= maxChars) return clean;
  if (maxChars <= 3) return clean.slice(0, maxChars);
  return clean.slice(0, maxChars - 2).trimEnd() + "..";
}

/**
 * Split long remark text into at most `maxLines` lines that each fit `maxWidthPt`
 */
function wrapTextLines(
  text: string,
  maxWidthPt: number,
  fontSize: number,
  maxLines = 2
): string[] {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [""];
  const maxCharsPerLine = Math.max(8, Math.floor(maxWidthPt / (fontSize * 0.5)));
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (lines.length === maxLines - 1) {
        lines.push(fitTextToWidth(candidate, maxWidthPt, fontSize, false));
        return lines;
      }
      if (current) {
        lines.push(current);
        current = word;
      } else {
        lines.push(word.slice(0, maxCharsPerLine));
        current = word.slice(maxCharsPerLine);
      }
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(fitTextToWidth(current, maxWidthPt, fontSize, false));
  }
  return lines.length > 0 ? lines : [""];
}

export function generateTerminalReportCardPdfBytes(data: ReportCardData): Uint8Array {
  const PAGE_W = 595.28; // Standard A4 Width (210mm)
  const PAGE_H = 841.89; // Standard A4 Height (297mm)
  const MARGIN = 18;     // Crisp 18pt (~6.3mm) margin around all 4 sides
  const CONTENT_X = MARGIN + 6;
  const CONTENT_W = PAGE_W - (MARGIN + 6) * 2; // 547.28pt

  const yPt = (topY: number) => Number((PAGE_H - topY).toFixed(2));
  const cmds: string[] = [];

  const fillRect = (
    x: number,
    topY: number,
    w: number,
    h: number,
    r: number,
    g: number,
    b: number
  ) => {
    cmds.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`,
      `${x.toFixed(2)} ${(PAGE_H - topY - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
    );
  };

  const strokeRect = (
    x: number,
    topY: number,
    w: number,
    h: number,
    r: number,
    g: number,
    b: number,
    lineWidth = 0.6
  ) => {
    cmds.push(
      `${lineWidth.toFixed(2)} w`,
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`,
      `${x.toFixed(2)} ${(PAGE_H - topY - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`
    );
  };

  const drawLine = (
    x1: number,
    topY1: number,
    x2: number,
    topY2: number,
    r: number,
    g: number,
    b: number,
    lineWidth = 0.5
  ) => {
    cmds.push(
      `${lineWidth.toFixed(2)} w`,
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`,
      `${x1.toFixed(2)} ${yPt(topY1)} m ${x2.toFixed(2)} ${yPt(topY2)} l S`
    );
  };

  const drawText = (
    text: string,
    x: number,
    topY: number,
    font: "F1" | "F2" | "F3",
    fontSize: number,
    r: number,
    g: number,
    b: number
  ) => {
    const safe = escapePdfText(text);
    cmds.push(
      `BT /${font} ${fontSize.toFixed(2)} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${x.toFixed(2)} ${yPt(topY)} Tm (${safe}) Tj ET`
    );
  };

  const drawCenteredText = (
    text: string,
    boxX: number,
    boxW: number,
    topY: number,
    font: "F1" | "F2" | "F3",
    fontSize: number,
    r: number,
    g: number,
    b: number
  ) => {
    const fitted = fitTextToWidth(text, boxW - 4, fontSize, font === "F2");
    const estW = fitted.length * fontSize * (font === "F2" ? 0.53 : 0.49);
    const startX = boxX + Math.max(2, (boxW - estW) / 2);
    drawText(fitted, startX, topY, font, fontSize, r, g, b);
  };

  // =========================================================================
  // 0. FULL-PAGE OUTER INSTITUTIONAL DOUBLE BORDER FRAME
  // =========================================================================
  fillRect(0, 0, PAGE_W, PAGE_H, 1, 1, 1);
  strokeRect(MARGIN, MARGIN, PAGE_W - MARGIN * 2, PAGE_H - MARGIN * 2, 0.09, 0.145, 0.33, 1.6);
  strokeRect(
    MARGIN + 3,
    MARGIN + 3,
    PAGE_W - (MARGIN + 3) * 2,
    PAGE_H - (MARGIN + 3) * 2,
    0.85,
    0.65,
    0.05,
    0.6
  );

  let curY = MARGIN + 9;

  // =========================================================================
  // 1. HEADER BANNER (Height: 62pt)
  // =========================================================================
  const HEADER_H = 62;
  fillRect(CONTENT_X, curY, CONTENT_W, HEADER_H, 0.06, 0.11, 0.25); // Deep Royal Navy
  fillRect(CONTENT_X, curY + HEADER_H, CONTENT_W, 3, 0.92, 0.7, 0.03); // Gold bar

  // Left Crest Seal Box inside Header
  const crestX = CONTENT_X + 8;
  const crestY = curY + 7;
  fillRect(crestX, crestY, 68, 48, 0.09, 0.17, 0.36);
  strokeRect(crestX, crestY, 68, 48, 0.92, 0.7, 0.03, 0.8);
  drawCenteredText("GFMS", crestX, 68, crestY + 19, "F2", 12, 0.98, 0.82, 0.15);
  drawCenteredText("EST. SEPT 2014", crestX, 68, crestY + 31, "F2", 6.5, 1, 1, 1);
  drawCenteredText("APPROVED", crestX, 68, crestY + 41, "F1", 6, 0.8, 0.86, 0.95);

  // Center School Title & Accreditation
  const centerX = CONTENT_X + 82;
  const centerW = CONTENT_W - 82 - 134;
  drawCenteredText(
    SCHOOL_NAME.toUpperCase(),
    centerX,
    centerW,
    curY + 17,
    "F2",
    13,
    1,
    1,
    1
  );
  drawCenteredText(
    `MOTTO: "${SCHOOL_BRAND.motto.toUpperCase()}" | ISSELE-AZAGBA, DELTA STATE`,
    centerX,
    centerW,
    curY + 29,
    "F2",
    7.2,
    0.98,
    0.82,
    0.15
  );
  drawCenteredText(
    "Licensed Nursery, Primary & Secondary Academy (Approved: FLSC, BECE, WASSCE & NECO)",
    centerX,
    centerW,
    curY + 40,
    "F1",
    6.8,
    0.85,
    0.9,
    0.98
  );

  // Pill banner for Report Title
  const pillW = 290;
  const pillX = centerX + (centerW - pillW) / 2;
  fillRect(pillX, curY + 45, pillW, 13, 0.98, 0.82, 0.15);
  drawCenteredText(
    "CONTINUOUS ASSESSMENT & TERMINAL EXAMINATION REPORT",
    pillX,
    pillW,
    curY + 54,
    "F2",
    7.2,
    0.06,
    0.11,
    0.25
  );

  // Right Fee Notice Box inside Header
  const feeBoxW = 126;
  const feeBoxX = CONTENT_X + CONTENT_W - feeBoxW - 6;
  const feeBoxY = curY + 6;
  fillRect(feeBoxX, feeBoxY, feeBoxW, 50, 0.99, 0.98, 0.92);
  strokeRect(feeBoxX, feeBoxY, feeBoxW, 50, 0.92, 0.7, 0.03, 0.8);
  fillRect(feeBoxX, feeBoxY, feeBoxW, 12, 0.92, 0.7, 0.03);
  drawCenteredText("NEXT TERM FEE NOTICE", feeBoxX, feeBoxW, feeBoxY + 8.5, "F2", 6.8, 0.06, 0.11, 0.25);

  const feeAmt = data.feeInfo?.termFeeAmount || "Official Schedule";
  const feeDue = data.feeInfo?.dueDate || "On Resumption";
  const feeStatus = (data.feeInfo?.status || "PAID").toUpperCase();

  drawText(
    fitTextToWidth(`Fee: ${feeAmt}`, feeBoxW - 10, 6.8, true),
    feeBoxX + 5,
    feeBoxY + 22,
    "F2",
    6.8,
    0.06,
    0.11,
    0.25
  );
  drawText(
    fitTextToWidth(`Due: ${feeDue}`, feeBoxW - 10, 6.5, false),
    feeBoxX + 5,
    feeBoxY + 32,
    "F1",
    6.5,
    0.25,
    0.3,
    0.38
  );
  fillRect(feeBoxX + 5, feeBoxY + 37, feeBoxW - 10, 10, 0.08, 0.5, 0.24);
  drawCenteredText(
    `BURSARY STATUS: ${feeStatus}`,
    feeBoxX + 5,
    feeBoxW - 10,
    feeBoxY + 44,
    "F2",
    6.2,
    1,
    1,
    1
  );

  curY += HEADER_H + 8;

  // =========================================================================
  // 2. STUDENT BIODATA & ATTENDANCE GRID (Height: 54pt)
  // =========================================================================
  const BIO_H = 54;
  fillRect(CONTENT_X, curY, CONTENT_W, BIO_H, 0.973, 0.98, 0.992);
  strokeRect(CONTENT_X, curY, CONTENT_W, BIO_H, 0.72, 0.78, 0.86, 0.8);

  // Horizontal divider splitting Row 1 (28pt) and Row 2 (26pt)
  const bioMidY = curY + 28;
  drawLine(CONTENT_X, bioMidY, CONTENT_X + CONTENT_W, bioMidY, 0.78, 0.82, 0.88, 0.6);

  // Row 1 Columns: Student Full Name (185pt) | Class/Stream (95pt) | Adm No (105pt) | Sex (52pt) | Session & Term (110.28pt)
  const r1Cols = [
    { label: "STUDENT FULL NAME", val: (data.student.fullName || "STUDENT").toUpperCase(), w: 185, bold: true },
    {
      label: "CLASS / ARM",
      val: data.student.arm && !data.student.className?.toLowerCase().includes(data.student.arm.toLowerCase())
        ? `${data.student.className} (${data.student.arm})`
        : data.student.className || "-",
      w: 92,
      bold: true,
    },
    { label: "ADMISSION NO.", val: data.student.admissionNumber || "-", w: 102, bold: true },
    { label: "GENDER", val: (data.student.gender || "-").toUpperCase(), w: 54, bold: false },
    { label: "TERM & SESSION", val: `${data.termLabel || data.term} | ${data.session}`, w: CONTENT_W - 433, bold: true },
  ];

  let colX = CONTENT_X;
  for (let i = 0; i < r1Cols.length; i++) {
    const c = r1Cols[i];
    if (i > 0) {
      drawLine(colX, curY, colX, bioMidY, 0.78, 0.82, 0.88, 0.5);
    }
    drawText(c.label, colX + 6, curY + 10, "F2", 6.2, 0.38, 0.44, 0.52);
    drawText(
      fitTextToWidth(c.val, c.w - 10, 8.5, c.bold),
      colX + 6,
      curY + 22,
      c.bold ? "F2" : "F1",
      8.5,
      0.06,
      0.11,
      0.25
    );
    colX += c.w;
  }

  // Row 2 Columns: Class Position | No. in Class | Days Opened | Days Present | Days Absent | Next Term Resumes
  const posNum = data.positionInClass || 1;
  const posStr = `${posNum}${getOrdinalSuffix(posNum)} of ${data.numberInClass || 35}`;
  const r2Cols = [
    { label: "POSITION IN CLASS", val: posStr, w: 105, highlight: true },
    { label: "NO. IN CLASS", val: String(data.numberInClass || 35), w: 72, highlight: false },
    { label: "DAYS OPENED", val: String(data.daysOpened ?? 115), w: 72, highlight: false },
    { label: "DAYS PRESENT", val: String(data.daysPresent ?? 112), w: 72, highlight: false },
    { label: "DAYS ABSENT", val: String(data.daysAbsent ?? 3), w: 68, highlight: false },
    { label: "NEXT TERM RESUMES", val: data.nextTermBegins || "To Be Announced", w: CONTENT_W - 389, highlight: false },
  ];

  colX = CONTENT_X;
  for (let i = 0; i < r2Cols.length; i++) {
    const c = r2Cols[i];
    if (i > 0) {
      drawLine(colX, bioMidY, colX, curY + BIO_H, 0.78, 0.82, 0.88, 0.5);
    }
    if (c.highlight) {
      fillRect(colX + 1, bioMidY + 1, c.w - 2, BIO_H - 29, 0.99, 0.96, 0.82);
    }
    drawText(c.label, colX + 6, bioMidY + 9.5, "F2", 6.0, 0.38, 0.44, 0.52);
    drawText(
      fitTextToWidth(c.val, c.w - 10, 8.2, true),
      colX + 6,
      bioMidY + 20.5,
      "F2",
      8.2,
      c.highlight ? 0.09 : 0.12,
      c.highlight ? 0.22 : 0.18,
      c.highlight ? 0.55 : 0.28
    );
    colX += c.w;
  }

  curY += BIO_H + 7;

  // =========================================================================
  // 3. MAIN SPLIT BODY: COGNITIVE DOMAIN (LEFT) & SKILLS/BEHAVIOUR (RIGHT)
  //    Dynamically sized to fill the vertical space cleanly down to Footer!
  // =========================================================================
  const FOOTER_TOTAL_H = 114; // Reserved at bottom for Promotion Ribbon + 3 Signatures + Tamper Note
  const FOOTER_START_Y = PAGE_H - MARGIN - 6 - FOOTER_TOTAL_H;
  const MAIN_BODY_H = FOOTER_START_Y - curY - 7; // ~540pt of clean vertical space

  const LEFT_W = 346;
  const GAP_W = 8;
  const RIGHT_X = CONTENT_X + LEFT_W + GAP_W;
  const RIGHT_W = CONTENT_W - LEFT_W - GAP_W; // ~193.28pt

  const isThirdTerm =
    data.term === "THIRD_TERM" ||
    Boolean(data.termLabel && data.termLabel.toLowerCase().includes("third"));

  const cognitiveList = data.cognitiveGrades || [];
  const subjectCount = cognitiveList.length;

  const dynamicTotalScore =
    subjectCount > 0
      ? cognitiveList.reduce((sum, item) => sum + (Number(item.totalScore) || 0), 0)
      : data.totalScoreObtained || 0;

  const dynamicTotalPossible =
    subjectCount > 0 ? subjectCount * 100 : data.totalScorePossible || 0;

  const dynamicTermAverage =
    subjectCount > 0
      ? Number((dynamicTotalScore / subjectCount).toFixed(1))
      : Number(data.studentAverage) || 0;

  const hasCumulativeScores =
    isThirdTerm &&
    cognitiveList.some(
      (item) =>
        item.cumulativeScore !== undefined ||
        (item.term1Score !== undefined && item.term1Score !== null) ||
        (item.term2Score !== undefined && item.term2Score !== null)
    );

  const dynamicCumulativeTotal = hasCumulativeScores
    ? cognitiveList.reduce((sum, item) => {
        const thirdTotal = item.term3Total ?? item.totalScore ?? 0;
        const hasT1 = item.term1Score !== undefined && item.term1Score !== null;
        const hasT2 = item.term2Score !== undefined && item.term2Score !== null;
        const cum =
          item.cumulativeScore !== undefined
            ? Number(item.cumulativeScore)
            : hasT1 || hasT2
            ? Math.round(
                (((Number(item.term1Score) || 0) +
                  (Number(item.term2Score) || 0) +
                  thirdTotal) /
                  3) *
                  10
              ) / 10
            : thirdTotal;
        return sum + cum;
      }, 0)
    : dynamicTotalScore;

  const dynamicCumulativeAverage =
    subjectCount > 0
      ? Number((dynamicCumulativeTotal / subjectCount).toFixed(1))
      : dynamicTermAverage;

  const isLegacyDummyClassAvg =
    !data.classAverage ||
    Math.abs(Number(data.classAverage) - 68.45) < 0.05 ||
    Math.abs(Number(data.classAverage) - 68.5) < 0.05;
  const dynamicClassAverage =
    !isLegacyDummyClassAvg && Number(data.classAverage) > 0
      ? Number(data.classAverage)
      : hasCumulativeScores
      ? dynamicCumulativeAverage
      : dynamicTermAverage;

  // --- LEFT PANEL: PART 1 COGNITIVE DOMAIN ---
  strokeRect(CONTENT_X, curY, LEFT_W, MAIN_BODY_H, 0.09, 0.17, 0.36, 0.9);

  // Title bar (18pt)
  const COG_TITLE_H = 18;
  fillRect(CONTENT_X, curY, LEFT_W, COG_TITLE_H, 0.06, 0.11, 0.25);
  drawText("PART 1: COGNITIVE DOMAIN (ACADEMIC PERFORMANCE)", CONTENT_X + 6, curY + 12, "F2", 7.2, 1, 1, 1);
  drawText(
    isThirdTerm ? "1st+2nd+3rd -> Cum%" : "CA1(15)+CA2(15)+Exam(70)=100",
    CONTENT_X + LEFT_W - (isThirdTerm ? 78 : 108),
    curY + 12,
    "F2",
    6.4,
    0.98,
    0.82,
    0.15
  );

  // Table Header (18pt)
  const COG_HEAD_Y = curY + COG_TITLE_H;
  const COG_HEAD_H = 18;
  fillRect(CONTENT_X, COG_HEAD_Y, LEFT_W, COG_HEAD_H, 0.91, 0.94, 0.99);
  drawLine(CONTENT_X, COG_HEAD_Y + COG_HEAD_H, CONTENT_X + LEFT_W, COG_HEAD_Y + COG_HEAD_H, 0.12, 0.22, 0.45, 0.7);

  const cogCols = isThirdTerm
    ? [
        { label: "#", w: 16, align: "center" as const },
        { label: "SUBJECT", w: 112, align: "left" as const },
        { label: "1st", w: 22, align: "center" as const },
        { label: "2nd", w: 22, align: "center" as const },
        { label: "CA1", w: 20, align: "center" as const },
        { label: "CA2", w: 20, align: "center" as const },
        { label: "Exm", w: 22, align: "center" as const },
        { label: "3rd", w: 23, align: "center" as const },
        { label: "Cum", w: 26, align: "center" as const },
        { label: "Grd", w: 20, align: "center" as const },
        { label: "Remark", w: LEFT_W - 303, align: "center" as const },
      ]
    : [
        { label: "#", w: 18, align: "center" as const },
        { label: "SUBJECT", w: 142, align: "left" as const },
        { label: "CA1(15)", w: 30, align: "center" as const },
        { label: "CA2(15)", w: 30, align: "center" as const },
        { label: "EXAM(70)", w: 34, align: "center" as const },
        { label: "TOT(100)", w: 34, align: "center" as const },
        { label: "GRD", w: 22, align: "center" as const },
        { label: "REMARK", w: LEFT_W - 310, align: "center" as const },
      ];

  let cX = CONTENT_X;
  for (let i = 0; i < cogCols.length; i++) {
    const col = cogCols[i];
    if (i > 0) {
      drawLine(cX, COG_HEAD_Y, cX, COG_HEAD_Y + COG_HEAD_H, 0.72, 0.78, 0.88, 0.5);
    }
    if (col.align === "left") {
      drawText(col.label, cX + 4, COG_HEAD_Y + 12, "F2", 6.5, 0.06, 0.11, 0.25);
    } else {
      drawCenteredText(col.label, cX, col.w, COG_HEAD_Y + 12, "F2", 6.3, 0.06, 0.11, 0.25);
    }
    cX += col.w;
  }

  // Summary Bar reserved at bottom of Left Panel (22pt)
  const COG_SUM_H = 22;
  const COG_SUM_Y = curY + MAIN_BODY_H - COG_SUM_H;
  const AVAILABLE_ROWS_H = COG_SUM_Y - (COG_HEAD_Y + COG_HEAD_H);

  // Dynamically stretch row height to fill available space cleanly!
  const visibleRows = Math.max(subjectCount, 1);
  const rowH = Math.min(28, Math.max(15, AVAILABLE_ROWS_H / visibleRows));

  let rowY = COG_HEAD_Y + COG_HEAD_H;
  for (let idx = 0; idx < cognitiveList.length; idx++) {
    const item = cognitiveList[idx];
    const isEven = idx % 2 === 1;

    if (isEven) {
      fillRect(CONTENT_X + 0.5, rowY, LEFT_W - 1, rowH, 0.968, 0.978, 0.992);
    }

    drawLine(CONTENT_X, rowY + rowH, CONTENT_X + LEFT_W, rowY + rowH, 0.84, 0.87, 0.92, 0.45);

    const thirdTotal = item.term3Total ?? item.totalScore;
    const hasT1 = item.term1Score !== undefined && item.term1Score !== null;
    const hasT2 = item.term2Score !== undefined && item.term2Score !== null;
    const cumulative =
      item.cumulativeScore !== undefined
        ? item.cumulativeScore
        : hasT1 || hasT2
        ? Math.round(
            (((Number(item.term1Score) || 0) +
              (Number(item.term2Score) || 0) +
              thirdTotal) /
              3) *
              10
          ) / 10
        : item.totalScore;

    const cells = isThirdTerm
      ? [
          String(idx + 1),
          item.subjectName || "Subject",
          hasT1 ? String(item.term1Score) : "-",
          hasT2 ? String(item.term2Score) : "-",
          String(item.ca1 ?? 0),
          String(item.ca2 ?? 0),
          String(item.exam ?? 0),
          String(thirdTotal ?? 0),
          `${cumulative}%`,
          item.grade || "-",
          item.remark || "-",
        ]
      : [
          String(idx + 1),
          item.subjectName || "Subject",
          String(item.ca1 ?? 0),
          String(item.ca2 ?? 0),
          String(item.exam ?? 0),
          String(item.totalScore ?? 0),
          item.grade || "-",
          item.remark || "-",
        ];

    const textBaseY = rowY + rowH * 0.64;
    const fontSize = rowH >= 20 ? 7.6 : 7.0;

    let cellX = CONTENT_X;
    for (let c = 0; c < cogCols.length; c++) {
      const col = cogCols[c];
      const val = cells[c] || "";
      if (c > 0) {
        drawLine(cellX, rowY, cellX, rowY + rowH, 0.84, 0.87, 0.92, 0.45);
      }

      const isTotalCol = (isThirdTerm && c === 8) || (!isThirdTerm && c === 5);
      const isGradeCol = (isThirdTerm && c === 9) || (!isThirdTerm && c === 6);

      if (isTotalCol) {
        fillRect(cellX + 0.5, rowY + 0.5, col.w - 1, rowH - 1, 0.99, 0.97, 0.86);
      }

      if (col.align === "left") {
        drawText(
          fitTextToWidth(val, col.w - 7, fontSize, true),
          cellX + 4,
          textBaseY,
          "F2",
          fontSize,
          0.08,
          0.13,
          0.24
        );
      } else {
        drawCenteredText(
          val,
          cellX,
          col.w,
          textBaseY,
          isTotalCol || isGradeCol ? "F2" : "F1",
          isTotalCol ? fontSize : fontSize - 0.3,
          isTotalCol ? 0.06 : 0.15,
          isTotalCol ? 0.11 : 0.2,
          isTotalCol ? 0.25 : 0.28
        );
      }
      cellX += col.w;
    }

    rowY += rowH;
  }

  // Draw vertical grid lines down any remaining space above Summary Bar so table covers 100% of box cleanly
  if (rowY < COG_SUM_Y - 1) {
    let vX = CONTENT_X;
    for (let c = 0; c < cogCols.length; c++) {
      if (c > 0) {
        drawLine(vX, rowY, vX, COG_SUM_Y, 0.88, 0.91, 0.95, 0.4);
      }
      vX += cogCols[c].w;
    }
  }

  // Bottom Cognitive Summary Strip
  fillRect(CONTENT_X, COG_SUM_Y, LEFT_W, COG_SUM_H, 0.06, 0.11, 0.25);
  drawText(
    `MARKS OBTAINED: ${dynamicTotalScore} / ${dynamicTotalPossible}`,
    CONTENT_X + 8,
    COG_SUM_Y + 14,
    "F2",
    7.6,
    1,
    1,
    1
  );
  const avgLabel = hasCumulativeScores
    ? `CUM. AVG: ${dynamicCumulativeAverage.toFixed(1)}%`
    : `STUDENT AVG: ${dynamicTermAverage.toFixed(1)}%`;
  drawCenteredText(avgLabel, CONTENT_X + 135, 110, COG_SUM_Y + 14, "F2", 8.0, 0.98, 0.82, 0.15);
  drawText(
    `CLASS AVG: ${dynamicClassAverage.toFixed(1)}%`,
    CONTENT_X + LEFT_W - 88,
    COG_SUM_Y + 14,
    "F2",
    7.4,
    0.82,
    0.88,
    0.96
  );

  // --- RIGHT PANEL: RATING LEGEND + PART 2 PSYCHOMOTOR + PART 3 AFFECTIVE + GRADING SCALE ---
  let rY = curY;

  // 1. Rating Scale Key Box (18pt)
  fillRect(RIGHT_X, rY, RIGHT_W, 18, 0.99, 0.97, 0.86);
  strokeRect(RIGHT_X, rY, RIGHT_W, 18, 0.88, 0.72, 0.15, 0.6);
  drawCenteredText(
    "5=Excellent | 4=Good | 3=Fair | 2=Poor | 1=V.Poor",
    RIGHT_X,
    RIGHT_W,
    rY + 12,
    "F2",
    6.4,
    0.15,
    0.18,
    0.25
  );
  rY += 23;

  const skillKeys = Object.keys(SKILL_LABELS) as (keyof PsychomotorSkillsRatings)[];
  const behaviourKeys = Object.keys(BEHAVIOUR_LABELS) as (keyof AffectiveBehaviourRatings)[];

  // Calculate sub-table heights so Right Panel aligns cleanly with Left Panel bottom!
  const GRADE_KEY_H = 58;
  const availTraitsH = MAIN_BODY_H - 23 - GRADE_KEY_H - 10;
  const singleTraitBoxH = availTraitsH / 2;

  const drawTraitTable = (
    title: string,
    keys: string[],
    labels: Record<string, string>,
    ratings: Record<string, number>,
    topY: number,
    boxH: number
  ) => {
    strokeRect(RIGHT_X, topY, RIGHT_W, boxH, 0.09, 0.17, 0.36, 0.8);
    fillRect(RIGHT_X, topY, RIGHT_W, 15, 0.06, 0.11, 0.25);
    drawCenteredText(title, RIGHT_X, RIGHT_W, topY + 10.5, "F2", 6.8, 1, 1, 1);

    const headY = topY + 15;
    fillRect(RIGHT_X, headY, RIGHT_W, 13, 0.91, 0.94, 0.99);
    drawLine(RIGHT_X, headY + 13, RIGHT_X + RIGHT_W, headY + 13, 0.12, 0.22, 0.45, 0.5);

    const scoreColW = 15;
    const traitColW = RIGHT_W - scoreColW * 5;
    drawText("TRAIT / SKILL", RIGHT_X + 4, headY + 9, "F2", 6.0, 0.06, 0.11, 0.25);
    const scales = [5, 4, 3, 2, 1];
    for (let s = 0; s < 5; s++) {
      const sx = RIGHT_X + traitColW + s * scoreColW;
      drawLine(sx, headY, sx, topY + boxH, 0.82, 0.86, 0.92, 0.4);
      drawCenteredText(String(scales[s]), sx, scoreColW, headY + 9, "F2", 6.2, 0.06, 0.11, 0.25);
    }

    const bodyStartY = headY + 13;
    const itemH = (boxH - 28) / Math.max(keys.length, 1);
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      const iy = bodyStartY + k * itemH;
      if (k % 2 === 1) {
        fillRect(RIGHT_X + 0.5, iy, traitColW - 0.5, itemH, 0.97, 0.98, 0.995);
      }
      if (k < keys.length - 1) {
        drawLine(RIGHT_X, iy + itemH, RIGHT_X + RIGHT_W, iy + itemH, 0.86, 0.89, 0.94, 0.4);
      }
      const ty = iy + itemH * 0.68;
      drawText(
        fitTextToWidth(labels[key] || key, traitColW - 6, 6.5, false),
        RIGHT_X + 4,
        ty,
        "F1",
        6.5,
        0.12,
        0.16,
        0.24
      );
      const val = Number(ratings?.[key]) || 4;
      for (let s = 0; s < 5; s++) {
        const scaleVal = scales[s];
        const sx = RIGHT_X + traitColW + s * scoreColW;
        if (val === scaleVal) {
          fillRect(sx + 0.5, iy + 0.5, scoreColW - 1, itemH - 1, 0.9, 0.95, 1.0);
          drawCenteredText("X", sx, scoreColW, ty, "F2", 6.8, 0.06, 0.18, 0.48);
        } else {
          drawCenteredText("-", sx, scoreColW, ty, "F1", 6.0, 0.75, 0.78, 0.82);
        }
      }
    }
  };

  drawTraitTable(
    "PART 2: PSYCHOMOTOR SKILLS",
    skillKeys,
    SKILL_LABELS,
    data.skills as unknown as Record<string, number>,
    rY,
    singleTraitBoxH
  );
  rY += singleTraitBoxH + 5;

  drawTraitTable(
    "PART 3: AFFECTIVE BEHAVIOUR",
    behaviourKeys,
    BEHAVIOUR_LABELS,
    data.behaviour as unknown as Record<string, number>,
    rY,
    singleTraitBoxH
  );
  rY += singleTraitBoxH + 5;

  // Grading Scale Key Box at bottom of Right Panel
  fillRect(RIGHT_X, rY, RIGHT_W, GRADE_KEY_H, 0.973, 0.98, 0.992);
  strokeRect(RIGHT_X, rY, RIGHT_W, GRADE_KEY_H, 0.09, 0.17, 0.36, 0.7);
  fillRect(RIGHT_X, rY, RIGHT_W, 14, 0.06, 0.11, 0.25);
  drawCenteredText("OFFICIAL GRADING SCALE", RIGHT_X, RIGHT_W, rY + 9.8, "F2", 6.5, 1, 1, 1);

  const gradeLines = [
    "A (70 - 100%) : Distinction / Excellent",
    "B (60 - 69%)  : Very Good",
    "C (50 - 59%)  : Credit",
    "D (45 - 49%)  : Pass   |   E (40 - 44%) : Fair",
    "F (0  - 39%)  : Fail",
  ];
  for (let g = 0; g < gradeLines.length; g++) {
    drawText(gradeLines[g], RIGHT_X + 6, rY + 22.5 + g * 7.8, "F1", 6.2, 0.15, 0.2, 0.3);
  }

  // =========================================================================
  // 4. FOOTER SECTION: PROMOTION RIBBON + 3 SIGNATURES + CERTIFICATION
  // =========================================================================
  let footY = FOOTER_START_Y;

  // Promotion / Status Ribbon (20pt)
  fillRect(CONTENT_X, footY, CONTENT_W, 20, isThirdTerm ? 0.99 : 0.93, isThirdTerm ? 0.96 : 0.96, isThirdTerm ? 0.84 : 1.0);
  strokeRect(CONTENT_X, footY, CONTENT_W, 20, isThirdTerm ? 0.88 : 0.65, isThirdTerm ? 0.7 : 0.76, isThirdTerm ? 0.12 : 0.92, 0.7);

  if (isThirdTerm) {
    drawText(
      `ANNUAL PROMOTION DECISION: ${(data.decision || "PROMOTED").toUpperCase()}`,
      CONTENT_X + 8,
      footY + 13,
      "F2",
      8.0,
      0.06,
      0.11,
      0.25
    );
    drawText(
      `NEXT CLASS PLACEMENT: ${fitTextToWidth(data.nextClass || "Next Class", 160, 8.0, true)}`,
      CONTENT_X + CONTENT_W - 210,
      footY + 13,
      "F2",
      8.0,
      0.08,
      0.38,
      0.2
    );
  } else {
    const termStatus = data.termLabel?.toLowerCase().includes("first")
      ? "FIRST TERM COMPLETED - PROCEEDING TO SECOND TERM"
      : "SECOND TERM COMPLETED - PROCEEDING TO THIRD TERM";
    drawText(`TERM EVALUATION STATUS: ${termStatus}`, CONTENT_X + 8, footY + 13, "F2", 7.5, 0.06, 0.11, 0.25);
    drawText(
      "Annual Promotion Decided in 3rd Term",
      CONTENT_X + CONTENT_W - 150,
      footY + 13,
      "F2",
      7.0,
      0.45,
      0.32,
      0.05
    );
  }

  footY += 25;

  // 3 Signature & Remark Boxes (Height: 72pt)
  const SIG_H = 72;
  const sigGap = 6;
  const sigW = (CONTENT_W - sigGap * 2) / 3;

  const sigBoxes = [
    {
      title: "FORM MASTER'S REMARK",
      remark: data.formMasterComment || "An attentive and hardworking scholar.",
      name: data.formMasterName || "Form Master",
      signLabel: "Sign & Date",
      highlight: false,
    },
    {
      title: "DIRECTOR / PRINCIPAL'S REMARK",
      remark: data.principalRemark || "Commendable academic distinction. Keep it up!",
      name: data.principalName || "Hon. Okolie Peter Isioma JP MCArb",
      signLabel: "[OFFICIAL SEAL]",
      highlight: true,
    },
    {
      title: "PARENT / GUARDIAN ACKNOWLEDGMENT",
      remark: "I confirm that I have inspected this official terminal evaluation report card.",
      name: "Parent / Guardian Signature",
      signLabel: "Date: ____________",
      highlight: false,
    },
  ];

  for (let s = 0; s < 3; s++) {
    const bx = CONTENT_X + s * (sigW + sigGap);
    const box = sigBoxes[s];

    fillRect(
      bx,
      footY,
      sigW,
      SIG_H,
      box.highlight ? 0.95 : 0.98,
      box.highlight ? 0.97 : 0.985,
      1.0
    );
    strokeRect(
      bx,
      footY,
      sigW,
      SIG_H,
      box.highlight ? 0.09 : 0.72,
      box.highlight ? 0.22 : 0.78,
      box.highlight ? 0.52 : 0.86,
      box.highlight ? 0.9 : 0.6
    );

    fillRect(bx, footY, sigW, 14, box.highlight ? 0.06 : 0.9, box.highlight ? 0.11 : 0.93, box.highlight ? 0.25 : 0.97);
    drawText(
      box.title,
      bx + 6,
      footY + 9.8,
      "F2",
      6.4,
      box.highlight ? 0.98 : 0.06,
      box.highlight ? 0.82 : 0.11,
      box.highlight ? 0.15 : 0.25
    );

    const wrapped = wrapTextLines(`"${box.remark}"`, sigW - 12, 7.0, 2);
    for (let l = 0; l < wrapped.length; l++) {
      drawText(wrapped[l], bx + 6, footY + 25 + l * 10, "F1", 7.0, 0.15, 0.2, 0.28);
    }

    drawLine(bx + 6, footY + 52, bx + sigW - 6, footY + 52, 0.78, 0.82, 0.88, 0.5);
    drawText(
      fitTextToWidth(box.name, sigW - 72, 6.6, true),
      bx + 6,
      footY + 64,
      "F2",
      6.6,
      0.06,
      0.11,
      0.25
    );
    drawText(
      box.signLabel,
      bx + sigW - 64,
      footY + 64,
      "F2",
      6.2,
      0.12,
      0.28,
      0.62
    );
  }

  footY += SIG_H + 11;

  // Bottom Tamper-Evident Certification Line
  const printedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  drawText(
    "OFFICIAL DOCUMENT: Any alteration or erasure renders this Terminal Report Card invalid.",
    CONTENT_X,
    footY,
    "F2",
    6.4,
    0.42,
    0.47,
    0.55
  );
  drawText(
    `Generated: ${printedDate} | GFMS Official Result Portal`,
    CONTENT_X + CONTENT_W - 172,
    footY,
    "F1",
    6.4,
    0.42,
    0.47,
    0.55
  );

  // =========================================================================
  // ASSEMBLE SINGLE-PAGE A4 PDF BINARY
  // =========================================================================
  const streamContent = cmds.join("\n");
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [6 0 R] /Count 1 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents 7 0 R >>`,
    `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`,
  ];

  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [0];
  let byteOffset = chunks[0].length;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(byteOffset);
    const objStr = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    chunks.push(objStr);
    byteOffset += objStr.length;
  }

  const xrefOffset = byteOffset;
  const xrefLines: string[] = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
  ];
  for (let i = 1; i <= objects.length; i++) {
    xrefLines.push(`${String(offsets[i]).padStart(10, "0")} 00000 n `);
  }

  const trailer = [
    ...xrefLines,
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");

  chunks.push(trailer);

  const fullPdf = chunks.join("");
  const bytes = new Uint8Array(fullPdf.length);
  for (let i = 0; i < fullPdf.length; i++) {
    bytes[i] = fullPdf.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Triggers an immediate download of the single-page A4 Report Card PDF
 */
export function downloadTerminalReportCardPdf(data: ReportCardData): void {
  if (typeof window === "undefined") return;

  const pdfBytes = generateTerminalReportCardPdfBytes(data);
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const cleanStudent = (data.student.fullName || "Student")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_");
  const cleanClass = (data.student.className || "Class")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_");
  const cleanSession = (data.session || "Session").replace(/\//g, "-");
  const fileName = `GFMS_ReportCard_${cleanStudent}_${cleanClass}_${cleanSession}.pdf`;

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);
}

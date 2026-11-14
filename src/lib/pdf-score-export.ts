/**
 * Great-Favour Montessori School (GFMS)
 * Zero-Dependency Pure-TypeScript A4 PDF Score Sheet Generator
 * Exports official CBT Examination Score Sheets with Student Name, Reg No, Class, and OBJ Scores.
 */

export interface ExamScorePdfRow {
  studentFullName: string;
  studentAdmNo?: string;
  studentClass?: string;
  objectiveScore: number;
  theoryScore?: number | null;
  totalScore?: number | null;
  submittedAt?: Date | string | null;
  remark?: string | null;
}

export interface ExamScorePdfOptions {
  examTitle: string;
  subject: string;
  targetClass: string;
  rows: ExamScorePdfRow[];
  mode?: "obj_only" | "full";
  examinerName?: string;
  sortBy?: "name" | "score_desc" | "default";
  customColumnLabels?: {
    obj?: string;
    theory?: string;
    total?: string;
  };
}

/**
 * Sanitize and escape strings for standard PDF WinAnsiEncoding Type1 fonts
 */
function escapePdfText(input: string): string {
  if (!input) return "";
  // Normalize common Unicode punctuation to clean ASCII equivalents
  const normalized = String(input)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E]/g, " ");

  return normalized
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function truncateText(text: string, maxChars: number): string {
  const clean = (text || "").trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, Math.max(1, maxChars - 3)).trimEnd() + "...";
}

function formatScoreValue(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return "-";
  const num = Number(val);
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(2)));
}

/**
 * Generates a complete, standards-compliant A4 PDF binary (Uint8Array)
 */
export function generateExamScoresPdfBytes(options: ExamScorePdfOptions): Uint8Array {
  const PAGE_W = 595.28; // A4 width in pt
  const PAGE_H = 841.89; // A4 height in pt
  const MARGIN_X = 36;
  const CONTENT_W = PAGE_W - MARGIN_X * 2; // 523.28 pt

  const mode = options.mode || "obj_only";
  const sortBy = options.sortBy || "name";

  const subject = (options.subject || "General Subject").trim();
  const examTitle = (options.examTitle || "CBT Examination").trim();
  const targetClass = (options.targetClass || "All Classes").trim();
  const objLabel = options.customColumnLabels?.obj || "OBJ SCORE";
  const theoryLabel = options.customColumnLabels?.theory || "THEORY";
  const totalLabel = options.customColumnLabels?.total || "TOTAL";

  // Sort rows cleanly
  const sortedRows = [...(options.rows || [])];
  if (sortBy === "name") {
    sortedRows.sort((a, b) =>
      (a.studentFullName || "").localeCompare(b.studentFullName || "", undefined, {
        sensitivity: "base",
      })
    );
  } else if (sortBy === "score_desc") {
    sortedRows.sort((a, b) => (Number(b.objectiveScore) || 0) - (Number(a.objectiveScore) || 0));
  }

  // Summary metrics
  const totalCandidates = sortedRows.length;
  const objScores = sortedRows.map((r) => Number(r.objectiveScore) || 0);
  const sumObj = objScores.reduce((acc, v) => acc + v, 0);
  const avgObj = totalCandidates > 0 ? (sumObj / totalCandidates).toFixed(1) : "0.0";
  const maxObj = totalCandidates > 0 ? formatScoreValue(Math.max(...objScores)) : "0";
  const minObj = totalCandidates > 0 ? formatScoreValue(Math.min(...objScores)) : "0";

  const exportDateStr = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Pagination calculation
  const FIRST_PAGE_MAX_ROWS = 27;
  const NEXT_PAGE_MAX_ROWS = 32;

  const pagesRows: Array<Array<{ row: ExamScorePdfRow; index: number }>> = [];
  if (sortedRows.length === 0) {
    pagesRows.push([]);
  } else {
    let cursor = 0;
    const firstChunk = sortedRows
      .slice(0, FIRST_PAGE_MAX_ROWS)
      .map((row, idx) => ({ row, index: idx + 1 }));
    pagesRows.push(firstChunk);
    cursor += FIRST_PAGE_MAX_ROWS;

    while (cursor < sortedRows.length) {
      const chunk = sortedRows
        .slice(cursor, cursor + NEXT_PAGE_MAX_ROWS)
        .map((row, idx) => ({ row, index: cursor + idx + 1 }));
      pagesRows.push(chunk);
      cursor += NEXT_PAGE_MAX_ROWS;
    }
  }

  const totalPages = pagesRows.length;

  // Coordinate helper: top-down Y to PDF bottom-up Y
  const yPt = (topY: number) => Number((PAGE_H - topY).toFixed(2));

  // Drawing primitives for a page content stream
  const buildPageStream = (
    pageItems: Array<{ row: ExamScorePdfRow; index: number }>,
    pageIndex: number
  ): string => {
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
        `BT /${font} ${fontSize} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${x.toFixed(2)} ${yPt(topY)} Tm (${safe}) Tj ET`
      );
    };

    let currentTopY = 30;

    // Full-page A4 Institutional Border Frame
    strokeRect(20, 20, PAGE_W - 40, PAGE_H - 40, 0.09, 0.145, 0.33, 1.2);
    strokeRect(23, 23, PAGE_W - 46, PAGE_H - 46, 0.85, 0.65, 0.05, 0.5);

    if (pageIndex === 0) {
      // 1. Main Institutional Header Banner (Page 1)
      fillRect(MARGIN_X, currentTopY, CONTENT_W, 58, 0.059, 0.09, 0.165); // Slate-900 / Navy
      fillRect(MARGIN_X, currentTopY + 58, CONTENT_W, 4, 0.918, 0.702, 0.031); // Gold accent bar

      drawText(
        "GREAT-FAVOUR MONTESSORI SCHOOL (GFMS)",
        MARGIN_X + 14,
        currentTopY + 21,
        "F2",
        14,
        1,
        1,
        1
      );

      const subtitle =
        mode === "obj_only"
          ? "OFFICIAL CBT EXAMINATION SCORE SHEET - STUDENT NAME & OBJECTIVE (OBJ) SCORES"
          : "OFFICIAL CBT EXAMINATION SCORE SHEET - OBJECTIVE (OBJ) & THEORY SCORES";

      drawText(subtitle, MARGIN_X + 14, currentTopY + 36, "F2", 8.5, 0.98, 0.804, 0.082);

      drawText(
        `Exported: ${exportDateStr}`,
        MARGIN_X + 14,
        currentTopY + 49,
        "F1",
        7.5,
        0.796,
        0.835,
        0.882
      );

      currentTopY += 70;

      // 2. Exam Metadata & Summary Card
      fillRect(MARGIN_X, currentTopY, CONTENT_W, 50, 0.973, 0.98, 0.988); // #f8fafc
      strokeRect(MARGIN_X, currentTopY, CONTENT_W, 50, 0.796, 0.835, 0.882, 0.8); // #cbd5e1

      // Left metadata column
      drawText(
        `SUBJECT: ${truncateText(subject.toUpperCase(), 38)}`,
        MARGIN_X + 10,
        currentTopY + 16,
        "F2",
        10,
        0.059,
        0.09,
        0.165
      );
      drawText(
        `EXAM TITLE: ${truncateText(examTitle, 48)}`,
        MARGIN_X + 10,
        currentTopY + 30,
        "F1",
        8.5,
        0.2,
        0.255,
        0.333
      );
      drawText(
        `TARGET CLASS: ${truncateText(targetClass, 35)}`,
        MARGIN_X + 10,
        currentTopY + 43,
        "F2",
        8.5,
        0.118,
        0.251,
        0.686
      );

      // Vertical divider inside metadata card
      drawLine(325, currentTopY + 6, 325, currentTopY + 44, 0.796, 0.835, 0.882, 0.6);

      // Right statistics column
      drawText(
        `TOTAL CANDIDATES: ${totalCandidates}`,
        336,
        currentTopY + 16,
        "F2",
        9,
        0.059,
        0.09,
        0.165
      );
      drawText(
        `AVERAGE ${objLabel}: ${avgObj} pts`,
        336,
        currentTopY + 30,
        "F2",
        9,
        0.012,
        0.412,
        0.631
      );
      drawText(
        `HIGHEST OBJ: ${maxObj} pts   |   LOWEST OBJ: ${minObj} pts`,
        336,
        currentTopY + 43,
        "F1",
        8,
        0.278,
        0.333,
        0.412
      );

      currentTopY += 60;
    } else {
      // Compact continuation header on Page 2+
      fillRect(MARGIN_X, currentTopY, CONTENT_W, 28, 0.059, 0.09, 0.165);
      fillRect(MARGIN_X, currentTopY + 28, CONTENT_W, 2.5, 0.918, 0.702, 0.031);
      drawText(
        `GFMS CBT SCORE SHEET - ${truncateText(subject.toUpperCase(), 28)} (${truncateText(targetClass, 18)})`,
        MARGIN_X + 10,
        currentTopY + 18,
        "F2",
        9.5,
        1,
        1,
        1
      );
      drawText(
        `Page ${pageIndex + 1} of ${totalPages}`,
        PAGE_W - MARGIN_X - 65,
        currentTopY + 18,
        "F2",
        8.5,
        0.98,
        0.804,
        0.082
      );
      currentTopY += 38;
    }

    // 3. Table Column Layout Definition
    // Mode "obj_only": S/N | STUDENT FULL NAME | REG / ADM NO. | CLASS | OBJ SCORE
    // Mode "full":     S/N | STUDENT FULL NAME | REG / ADM NO. | CLASS | OBJ SCORE | THEORY | TOTAL
    const columns =
      mode === "obj_only"
        ? [
            { label: "S/N", x: MARGIN_X, w: 36, align: "left" as const },
            { label: "STUDENT FULL NAME", x: MARGIN_X + 36, w: 222, align: "left" as const },
            { label: "REG / ADM NO.", x: MARGIN_X + 258, w: 115, align: "left" as const },
            { label: "CLASS", x: MARGIN_X + 373, w: 68, align: "left" as const },
            { label: objLabel, x: MARGIN_X + 441, w: CONTENT_W - 441, align: "left" as const },
          ]
        : [
            { label: "S/N", x: MARGIN_X, w: 32, align: "left" as const },
            { label: "STUDENT FULL NAME", x: MARGIN_X + 32, w: 176, align: "left" as const },
            { label: "REG / ADM NO.", x: MARGIN_X + 208, w: 98, align: "left" as const },
            { label: "CLASS", x: MARGIN_X + 306, w: 58, align: "left" as const },
            { label: objLabel, x: MARGIN_X + 364, w: 54, align: "left" as const },
            { label: theoryLabel, x: MARGIN_X + 418, w: 50, align: "left" as const },
            { label: totalLabel, x: MARGIN_X + 468, w: CONTENT_W - 468, align: "left" as const },
          ];

    const HEADER_H = 22;
    const ROW_H = 20;

    // Draw Table Header
    fillRect(MARGIN_X, currentTopY, CONTENT_W, HEADER_H, 0.118, 0.161, 0.231); // #1e293b
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      const maxLabelChars = Math.max(3, Math.floor((col.w - 10) / 4.6));
      drawText(truncateText(col.label, maxLabelChars), col.x + 6, currentTopY + 14.5, "F2", 8, 1, 1, 1);
      if (c > 0) {
        drawLine(col.x, currentTopY, col.x, currentTopY + HEADER_H, 0.278, 0.333, 0.412, 0.5);
      }
    }
    currentTopY += HEADER_H;

    // Draw Rows
    if (pageItems.length === 0) {
      fillRect(MARGIN_X, currentTopY, CONTENT_W, 36, 1, 1, 1);
      strokeRect(MARGIN_X, currentTopY, CONTENT_W, 36, 0.796, 0.835, 0.882, 0.6);
      drawText(
        "No student examination scores recorded for this paper yet.",
        MARGIN_X + 16,
        currentTopY + 22,
        "F1",
        9.5,
        0.4,
        0.45,
        0.52
      );
      currentTopY += 36;
    } else {
      for (let i = 0; i < pageItems.length; i++) {
        const { row, index } = pageItems[i];
        const isEven = i % 2 === 1;

        // Row background
        if (isEven) {
          fillRect(MARGIN_X, currentTopY, CONTENT_W, ROW_H, 0.969, 0.976, 0.988); // #f7f9fc
        } else {
          fillRect(MARGIN_X, currentTopY, CONTENT_W, ROW_H, 1, 1, 1);
        }

        // Highlight OBJ score cell slightly for readability
        const objCol = columns[4];
        fillRect(
          objCol.x,
          currentTopY,
          objCol.w,
          ROW_H,
          isEven ? 0.925 : 0.949,
          isEven ? 0.961 : 0.976,
          1.0
        );

        // Row border
        strokeRect(MARGIN_X, currentTopY, CONTENT_W, ROW_H, 0.82, 0.855, 0.902, 0.45);

        // Vertical column dividers
        for (let c = 1; c < columns.length; c++) {
          drawLine(
            columns[c].x,
            currentTopY,
            columns[c].x,
            currentTopY + ROW_H,
            0.82,
            0.855,
            0.902,
            0.45
          );
        }

        const textY = currentTopY + 13.5;
        const studentName = truncateText(
          (row.studentFullName || "Student").toUpperCase(),
          mode === "obj_only" ? 36 : 28
        );
        const admNo = truncateText(row.studentAdmNo || "-", mode === "obj_only" ? 18 : 15);
        const clsName = truncateText(row.studentClass || targetClass, 11);
        const objStr = formatScoreValue(row.objectiveScore);

        // Col 0: S/N
        drawText(String(index), columns[0].x + 6, textY, "F1", 8.5, 0.392, 0.455, 0.545);

        // Col 1: Student Full Name (Bold)
        drawText(studentName, columns[1].x + 6, textY, "F2", 9, 0.059, 0.09, 0.165);

        // Col 2: Reg / Adm No (Courier Bold)
        drawText(admNo, columns[2].x + 6, textY, "F3", 8.5, 0.118, 0.227, 0.541);

        // Col 3: Class
        drawText(clsName, columns[3].x + 6, textY, "F1", 8.5, 0.2, 0.255, 0.333);

        // Col 4: OBJ Score (Bold Navy/Blue)
        drawText(
          mode === "obj_only" ? `${objStr} pts` : objStr,
          columns[4].x + 8,
          textY,
          "F2",
          9.5,
          0.012,
          0.349,
          0.545
        );

        if (mode === "full") {
          const thVal =
            row.theoryScore !== null && row.theoryScore !== undefined
              ? formatScoreValue(row.theoryScore)
              : "-";
          const computedTot =
            row.totalScore !== null && row.totalScore !== undefined
              ? row.totalScore
              : (Number(row.objectiveScore) || 0) + (Number(row.theoryScore) || 0);
          const totVal = formatScoreValue(computedTot);

          // Col 5: Theory Score
          drawText(thVal, columns[5].x + 8, textY, "F1", 9, 0.2, 0.255, 0.333);

          // Col 6: Total Score
          drawText(totVal, columns[6].x + 8, textY, "F2", 9.5, 0.02, 0.471, 0.341);
        }

        currentTopY += ROW_H;
      }
    }

    // 4. Certification Signature Block on Final Page
    if (pageIndex === totalPages - 1 && currentTopY + 55 < PAGE_H - 40) {
      const sigTopY = Math.max(currentTopY + 28, PAGE_H - 92);
      drawLine(MARGIN_X, sigTopY, MARGIN_X + 180, sigTopY, 0.4, 0.45, 0.52, 0.7);
      drawText(
        options.examinerName
          ? `Examiner: ${truncateText(options.examinerName, 28)}`
          : "Subject Examiner Signature & Date",
        MARGIN_X,
        sigTopY + 12,
        "F2",
        8,
        0.278,
        0.333,
        0.412
      );

      drawLine(PAGE_W - MARGIN_X - 180, sigTopY, PAGE_W - MARGIN_X, sigTopY, 0.4, 0.45, 0.52, 0.7);
      drawText(
        "Principal / Super Admin Certification",
        PAGE_W - MARGIN_X - 180,
        sigTopY + 12,
        "F2",
        8,
        0.278,
        0.333,
        0.412
      );
    }

    // 5. Page Footer
    const footerY = PAGE_H - 24;
    drawLine(MARGIN_X, footerY - 10, PAGE_W - MARGIN_X, footerY - 10, 0.82, 0.855, 0.902, 0.5);
    drawText(
      "Great-Favour Montessori School (GFMS) - Official CBT Examination Score Record",
      MARGIN_X,
      footerY,
      "F1",
      7.5,
      0.45,
      0.5,
      0.58
    );
    drawText(
      `Page ${pageIndex + 1} of ${totalPages}`,
      PAGE_W - MARGIN_X - 55,
      footerY,
      "F2",
      7.5,
      0.278,
      0.333,
      0.412
    );

    return cmds.join("\n");
  };

  // Assemble PDF Objects
  // Object 1: Catalog
  // Object 2: Pages
  // Object 3: Font F1 (Helvetica)
  // Object 4: Font F2 (Helvetica-Bold)
  // Object 5: Font F3 (Courier-Bold)
  // Objects 6+: Page & Content stream pairs
  const objects: string[] = [];
  const pageObjIds: number[] = [];

  // Placeholders for Obj 1..5
  objects.push(""); // 1: Catalog
  objects.push(""); // 2: Pages
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  ); // 3
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  ); // 4
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>"
  ); // 5

  for (let p = 0; p < totalPages; p++) {
    const streamContent = buildPageStream(pagesRows[p], p);
    const pageObjId = objects.length + 1;
    const contentObjId = objects.length + 2;
    pageObjIds.push(pageObjId);

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );
    objects.push(
      `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`
    );
  }

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${totalPages} >>`;

  // Serialize with exact byte offsets
  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [0]; // index 0 is free entry
  let currentByteOffset = chunks[0].length;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(currentByteOffset);
    const objStr = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    chunks.push(objStr);
    currentByteOffset += objStr.length;
  }

  const xrefOffset = currentByteOffset;
  const xrefLines: string[] = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
  ];
  for (let i = 1; i <= objects.length; i++) {
    xrefLines.push(`${String(offsets[i]).padStart(10, "0")} 00000 n `);
  }

  const trailerStr = [
    ...xrefLines,
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");

  chunks.push(trailerStr);

  const fullPdfString = chunks.join("");
  const bytes = new Uint8Array(fullPdfString.length);
  for (let i = 0; i < fullPdfString.length; i++) {
    bytes[i] = fullPdfString.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Triggers an immediate browser download of the generated A4 PDF Score Sheet
 */
export function downloadExamScoresPdf(options: ExamScorePdfOptions): void {
  if (typeof window === "undefined") return;

  const pdfBytes = generateExamScoresPdfBytes(options);
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const cleanSub = (options.subject || "Exam").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  const cleanClass = (options.targetClass || "Class").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  const suffix = options.mode === "full" ? "Full_Scores" : "OBJ_Scores";
  const fileName = `GFMS_${cleanSub}_${cleanClass}_${suffix}.pdf`;

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

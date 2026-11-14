"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ReportCardData,
  SKILL_LABELS,
  BEHAVIOUR_LABELS,
  PsychomotorSkillsRatings,
  AffectiveBehaviourRatings,
  getOrdinalSuffix,
} from "@/types/report-card";
import { SCHOOL_BRAND, SCHOOL_NAME } from "@/constants/school";
import { Printer, Download, ArrowLeft, CheckCircle2, ShieldCheck, User } from "lucide-react";

interface ReportCardProps {
  data: ReportCardData;
  scratchCardCheckInfo?: {
    check: number;
    max: number;
  };
}

export default function ReportCardView({ data, scratchCardCheckInfo }: ReportCardProps) {
  const handlePrint = (isPdf = false) => {
    if (typeof window !== "undefined") {
      const originalTitle = document.title;
      const cleanStudent = (data.student.fullName || "Student").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanClass = (data.student.className || "Class").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanSession = (data.session || "Session").replace(/\//g, "-");
      document.title = `GFMS_ReportCard_${cleanStudent}_${cleanClass}_${cleanSession}`;

      window.print();

      setTimeout(() => {
        document.title = originalTitle;
      }, 1200);
    }
  };

  // Group cognitive grades by category
  const categoriesMap = new Map<string, typeof data.cognitiveGrades>();
  data.cognitiveGrades.forEach((item) => {
    const cat = item.category || "General Studies";
    if (!categoriesMap.has(cat)) {
      categoriesMap.set(cat, []);
    }
    categoriesMap.get(cat)!.push(item);
  });

  const skillKeys = Object.keys(SKILL_LABELS) as (keyof PsychomotorSkillsRatings)[];
  const behaviourKeys = Object.keys(BEHAVIOUR_LABELS) as (keyof AffectiveBehaviourRatings)[];
  const isThirdTerm = data.term === "THIRD_TERM" || (Boolean(data.termLabel) && data.termLabel.toLowerCase().includes("third"));

  // ==========================================================================
  // DYNAMIC COMPUTATION OF MARKS & STUDENT AVERAGE BASED ON SUBJECT SCORES
  // ==========================================================================
  const cognitiveList = data.cognitiveGrades || [];
  const subjectCount = cognitiveList.length;

  // Dynamic total continuous assessment + examination marks obtained
  const dynamicTotalScore = subjectCount > 0
    ? cognitiveList.reduce((sum, item) => sum + (Number(item.totalScore) || 0), 0)
    : (data.totalScoreObtained || 0);

  const dynamicTotalPossible = subjectCount > 0
    ? subjectCount * 100
    : (data.totalScorePossible || 0);

  // Dynamic Term Average Percentage
  const dynamicTermAverage = subjectCount > 0
    ? Number((dynamicTotalScore / subjectCount).toFixed(1))
    : (Number(data.studentAverage) || 0);

  // For 3rd term promotional assessment: dynamically compute cumulative annual average
  const hasCumulativeScores = isThirdTerm && cognitiveList.some(
    (item) => item.cumulativeScore !== undefined || (item.term1Score !== undefined && item.term1Score !== null) || (item.term2Score !== undefined && item.term2Score !== null)
  );

  const dynamicCumulativeTotal = hasCumulativeScores
    ? cognitiveList.reduce((sum, item) => {
        const thirdTotal = item.term3Total ?? item.totalScore ?? 0;
        const hasT1 = item.term1Score !== undefined && item.term1Score !== null;
        const hasT2 = item.term2Score !== undefined && item.term2Score !== null;
        const cum = item.cumulativeScore !== undefined
          ? Number(item.cumulativeScore)
          : (hasT1 || hasT2)
          ? Math.round((((Number(item.term1Score) || 0) + (Number(item.term2Score) || 0) + thirdTotal) / 3) * 10) / 10
          : thirdTotal;
        return sum + cum;
      }, 0)
    : dynamicTotalScore;

  const dynamicCumulativeAverage = subjectCount > 0
    ? Number((dynamicCumulativeTotal / subjectCount).toFixed(1))
    : dynamicTermAverage;

  // Dynamic Class Average: If data.classAverage was legacy fixed dummy (68.45 / 68.5) or unassigned, compute dynamically from student's scores
  const isLegacyDummyClassAvg = !data.classAverage || Math.abs(Number(data.classAverage) - 68.45) < 0.05 || Math.abs(Number(data.classAverage) - 68.5) < 0.05;
  const dynamicClassAverage = !isLegacyDummyClassAvg && Number(data.classAverage) > 0
    ? Number(data.classAverage)
    : (hasCumulativeScores ? dynamicCumulativeAverage : dynamicTermAverage);

  return (
    <div className="report-card-container w-full max-w-[210mm] mx-auto my-1 sm:my-3 px-1 sm:px-0">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/result"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-blue-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Check Another Result</span>
          </a>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-semibold text-slate-600">
            {data.student.className} &bull; {data.session} {data.termLabel}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200">
            Standard A4 Format (210 × 297 mm)
          </span>
          {scratchCardCheckInfo && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                scratchCardCheckInfo.check >= scratchCardCheckInfo.max
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>
                PIN Check {scratchCardCheckInfo.check} of {scratchCardCheckInfo.max}{" "}
                {scratchCardCheckInfo.check >= scratchCardCheckInfo.max
                  ? `(${scratchCardCheckInfo.max}-Check Limit Reached)`
                  : `(${scratchCardCheckInfo.max - scratchCardCheckInfo.check} Check${scratchCardCheckInfo.max - scratchCardCheckInfo.check > 1 ? "s" : ""} Left)`}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handlePrint(false)}
            className="py-1 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-blue-800 text-white hover:bg-blue-900 transition shadow-sm active:scale-95"
            title="Print single-page A4 Report Card"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report Card (A4)</span>
          </button>
          <button
            onClick={() => handlePrint(true)}
            className="py-1 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1 text-blue-900 border border-blue-800 hover:bg-blue-50 transition active:scale-95"
            title="Save official report card as PDF document in A4"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save as PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Official Single-Page Report Card Sheet (A4 Dimensions Locked) */}
      <div className="report-card-sheet bg-white border-2 border-blue-900 shadow-xl p-2.5 sm:p-3 text-slate-900 font-sans text-[9px] leading-tight print:p-2 print:border print:border-blue-900 print:shadow-none w-full box-border">
        
        {/* ================================================================== */}
        {/* 1. COMPACT STREAMLINED HEADER                                      */}
        {/* ================================================================== */}
        <header className="border-b border-blue-800 pb-1.5 mb-1.5">
          <div className="grid grid-cols-12 gap-1.5 items-center">
            
            {/* Left: Official School Logo */}
            <div className="col-span-2 flex flex-col items-center justify-center text-center">
              <div className="relative w-12 h-12 sm:w-13 sm:h-13">
                <Image
                  src="/assets/images/school-logo.jpg"
                  alt="Great-Favour Montessori School Crest"
                  width={52}
                  height={52}
                  className="object-contain rounded-full border border-blue-300 p-0.5 bg-white shadow-xs"
                  priority
                />
              </div>
              <span className="text-[7.5px] font-black text-blue-900 tracking-wider">
                EST. SEPT 2014
              </span>
            </div>

            {/* Center: School Identity & Dossier Title */}
            <div className="col-span-7 text-center space-y-0.5">
              <h1 className="text-sm sm:text-base font-black text-blue-950 tracking-tight leading-none uppercase">
                {SCHOOL_NAME}
              </h1>
              <div className="inline-block bg-yellow-400 text-slate-950 font-black text-[8px] sm:text-[8.5px] px-2 py-0.2 rounded uppercase tracking-wider">
                {SCHOOL_BRAND.motto}
              </div>
              <p className="text-[8px] text-slate-600 font-medium">
                Montessori Early Learning, Primary &amp; Secondary Academy
              </p>
              <div>
                <span className="inline-block bg-blue-50 text-blue-900 border border-blue-800 text-[8.5px] sm:text-[9px] font-black px-2.5 py-0.2 rounded uppercase tracking-wide">
                  Continuous Assessment Dossier &amp; Terminal Examination Report
                </span>
              </div>
            </div>

            {/* Right: Compact Next Term Fee Notice Box */}
            <div className="col-span-3 border border-yellow-500 bg-yellow-50/70 p-1 rounded text-[7.5px] sm:text-[8px] space-y-0.2">
              <div className="bg-yellow-500 text-slate-950 font-black px-1 text-center uppercase tracking-wider text-[7px]">
                Next Term Fee Notice
              </div>
              {data.feeInfo?.termFeeAmount ? (
                <div className="flex justify-between border-b border-yellow-200 pb-0.2">
                  <span className="text-slate-600 font-semibold">Amount:</span>
                  <span className="font-bold text-blue-950">{data.feeInfo.termFeeAmount}</span>
                </div>
              ) : null}
              {data.feeInfo?.dueDate ? (
                <div className="flex justify-between border-b border-yellow-200 pb-0.2">
                  <span className="text-slate-600 font-semibold">Due:</span>
                  <span className="font-bold text-slate-800">{data.feeInfo.dueDate}</span>
                </div>
              ) : null}
              {data.feeInfo?.accountNumber && data.feeInfo.accountNumber.trim() !== "" && data.feeInfo.accountNumber !== "1014529088" ? (
                <div className="text-[7px] text-slate-700 leading-tight">
                  {data.feeInfo.bankName && data.feeInfo.bankName.trim() !== "" && (
                    <div><span className="font-semibold">Bank:</span> {data.feeInfo.bankName}</div>
                  )}
                  <div><span className="font-semibold">Acc:</span> {data.feeInfo.accountNumber}</div>
                  {data.feeInfo.accountName && data.feeInfo.accountName.trim() !== "" && (
                    <div className="truncate"><span className="font-semibold">Name:</span> {data.feeInfo.accountName}</div>
                  )}
                </div>
              ) : (
                <div className="text-[6.5px] text-slate-500 italic py-0.5 text-center leading-tight">
                  Official Bursary Clearance
                </div>
              )}
              <div className="text-center pt-0.2">
                <span className="inline-block bg-emerald-700 text-white font-bold px-1.5 py-0.1 rounded text-[7px] uppercase">
                  {data.feeInfo?.status || "PAID"}
                </span>
              </div>
            </div>

          </div>
        </header>

        {/* ================================================================== */}
        {/* 2. COMPACT BIO GRID WITH STUDENT PASSPORT (Certified Format)        */}
        {/* ================================================================== */}
        <section className="bg-slate-50 border border-slate-300 p-1 rounded mb-1.5 text-[8.5px]">
          <div className="flex items-center gap-1.5">
            {/* Student Passport Photo Container */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-[42px] h-[52px] rounded border border-blue-900 bg-white shadow-xs overflow-hidden flex items-center justify-center relative">
                {data.student.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.student.avatarUrl}
                    alt={data.student.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-0.5 text-center">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-[5px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 leading-none">PASSPORT</span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-blue-950/90 text-[4.5px] text-white text-center font-bold uppercase py-0.2 tracking-tighter">
                  GFMS CERTIFIED
                </div>
              </div>
            </div>

            {/* Biodata Fields (2 Rows) */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-2 sm:grid-cols-8 gap-1 items-center">
                <div className="col-span-2 sm:col-span-3 border-r border-slate-200 pr-1">
                  <span className="text-slate-500 block text-[7px] uppercase font-bold">Student Name</span>
                  <span className="font-black text-blue-950 text-[10px] sm:text-[10.5px] uppercase tracking-tight truncate block">
                    {data.student.fullName}
                  </span>
                </div>

                <div className="border-r border-slate-200 pr-1">
                  <span className="text-slate-500 block text-[7px] uppercase font-bold">Class / Stream</span>
                  <span className="font-bold text-slate-900 truncate block">{data.student.className}</span>
                  {data.student.arm && !data.student.className?.toLowerCase().includes(data.student.arm.toLowerCase()) && (
                    <span className="text-[7px] font-black uppercase text-blue-800 block">{data.student.arm}</span>
                  )}
                </div>

                <div className="border-r border-slate-200 pr-1">
                  <span className="text-slate-500 block text-[7px] uppercase font-bold">Adm No.</span>
                  <span className="font-mono font-bold text-blue-800 truncate block">{data.student.admissionNumber}</span>
                </div>

                <div className="border-r border-slate-200 pr-1">
                  <span className="text-slate-500 block text-[7px] uppercase font-bold">Sex</span>
                  <span className="font-bold text-slate-900">{data.student.gender}</span>
                </div>

                <div className="border-r border-slate-200 pr-1">
                  <span className="text-slate-500 block text-[7px] uppercase font-bold">Term</span>
                  <span className="font-bold text-slate-900 truncate block">{data.termLabel}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[7px] uppercase font-bold">Session</span>
                  <span className="font-bold text-slate-900">{data.session}</span>
                </div>
              </div>

              <div className="mt-0.5 pt-0.5 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-1 text-[8px]">
                <div>
                  <span className="text-slate-500">Position: </span>
                  <span className="font-black text-blue-900 bg-yellow-100 border border-yellow-300 px-1.5 py-0.2 rounded text-[8px]">
                    {data.positionInClass || 1}<sup>{getOrdinalSuffix(data.positionInClass || 1)}</sup> of {data.numberInClass || 35}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Days Opened: </span>
                  <span className="font-bold text-slate-900">{data.daysOpened}</span>
                </div>
                <div>
                  <span className="text-slate-500">Present: </span>
                  <span className="font-bold text-green-700">{data.daysPresent}</span>
                </div>
                <div>
                  <span className="text-slate-500">Absent: </span>
                  <span className="font-bold text-red-600">{data.daysAbsent}</span>
                </div>
                <div>
                  <span className="text-slate-500">Next Term Resumes: </span>
                  <span className="font-bold text-blue-900">{data.nextTermBegins}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 3. MAIN BODY: COGNITIVE DOMAIN (LEFT 7) | SKILLS & BEHAVIOUR (RIGHT 5)*/}
        {/* ================================================================== */}
        <div className="grid grid-cols-12 gap-1.5 items-start">
          
          {/* LEFT: COGNITIVE DOMAIN TABLE (Col-span 7) */}
          <div className="col-span-12 sm:col-span-7 border border-blue-850 rounded-xs overflow-hidden">
            <div className="bg-blue-900 text-white font-bold px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider flex justify-between items-center">
              <span>Part 1: Cognitive Domain</span>
              <span className="text-[7.5px] font-normal text-yellow-300">
                {isThirdTerm
                  ? "1st(100) + 2nd(100) + 3rd(CA1+CA2+Exam) → Cumulative Avg"
                  : "CA1(15) + CA2(15) + Exam(70) = 100"}
              </span>
            </div>

            <table className="w-full text-left border-collapse text-[7.5px] sm:text-[8px]">
              <thead>
                <tr className="bg-blue-100/80 border-b border-blue-300 text-blue-950 font-bold">
                  <th className="py-0.5 px-0.5 border-r border-blue-200 w-3.5 text-center">#</th>
                  <th className="py-0.5 px-1 border-r border-blue-200">Subjects</th>
                  {isThirdTerm ? (
                    <>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-5" title="1st Term Total / 100">1st</th>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-5" title="2nd Term Total / 100">2nd</th>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-5" title="3rd Term CA1 / 15">CA1</th>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-5" title="3rd Term CA2 / 15">CA2</th>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-5" title="3rd Term Terminal Exam / 70">Exam</th>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-5.5 font-bold" title="3rd Term Total / 100">3rd</th>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-7 bg-yellow-100 text-slate-950 font-black" title="Cumulative Annual Average %">Cum%</th>
                    </>
                  ) : (
                    <>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-7" title="1st Continuous Assessment / 15">CA1</th>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-7" title="2nd Continuous Assessment / 15">CA2</th>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-8" title="Terminal Exam / 70">Exam</th>
                      <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-9 bg-yellow-100 text-slate-950 font-black">Tot</th>
                    </>
                  )}
                  <th className="py-0.5 px-0.5 border-r border-blue-200 text-center w-5">Grd</th>
                  <th className="py-0.5 px-0.5 text-center w-10">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Array.from(categoriesMap.entries()).map(([category, items], catIdx) => (
                  <React.Fragment key={category}>
                    {/* Category Divider */}
                    <tr className="bg-slate-100 text-blue-900 font-bold text-[7px] uppercase tracking-wider">
                      <td
                        colSpan={isThirdTerm ? 11 : 8}
                        className="py-0.1 px-1 bg-slate-200/90 border-l-2 border-l-yellow-500"
                      >
                        {category} ({items.length})
                      </td>
                    </tr>

                    {/* Subjects */}
                    {items.map((item, itemIdx) => {
                      const thirdTotal = item.term3Total ?? item.totalScore;
                      const hasTerm1 = item.term1Score !== undefined && item.term1Score !== null;
                      const hasTerm2 = item.term2Score !== undefined && item.term2Score !== null;
                      const cumulative = item.cumulativeScore !== undefined
                        ? item.cumulativeScore
                        : (hasTerm1 || hasTerm2)
                        ? Math.round((((Number(item.term1Score) || 0) + (Number(item.term2Score) || 0) + thirdTotal) / 3) * 10) / 10
                        : item.totalScore;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50/40 odd:bg-white even:bg-slate-50/40"
                        >
                          <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center text-slate-400 text-[7px]">
                            {catIdx * 10 + itemIdx + 1}
                          </td>
                          <td className="py-[1.5px] px-1 border-r border-slate-200 font-semibold text-slate-800 truncate max-w-[110px] sm:max-w-[125px]">
                            {item.subjectName}
                          </td>
                          {isThirdTerm ? (
                            <>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-medium text-slate-700">
                                {hasTerm1 ? item.term1Score : "-"}
                              </td>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-medium text-slate-700">
                                {hasTerm2 ? item.term2Score : "-"}
                              </td>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-medium">
                                {item.ca1}
                              </td>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-medium">
                                {item.ca2}
                              </td>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-medium">
                                {item.exam}
                              </td>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-bold text-slate-900">
                                {thirdTotal}
                              </td>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-black text-blue-950 bg-yellow-50/60">
                                {cumulative}%
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-medium">
                                {item.ca1}
                              </td>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-medium">
                                {item.ca2}
                              </td>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-medium">
                                {item.exam}
                              </td>
                              <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-black text-blue-950 bg-yellow-50/50">
                                {item.totalScore}
                              </td>
                            </>
                          )}
                          <td className="py-[1.5px] px-0.5 border-r border-slate-200 text-center font-bold">
                            <span
                              className={`inline-block px-0.5 rounded text-[7.5px] ${
                                item.grade === "A"
                                  ? "bg-green-100 text-green-800 font-black"
                                  : item.grade === "B"
                                  ? "bg-blue-100 text-blue-800 font-bold"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {item.grade}
                            </span>
                          </td>
                          <td className="py-[1.5px] px-0.5 text-center text-[7.5px] font-medium text-slate-700 truncate">
                            {item.remark}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Cognitive Summary Strip - Dynamically Computed from Scores */}
            <div className="bg-blue-950 text-white px-2 py-0.5 flex items-center justify-between text-[8px] sm:text-[8.5px] font-bold">
              <span>Marks: {dynamicTotalScore} / {dynamicTotalPossible}</span>
              {hasCumulativeScores ? (
                <div className="flex items-center gap-2">
                  <span>
                    3rd Term Avg: <strong className="text-slate-200 text-[8.5px]">{dynamicTermAverage.toFixed(1)}%</strong>
                  </span>
                  <span>
                    Annual Cum Avg: <strong className="text-yellow-400 text-[9px]">{dynamicCumulativeAverage.toFixed(1)}%</strong>
                  </span>
                </div>
              ) : (
                <span>
                  Avg: <strong className="text-yellow-400 text-[9px]">{dynamicTermAverage.toFixed(1)}%</strong>
                </span>
              )}
              <span className="text-slate-300">Class Avg: {dynamicClassAverage.toFixed(1)}%</span>
            </div>
          </div>

          {/* RIGHT: COMPACT SIDE-BY-SIDE SKILLS & BEHAVIOUR (Col-span 5) */}
          <div className="col-span-12 sm:col-span-5 space-y-1">
            
            {/* Rating Scale Legend */}
            <div className="bg-yellow-50 border border-yellow-300 px-1 py-0.2 rounded text-[7px] text-center font-bold text-slate-800 flex justify-around">
              <span>5=Exc</span>
              <span>4=Good</span>
              <span>3=Fair</span>
              <span>2=Poor</span>
              <span>1=V.Poor</span>
            </div>

            {/* 1. Psychomotor Skills Table */}
            <div className="border border-blue-900 rounded-xs overflow-hidden">
              <div className="bg-blue-900 text-white font-bold px-1 py-0.2 text-[8px] uppercase tracking-wide text-center">
                Part 2: Psychomotor Skills
              </div>
              <table className="w-full text-left border-collapse text-[7.5px]">
                <thead>
                  <tr className="bg-blue-50 border-b border-blue-200 text-blue-950 font-bold">
                    <th className="py-0.2 px-1 border-r border-blue-200">Skill</th>
                    {[5, 4, 3, 2, 1].map((s) => (
                      <th key={s} className="py-0.2 px-0.2 text-center w-4 border-r border-blue-200 last:border-r-0">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {skillKeys.map((key) => {
                    const rating = data.skills[key];
                    return (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="py-[1px] px-1 border-r border-slate-200 font-medium text-slate-800 truncate">
                          {SKILL_LABELS[key]}
                        </td>
                        {[5, 4, 3, 2, 1].map((scale) => (
                          <td
                            key={scale}
                            className={`py-[1px] px-0.2 text-center border-r last:border-r-0 border-slate-200 font-bold ${
                              rating === scale ? "bg-blue-100 text-blue-900 font-black" : "text-slate-300"
                            }`}
                          >
                            {rating === scale ? "✓" : "-"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Affective Behaviour Table */}
            <div className="border border-blue-900 rounded-xs overflow-hidden">
              <div className="bg-blue-900 text-white font-bold px-1 py-0.2 text-[8px] uppercase tracking-wide text-center">
                Part 3: Affective Behaviour
              </div>
              <table className="w-full text-left border-collapse text-[7.5px]">
                <thead>
                  <tr className="bg-blue-50 border-b border-blue-200 text-blue-950 font-bold">
                    <th className="py-0.2 px-1 border-r border-blue-200">Behaviour Trait</th>
                    {[5, 4, 3, 2, 1].map((s) => (
                      <th key={s} className="py-0.2 px-0.2 text-center w-4 border-r border-blue-200 last:border-r-0">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {behaviourKeys.map((key) => {
                    const rating = data.behaviour[key];
                    return (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="py-[1px] px-1 border-r border-slate-200 font-medium text-slate-800 truncate">
                          {BEHAVIOUR_LABELS[key]}
                        </td>
                        {[5, 4, 3, 2, 1].map((scale) => (
                          <td
                            key={scale}
                            className={`py-[1px] px-0.2 text-center border-r last:border-r-0 border-slate-200 font-bold ${
                              rating === scale ? "bg-yellow-100 text-yellow-900 font-black" : "text-slate-300"
                            }`}
                          >
                            {rating === scale ? "✓" : "-"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* ================================================================== */}
        {/* 4. COMPACT FOOTER: PROMOTION & SIGNATURES (Single-Page Locked)     */}
        {/* ================================================================== */}
        <footer className="mt-1.5 border-t border-blue-800 pt-1 space-y-1">
          
          {/* Promotion Decision Ribbon (Only active in 3rd Term Promotional Evaluation) */}
          {isThirdTerm ? (
            <div className="bg-yellow-50 border border-yellow-300 px-2 py-0.5 rounded flex items-center justify-between text-[8.5px]">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-700" />
                <span className="font-bold text-slate-700">PROMOTION DECISION:</span>
                <span className="font-black text-blue-950 bg-yellow-400 px-1.5 py-0.1 rounded uppercase">
                  {data.decision || "PROMOTED"}
                </span>
              </div>
              <div className="text-[8px] text-slate-700 font-semibold">
                Promoted To: <strong className="text-blue-900 font-bold">{data.nextClass || "Next Class"}</strong>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50/80 border border-blue-200 px-2 py-0.5 rounded flex items-center justify-between text-[8.5px]">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-800" />
                <span className="font-bold text-slate-700">TERM EVALUATION STATUS:</span>
                <span className="font-black text-blue-950 bg-blue-100/90 border border-blue-300 px-2 py-0.1 rounded uppercase text-[7.5px]">
                  {data.termLabel?.toLowerCase().includes("first")
                    ? "First Term Completed • Proceeding to Second Term"
                    : "Second Term Completed • Proceeding to Third Term"}
                </span>
              </div>
              <div className="text-[7.5px] text-slate-600 font-semibold">
                Promotion Status: <span className="text-amber-800 font-bold">Awarded in Third Term Annual Cumulative Compilation</span>
              </div>
            </div>
          )}

          {/* 3 Horizontal Remarks & Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 text-[8px]">
            
            {/* Form Master */}
            <div className="border border-slate-300 rounded p-1 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <span className="font-bold text-blue-900 uppercase block border-b border-slate-200 pb-0.2 mb-0.2 text-[7.5px]">
                  Form Master&apos;s Remark
                </span>
                <p className="italic text-slate-800 leading-tight line-clamp-2 text-[7.5px]">
                  &quot;{data.formMasterComment}&quot;
                </p>
              </div>
              <div className="border-t border-slate-200 pt-0.5 mt-0.5 flex justify-between items-center text-[7.5px]">
                <span className="font-semibold text-slate-800">{data.formMasterName}</span>
                <span className="text-blue-800 italic">Sign: _________</span>
              </div>
            </div>

            {/* Principal / Director */}
            <div className="border border-blue-800 rounded p-1 bg-blue-50/40 flex flex-col justify-between">
              <div>
                <span className="font-bold text-blue-900 uppercase block border-b border-blue-200 pb-0.2 mb-0.2 text-[7.5px]">
                  Director / Principal&apos;s Remark
                </span>
                <p className="italic text-slate-800 leading-tight line-clamp-2 font-medium text-[7.5px]">
                  &quot;{data.principalRemark}&quot;
                </p>
              </div>
              <div className="border-t border-blue-200 pt-0.5 mt-0.5 flex justify-between items-center text-[7.5px]">
                <span className="font-black text-blue-950">{data.principalName}</span>
                <span className="text-blue-900 font-bold flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-blue-800" />
                  <span>[Official Seal]</span>
                </span>
              </div>
            </div>

            {/* Parent Acknowledgement */}
            <div className="border border-slate-300 rounded p-1 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <span className="font-bold text-blue-900 uppercase block border-b border-slate-200 pb-0.2 mb-0.2 text-[7.5px]">
                  Parent / Guardian Acknowledgment
                </span>
                <p className="text-[7px] text-slate-500 leading-tight">
                  I have inspected this terminal evaluation:
                </p>
                <div className="border-b border-dashed border-slate-300 h-2 my-0.2" />
              </div>
              <div className="border-t border-slate-200 pt-0.5 mt-0.5 flex justify-between items-center text-[7.5px]">
                <span className="text-slate-600">Parent Sign &amp; Date:</span>
                <span className="text-slate-400">______________</span>
              </div>
            </div>

          </div>

          {/* Validation note & Timestamp */}
          <div className="text-center text-[7px] text-slate-400 flex justify-between items-center pt-0.2">
            <span>Any alteration on this document renders it invalid.</span>
            <span>Printed on {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} &bull; Official GFMS Dynamic Result Engine</span>
          </div>

        </footer>

      </div>
    </div>
  );
}


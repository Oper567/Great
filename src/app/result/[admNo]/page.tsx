import { redirect } from "next/navigation";
import ReportCardView from "@/components/ReportCardView";
import ResultEmptyStateView from "@/components/ResultEmptyStateView";
import { SAMPLE_JSS_REPORT_CARD } from "@/data/mock-report-card";
import { getStudentPreparedResultAction } from "@/app/actions/terminal-result-admin";
import { getAdminSession, getResultAccessSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { AcademicTermType, ReportCardData, getOrdinalSuffix } from "@/types/report-card";
import { formatClassWithArm, parseClassAndArm } from "@/lib/cbt-utils";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Terminal Report Card | GFMS Result Portal",
  description: "Official Terminal Examination Report Card & Continuous Assessment Dossier",
};

interface PageProps {
  params: {
    admNo: string;
  };
  searchParams?: {
    name?: string;
    session?: string;
    term?: string;
    pending?: string;
    cardPreserved?: string;
  };
}

export default async function StudentResultViewPage({ params, searchParams }: PageProps) {
  const decodedAdmNo = decodeURIComponent(params.admNo).trim().toUpperCase();
  const session = searchParams?.session ? decodeURIComponent(searchParams.session) : "2025/2026";
  const term = searchParams?.term ? decodeURIComponent(searchParams.term) : "Third Term";

  // Enforce strict access authorization: either authenticated Admin/Teacher OR valid signed Scratch Card token
  const [adminSession, resultAccess] = await Promise.all([
    getAdminSession().catch(() => null),
    getResultAccessSession(decodedAdmNo, session, term).catch(() => null),
  ]);

  if (!adminSession && !resultAccess) {
    const query = new URLSearchParams({
      admNo: decodedAdmNo,
      session,
      term,
    });
    redirect(`/result?${query.toString()}`);
  }

  const checkCount = resultAccess && !resultAccess.pendingOnly ? resultAccess.checkCount : undefined;
  const maxCount = resultAccess && !resultAccess.pendingOnly ? resultAccess.maxCount ?? 3 : 3;

  // Fetch published dossier only when Admin OR non-pending verified scratch card token is present
  const dbResult =
    adminSession || (resultAccess && !resultAccess.pendingOnly)
      ? await getStudentPreparedResultAction(decodedAdmNo, session, term).catch(() => ({
          success: false,
          result: null,
          availableTerms: [] as string[],
          source: "DATABASE" as const,
        }))
      : await getStudentPreparedResultAction(decodedAdmNo, session, term)
          .then((res) => ({
            success: false,
            result: null,
            availableTerms: res?.availableTerms || [],
            source: "DATABASE" as const,
          }))
          .catch(() => ({
            success: false,
            result: null,
            availableTerms: [] as string[],
            source: "DATABASE" as const,
          }));

  if ((adminSession || (resultAccess && !resultAccess.pendingOnly)) && dbResult?.success && dbResult.result) {
    const res = dbResult.result;
    const totalScore = res.subjects.reduce((sum, s) => sum + (s.totalScore || 0), 0);
    const totalPossible = res.subjects.length * 100;
    const studentAverage = res.subjects.length > 0 ? parseFloat((totalScore / res.subjects.length).toFixed(1)) : 0;

    let termEnum: AcademicTermType = "THIRD_TERM";
    if (res.term?.toLowerCase().includes("first")) termEnum = "FIRST_TERM";
    else if (res.term?.toLowerCase().includes("second")) termEnum = "SECOND_TERM";

    const pos = res.position || 1;
    const posSuffix = getOrdinalSuffix(pos);

    const reportData: ReportCardData = {
      enrollmentId: `enr-${res.session.replace("/", "-")}-${res.admNo.replace(/\//g, "-")}`,
      session: res.session || session,
      term: termEnum,
      termLabel: res.termLabel || `${res.term} (${res.session})`,
      numberInClass: res.numberInClass || 35,
      positionInClass: pos,
      positionSuffix: posSuffix,
      nextClass: res.nextClass || "Next Class",
      nextTermBegins: res.nextTermBegins || "Monday, 14th September 2026",
      daysOpened: res.daysOpened ?? 115,
      daysPresent: res.daysPresent ?? 112,
      daysAbsent: res.daysAbsent ?? 3,
      totalScoreObtained: totalScore,
      totalScorePossible: totalPossible,
      studentAverage,
      classAverage:
        res.classAverage &&
        Math.abs(res.classAverage - 68.45) > 0.05 &&
        Math.abs(res.classAverage - 68.5) > 0.05
          ? res.classAverage
          : studentAverage,
      decision: res.decision || "PROMOTED",
      formMasterComment: res.teacherRemark || "An attentive and hardworking scholar.",
      formMasterName: res.formMasterName || "Mr. Emmanuel Eze (B.Sc Ed)",
      principalRemark: res.principalRemark || "Commendable distinction. Keep up the good work!",
      principalName: res.principalName || "Hon Okolie Peter Isioma JP MCArb (Director)",
      feeInfo: (res.feeInfo as any) || SAMPLE_JSS_REPORT_CARD.feeInfo,
      skills: (res.skills as any) || SAMPLE_JSS_REPORT_CARD.skills,
      behaviour: (res.behaviour as any) || SAMPLE_JSS_REPORT_CARD.behaviour,
      student: {
        id: `stu-${decodedAdmNo}`,
        admissionNumber: res.admNo || decodedAdmNo,
        fullName: res.studentName || "Student Name",
        firstName: res.studentName ? res.studentName.split(" ")[0] : "Student",
        lastName: res.studentName ? res.studentName.split(" ").slice(-1)[0] : "Scholar",
        className: formatClassWithArm(res.className || "Class", res.arm) || res.className || "Class",
        arm: parseClassAndArm(res.className || "", res.arm).arm || undefined,
        classCode: res.className ? res.className.replace(/\s+/g, "").substring(0, 4).toUpperCase() : "CLS",
        gender: res.gender || "FEMALE",
        division: res.division || (res.className?.startsWith("SS") || res.className?.startsWith("JSS") ? "SECONDARY" : "PRIMARY"),
        avatarUrl: res.studentPhotoUrl || undefined,
      },
      cognitiveGrades: res.subjects.map((sub, idx) => ({
        id: sub.id || `subj-${idx + 1}`,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode || "SUB",
        category: sub.category || "General",
        ca1: sub.ca1,
        ca2: sub.ca2,
        exam: sub.exam,
        totalScore: sub.totalScore,
        term1Score: sub.term1Score,
        term2Score: sub.term2Score,
        term3Total: sub.term3Total,
        cumulativeScore: sub.cumulativeScore,
        grade: sub.grade,
        remark: sub.remark,
      })),
    };

    const scratchCardCheckInfo =
      checkCount !== undefined
        ? {
            check: checkCount,
            max: maxCount,
          }
        : undefined;

    return (
      <main className="min-h-screen bg-slate-100 py-3 sm:py-5">
        <ReportCardView data={reportData} scratchCardCheckInfo={scratchCardCheckInfo} />
      </main>
    );
  }

  // Result NOT yet uploaded (or pending-only token): Show empty state
  let registeredStudent: any = null;
  try {
    registeredStudent = await prisma.student.findUnique({
      where: { admNo: decodedAdmNo },
    });
  } catch {
    // offline / db optional
  }

  const studentName = searchParams?.name
    ? decodeURIComponent(searchParams.name)
    : adminSession
      ? registeredStudent?.fullName || undefined
      : undefined;

  const className = registeredStudent?.currentClass || undefined;

  return (
    <ResultEmptyStateView
      admNo={decodedAdmNo}
      studentName={studentName}
      className={className}
      session={session}
      term={term}
      availableTerms={dbResult?.availableTerms || []}
      isRegisteredStudent={!!registeredStudent}
      cardPreserved={searchParams?.cardPreserved !== "false"}
    />
  );
}

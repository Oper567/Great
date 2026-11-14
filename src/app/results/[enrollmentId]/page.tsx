import ReportCardView from "@/components/ReportCardView";
import { SAMPLE_JSS_REPORT_CARD } from "@/data/mock-report-card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Terminal Report Card | GFMS Leadership Academy",
  description: "Official continuous assessment dossier and terminal examination report card.",
};

interface PageProps {
  params: {
    enrollmentId: string;
  };
}

export default function EnrollmentReportCardPage({ params }: PageProps) {
  // In an integrated database backend, this would fetch from prisma.termlyEnrollment.findUnique
  // For demonstration and testing, we supply the comprehensive JSS report card data.
  const reportData = {
    ...SAMPLE_JSS_REPORT_CARD,
    enrollmentId: params.enrollmentId,
  };

  return (
    <main className="min-h-screen bg-neutral-canvas py-4">
      <ReportCardView data={reportData} />
    </main>
  );
}

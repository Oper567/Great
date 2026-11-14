import ReportCardView from "@/components/ReportCardView";
import { SAMPLE_JSS_REPORT_CARD } from "@/data/mock-report-card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Official Terminal Report Card | Great-Favour Montessori School",
  description: "Official Junior Secondary School Terminal Report Card & Cognitive Assessment Dossier",
};

export default function DemoReportCardPage() {
  return (
    <main className="min-h-screen bg-neutral-canvas py-4">
      <ReportCardView data={SAMPLE_JSS_REPORT_CARD} />
    </main>
  );
}

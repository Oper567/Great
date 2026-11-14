"use client";

import React, { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Users,
  PlusCircle,
  KeyRound,
  Search,
  Trash2,
  Edit3,
  Copy,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  BookOpen,
  Sparkles,
  Layers,
  GraduationCap,
  ShieldCheck,
  Award,
} from "lucide-react";
import {
  createStudentAction,
  generateBatchStudentsAction,
  deleteStudentAction,
  updateStudentAction,
} from "@/app/actions/student-admin";
import {
  parseClassAndArm,
  formatClassWithArm,
  doesStudentMatchClassFilter,
} from "@/lib/cbt-utils";

interface Props {
  initialStudents: any[];
  onPrepareResult?: (student: {
    admNo: string;
    fullName?: string;
    currentClass?: string;
    arm?: string;
    gender?: string;
  }) => void;
}

export default function StudentRegistryTab({ initialStudents, onPrepareResult }: Props) {
  const [students, setStudents] = useState<any[]>(initialStudents);

  useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [selectedArmFilter, setSelectedArmFilter] = useState("ALL");
  const [copiedRegNo, setCopiedRegNo] = useState<string | null>(null);

  // Modals
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isPrintSlipsOpen, setIsPrintSlipsOpen] = useState(false);

  // Single Student Form State
  const [admNo, setAdmNo] = useState("");
  const [surname, setSurname] = useState("");
  const [fullName, setFullName] = useState("");
  const [currentClass, setCurrentClass] = useState("SS 1");
  const [arm, setArm] = useState("NONE");
  const [customArm, setCustomArm] = useState("");
  const [gender, setGender] = useState("MALE");
  const [session, setSession] = useState("2025/2026");

  // Batch Form State
  const [batchClass, setBatchClass] = useState("SS 2");
  const [batchArm, setBatchArm] = useState("NONE");
  const [batchCustomArm, setBatchCustomArm] = useState("");
  const [batchSession, setBatchSession] = useState("2025/2026");
  const [batchQuantity, setBatchQuantity] = useState(10);

  // Edit Student State
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openSingleModal = () => {
    setEditingStudentId(null);
    const yr = new Date().getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    setAdmNo(`GFMS/${yr}/${seq}`);
    setSurname("");
    setFullName("");
    setCurrentClass("SS 1");
    setArm("NONE");
    setCustomArm("");
    setGender("MALE");
    setSession("2025/2026");
    setFeedback(null);
    setIsSingleModalOpen(true);
  };

  const handleEditStudent = (st: any) => {
    setEditingStudentId(st.id);
    setAdmNo(st.admNo || st.adm_no);
    setSurname(st.surname);
    setFullName(st.fullName || st.full_name);
    const parsed = parseClassAndArm(st.currentClass || st.current_class, st.arm);
    setCurrentClass(parsed.baseLevel || st.currentClass || st.current_class);
    const existingArm = parsed.arm || "";
    if (["Science", "Art", "Commercial", "Diamond", "Platinum", "Gold"].includes(existingArm)) {
      setArm(existingArm);
      setCustomArm("");
    } else if (existingArm) {
      setArm("CUSTOM");
      setCustomArm(existingArm);
    } else {
      setArm("NONE");
      setCustomArm("");
    }
    setGender(st.gender || "MALE");
    setSession(st.session || "2025/2026");
    setFeedback(null);
    setIsSingleModalOpen(true);
  };

  const handleCopyRegNo = (regNo: string) => {
    navigator.clipboard.writeText(regNo);
    setCopiedRegNo(regNo);
    setTimeout(() => setCopiedRegNo(null), 2000);
  };

  const handleSaveSingle = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const rawArmInput = arm === "CUSTOM" ? customArm.trim() : arm === "NONE" ? "" : arm;
    const parsedInput = parseClassAndArm(currentClass, rawArmInput);
    const effectiveClass = parsedInput.baseLevel || currentClass.trim();
    const effectiveArm = parsedInput.arm || rawArmInput;

    const formData = new FormData();
    formData.append("admNo", admNo);
    formData.append("surname", surname);
    formData.append("fullName", fullName);
    formData.append("currentClass", effectiveClass);
    formData.append("arm", effectiveArm);
    formData.append("gender", gender);
    formData.append("session", session);

    startTransition(async () => {
      if (editingStudentId) {
        formData.append("studentId", String(editingStudentId));
        const res = await updateStudentAction(formData);
        if (!res.success) {
          setFeedback({ type: "error", text: res.error || "Failed to update student." });
        } else {
          setFeedback({ type: "success", text: "Student updated successfully!" });
          setStudents((prev) =>
            prev.map((s) =>
              s.id === editingStudentId
                ? { ...s, surname, fullName, currentClass: effectiveClass, arm: effectiveArm, gender }
                : s
            )
          );
          setTimeout(() => {
            setIsSingleModalOpen(false);
            setFeedback(null);
          }, 1000);
        }
      } else {
        const res = await createStudentAction(formData);
        if (!res.success) {
          setFeedback({ type: "error", text: res.error || "Failed to register student." });
        } else {
          setFeedback({ type: "success", text: `Student registered with RegNo: ${res.student.admNo}` });
          setStudents((prev) => [res.student, ...prev]);
          setTimeout(() => {
            setIsSingleModalOpen(false);
            setFeedback(null);
          }, 1000);
        }
      }
    });
  };

  const handleBatchGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const effectiveBatchArm = batchArm === "CUSTOM" ? batchCustomArm.trim() : batchArm === "NONE" ? "" : batchArm;

    const formData = new FormData();
    formData.append("currentClass", batchClass);
    formData.append("arm", effectiveBatchArm);
    formData.append("session", batchSession);
    formData.append("quantity", String(batchQuantity));

    startTransition(async () => {
      const res = await generateBatchStudentsAction(formData);
      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Failed to batch generate students." });
      } else {
        setFeedback({ type: "success", text: `Generated ${res.count} candidate RegNos for ${batchClass}${effectiveBatchArm ? ` (${effectiveBatchArm})` : ""}!` });
        if (res.students && res.students.length > 0) {
          setStudents((prev) => [...res.students!, ...prev]);
        }
        setTimeout(() => {
          setIsBatchModalOpen(false);
          setFeedback(null);
        }, 1200);
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this student record and their registration number?")) return;
    startTransition(async () => {
      const res = await deleteStudentAction(id);
      if (res.success) {
        setStudents((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(res.error || "Failed to delete student.");
      }
    });
  };

  const filteredStudents = students.filter((s) => {
    const aNo = (s.admNo || s.adm_no || "").toLowerCase();
    const sName = (s.surname || "").toLowerCase();
    const fName = (s.fullName || s.full_name || "").toLowerCase();
    const cName = s.currentClass || s.current_class || "";
    const sArm = s.arm || "";
    const combinedClassLabel = formatClassWithArm(cName, sArm).toLowerCase();

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      aNo.includes(q) ||
      sName.includes(q) ||
      fName.includes(q) ||
      sArm.toLowerCase().includes(q) ||
      combinedClassLabel.includes(q);

    const matchesClassAndArm = doesStudentMatchClassFilter(
      cName,
      sArm,
      selectedClassFilter,
      selectedArmFilter
    );
    return matchesSearch && matchesClassAndArm;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg sm:text-xl font-black text-white">
              Student Registration &amp; RegNo Command Desk
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Super Admin student authority. Generate, assign, and print official institutional Registration Numbers
            (<strong className="text-yellow-400 font-mono">RegNo</strong>) used by candidates for CBT exam login and
            scratch card result verification.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openSingleModal}
            className="px-3.5 py-2.5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-4 h-4 text-yellow-400" />
            <span>Register Student</span>
          </button>

          <button
            onClick={() => {
              setFeedback(null);
              setIsBatchModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Batch RegNo Mint</span>
          </button>

          {students.length > 0 && (
            <button
              onClick={() => setIsPrintSlipsOpen(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Print Candidate Slips</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row - Mobile Centric & Overflow Proof */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Card 1: Total Registered */}
        <div className="bg-slate-950/90 border border-slate-800/80 hover:border-blue-700/50 rounded-2xl p-3 sm:p-4 flex flex-col justify-between min-w-0 overflow-hidden shadow-sm transition group">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-900/40 border border-blue-700/60 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider truncate">
              Total Registered
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
              {students.length}
            </div>
            <div className="text-[10px] text-blue-400/80 font-medium truncate mt-0.5">
              Enrolled Candidates
            </div>
          </div>
        </div>

        {/* Card 2: Active Cohorts */}
        <div className="bg-slate-950/90 border border-slate-800/80 hover:border-emerald-700/50 rounded-2xl p-3 sm:p-4 flex flex-col justify-between min-w-0 overflow-hidden shadow-sm transition group">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-900/40 border border-emerald-700/60 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider truncate">
              Active Cohorts
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm md:text-base font-black text-emerald-400 leading-snug truncate">
              JSS &amp; SS Streams
            </div>
            <div className="text-[10px] text-emerald-500/80 font-medium truncate mt-0.5">
              Junior &amp; Senior Classes
            </div>
          </div>
        </div>

        {/* Card 3: RegNo Format */}
        <div className="bg-slate-950/90 border border-slate-800/80 hover:border-yellow-700/50 rounded-2xl p-3 sm:p-4 flex flex-col justify-between min-w-0 overflow-hidden shadow-sm transition group">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-yellow-900/40 border border-yellow-700/60 text-yellow-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider truncate">
              RegNo Format
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs md:text-sm font-black text-yellow-400 font-mono tracking-tight truncate">
              GFMS/YYYY/XXXX
            </div>
            <div className="text-[10px] text-yellow-500/80 font-medium truncate mt-0.5 font-mono">
              Institutional Pattern
            </div>
          </div>
        </div>

        {/* Card 4: Auth Mode */}
        <div className="bg-slate-950/90 border border-slate-800/80 hover:border-purple-700/50 rounded-2xl p-3 sm:p-4 flex flex-col justify-between min-w-0 overflow-hidden shadow-sm transition group">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-900/40 border border-purple-700/60 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider truncate">
              Auth Mode
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm md:text-base font-black text-purple-300 leading-snug truncate">
              RegNo + Surname
            </div>
            <div className="text-[10px] text-purple-400/80 font-medium truncate mt-0.5">
              Secure Dual Auth
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student by RegNo, Surname, or Full Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
          />
        </div>

        <select
          value={selectedClassFilter}
          onChange={(e) => setSelectedClassFilter(e.target.value)}
          className="w-full sm:w-52 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-xs text-slate-300 focus:outline-none focus:border-yellow-500"
        >
          <option value="ALL">All Classes</option>
          <option value="SS 1">Senior Sec 1 (SS 1)</option>
          <option value="SS 2">Senior Sec 2 (SS 2 - All Streams)</option>
          <option value="SS 2 (Science)">SS 2 (Science Stream)</option>
          <option value="SS 2 (Art)">SS 2 (Art Stream)</option>
          <option value="SS 2 (Commercial)">SS 2 (Commercial Stream)</option>
          <option value="SS 3">Senior Sec 3 (SS 3 - All Streams)</option>
          <option value="SS 3 (Science)">SS 3 (Science Stream)</option>
          <option value="SS 3 (Art)">SS 3 (Art Stream)</option>
          <option value="SS 3 (Commercial)">SS 3 (Commercial Stream)</option>
          <option value="JSS 1">Junior Sec 1 (JSS 1)</option>
          <option value="JSS 2">Junior Sec 2 (JSS 2)</option>
          <option value="JSS 3">Junior Sec 3 (JSS 3)</option>
        </select>

        <select
          value={selectedArmFilter}
          onChange={(e) => setSelectedArmFilter(e.target.value)}
          className="w-full sm:w-44 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 font-semibold"
          title="Filter candidates by Arm / Stream"
        >
          <option value="ALL">All Streams / Arms</option>
          <option value="Science">Science Stream</option>
          <option value="Art">Art Stream</option>
          <option value="Commercial">Commercial Stream</option>
          <option value="Diamond">Diamond Arm</option>
          <option value="Platinum">Platinum Arm</option>
          <option value="Gold">Gold Arm</option>
          <option value="NONE">General / No Stream</option>
        </select>
      </div>

      {/* Student Registry Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Student Registry &amp; Examination Candidates ({filteredStudents.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            RegNo is the student&apos;s primary credential for CBT and Result Checking
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs">No registered students found matching your search.</p>
            <button
              onClick={openSingleModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register First Candidate</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (Visible on small screens) */}
            <div className="md:hidden divide-y divide-slate-800">
              {filteredStudents.map((st) => {
                const regNo = st.admNo || st.adm_no;
                const fName = st.fullName || st.full_name;
                const cName = st.currentClass || st.current_class;
                const attemptsCount = st._count?.attempts ?? 0;

                return (
                  <div key={st.id} className="p-3 sm:p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-sm truncate">{fName}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <code className="font-mono font-bold text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-800/60 text-xs shrink-0">
                            {regNo}
                          </code>
                          <button
                            onClick={() => handleCopyRegNo(regNo)}
                            className="p-1 text-slate-400 hover:text-white transition active:scale-95 shrink-0"
                            title="Copy RegNo"
                          >
                            {copiedRegNo === regNo ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/50 text-blue-300 border border-blue-700">
                          {cName}
                        </span>
                        {st.arm && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                            {st.arm}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-900/60 p-2 sm:p-2.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] block">Login Key</span>
                        <span className="font-mono text-slate-200 font-bold">{st.surname}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] block">Gender</span>
                        <span className="text-slate-300 font-medium">{st.gender || "MALE"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] block">Attempts</span>
                        <span className="text-emerald-400 font-bold font-mono">{attemptsCount} Exams</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (onPrepareResult) {
                            onPrepareResult({
                              admNo: regNo,
                              fullName: fName,
                              currentClass: formatClassWithArm(cName, st.arm),
                              arm: st.arm || "",
                              gender: st.gender,
                            });
                          }
                        }}
                        className="flex-1 py-1.5 sm:py-2 px-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700/60 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 text-center shadow-sm min-w-0"
                        title="Prepare Student Report Card Dossier"
                      >
                        <Award className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                        <span className="truncate">Report Card</span>
                      </button>

                      <Link
                        href={`/result/${encodeURIComponent(regNo)}?name=${encodeURIComponent(fName)}`}
                        target="_blank"
                        className="p-1.5 sm:p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition flex items-center justify-center active:scale-95 shrink-0"
                        title="Preview Public Student Report Card"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => handleEditStudent(st)}
                        className="py-1.5 sm:py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 shrink-0"
                        title="Edit Student"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Edit</span>
                      </button>

                      <button
                        onClick={() => handleDelete(st.id)}
                        className="p-1.5 sm:p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl transition flex items-center justify-center active:scale-95 shrink-0"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="p-3 font-semibold">Registration Number (RegNo)</th>
                    <th className="p-3 font-semibold">Student Full Name</th>
                    <th className="p-3 font-semibold">Login Key (Surname)</th>
                    <th className="p-3 font-semibold">Class Assigned</th>
                    <th className="p-3 font-semibold text-center">Gender</th>
                    <th className="p-3 font-semibold text-center">CBT Attempts</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredStudents.map((st) => {
                    const regNo = st.admNo || st.adm_no;
                    const fName = st.fullName || st.full_name;
                    const cName = st.currentClass || st.current_class;
                    const attemptsCount = st._count?.attempts ?? 0;

                    return (
                      <tr key={st.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-bold text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-800/60">
                              {regNo}
                            </code>
                            <button
                              onClick={() => handleCopyRegNo(regNo)}
                              className="p-1 text-slate-400 hover:text-white transition"
                              title="Copy RegNo"
                            >
                              {copiedRegNo === regNo ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-white">{fName}</td>
                        <td className="p-3">
                          <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {st.surname}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-900/50 text-blue-300 border border-blue-700">
                              {cName}
                            </span>
                            {st.arm && (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                                {st.arm}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center text-slate-400 text-[11px]">{st.gender || "MALE"}</td>
                        <td className="p-3 text-center font-mono font-bold text-white">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                            {attemptsCount} Exams
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (onPrepareResult) {
                                  onPrepareResult({
                                    admNo: regNo,
                                    fullName: fName,
                                    currentClass: formatClassWithArm(cName, st.arm),
                                    arm: st.arm || "",
                                    gender: st.gender,
                                  });
                                }
                              }}
                              className="px-2.5 py-1.5 bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700/60 rounded-lg transition flex items-center gap-1.5 font-bold text-xs shadow-sm active:scale-95"
                              title="Prepare Student Report Card Dossier"
                            >
                              <Award className="w-3.5 h-3.5 text-yellow-400" />
                              <span>Report Card</span>
                            </button>

                            <Link
                              href={`/result/${encodeURIComponent(regNo)}?name=${encodeURIComponent(fName)}`}
                              target="_blank"
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition"
                              title="Preview Public Student Report Card"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleEditStudent(st)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                              title="Edit Student"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(st.id)}
                              className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg transition"
                              title="Delete Student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ================================================================== */}
      {/* MODAL 1: REGISTER SINGLE STUDENT                                   */}
      {/* ================================================================== */}
      {isSingleModalOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sheet-panel bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white">
                  {editingStudentId ? "Edit Student Details" : "Register Candidate & Mint RegNo"}
                </h3>
              </div>
              <button
                onClick={() => setIsSingleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                  feedback.type === "success"
                    ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                    : "bg-rose-950/80 border-rose-700 text-rose-300"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveSingle} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Registration Number (RegNo)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={admNo}
                    disabled={!!editingStudentId}
                    onChange={(e) => setAdmNo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-yellow-400 font-mono font-bold focus:border-yellow-500 focus:outline-none uppercase disabled:opacity-60"
                  />
                  {!editingStudentId && (
                    <button
                      type="button"
                      onClick={() => {
                        const yr = new Date().getFullYear();
                        const seq = Math.floor(1000 + Math.random() * 9000);
                        setAdmNo(`GFMS/${yr}/${seq}`);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 whitespace-nowrap"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Surname (Login Key) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Okeke"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Somtochukwu Grace Okeke"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Current Class *
                  </label>
                  <input
                    type="text"
                    required
                    list="gfms-registry-classes"
                    placeholder="e.g. SS 2, JSS 1"
                    value={currentClass}
                    onChange={(e) => setCurrentClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                  <datalist id="gfms-registry-classes">
                    <option value="JSS 1" />
                    <option value="JSS 2" />
                    <option value="JSS 3" />
                    <option value="SS 1" />
                    <option value="SS 2" />
                    <option value="SS 3" />
                    <option value="Primary 1" />
                    <option value="Primary 2" />
                    <option value="Primary 3" />
                    <option value="Primary 4" />
                    <option value="Primary 5" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Arm / Stream (Optional)
                  </label>
                  <select
                    value={arm}
                    onChange={(e) => {
                      setArm(e.target.value);
                      if (e.target.value !== "CUSTOM") setCustomArm("");
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="NONE">-- Optional / General --</option>
                    <option value="Science">Science</option>
                    <option value="Art">Art / Arts</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Diamond">Diamond</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Gold">Gold</option>
                    <option value="CUSTOM">Type Manual Custom Arm...</option>
                  </select>
                </div>
              </div>

              {arm === "CUSTOM" && (
                <div>
                  <label className="block text-[11px] font-semibold text-yellow-400 mb-1">
                    Custom Arm / Stream Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diamond, Gold, Tech, Humanities..."
                    value={customArm}
                    onChange={(e) => setCustomArm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-yellow-500/70 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Academic Session
                </label>
                <input
                  type="text"
                  required
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {isPending ? "Saving..." : editingStudentId ? "Update Student" : "Register Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 2: BATCH REGNO MINT                                          */}
      {/* ================================================================== */}
      {isBatchModalOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sheet-panel bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white">Batch Mint Class RegNos</h3>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                  feedback.type === "success"
                    ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                    : "bg-rose-950/80 border-rose-700 text-rose-300"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleBatchGenerate} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Target Class *
                  </label>
                  <select
                    value={batchClass}
                    onChange={(e) => setBatchClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="SS 1">Senior Secondary 1 (SS 1)</option>
                    <option value="SS 2">Senior Secondary 2 (SS 2)</option>
                    <option value="SS 3">Senior Secondary 3 (SS 3)</option>
                    <option value="JSS 1">Junior Secondary 1 (JSS 1)</option>
                    <option value="JSS 2">Junior Secondary 2 (JSS 2)</option>
                    <option value="JSS 3">Junior Secondary 3 (JSS 3)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Arm / Stream (Optional)
                  </label>
                  <select
                    value={batchArm}
                    onChange={(e) => {
                      setBatchArm(e.target.value);
                      if (e.target.value !== "CUSTOM") setBatchCustomArm("");
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="NONE">-- Optional / General --</option>
                    <option value="Science">Science</option>
                    <option value="Art">Art / Arts</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Diamond">Diamond</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Gold">Gold</option>
                    <option value="CUSTOM">Custom Manual Arm...</option>
                  </select>
                </div>
              </div>

              {batchArm === "CUSTOM" && (
                <div>
                  <label className="block text-[11px] font-semibold text-yellow-400 mb-1">
                    Custom Arm / Stream Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diamond, Gold, Tech..."
                    value={batchCustomArm}
                    onChange={(e) => setBatchCustomArm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-yellow-500/70 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Academic Session
                </label>
                <input
                  type="text"
                  required
                  value={batchSession}
                  onChange={(e) => setBatchSession(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Quantity of Candidate RegNos
                </label>
                <select
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option value="5">5 Candidates</option>
                  <option value="10">10 Candidates</option>
                  <option value="25">25 Candidates</option>
                  <option value="50">50 Candidates</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {isPending ? "Generating..." : `Mint ${batchQuantity} RegNos`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 3: PRINT CANDIDATE EXAMINATION SLIPS                         */}
      {/* ================================================================== */}
      {isPrintSlipsOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="sheet-panel sheet-flush bg-white text-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Printable Candidate Examination &amp; Result Slips ({filteredStudents.length})
                </h3>
                <p className="text-xs text-slate-600">
                  Official candidate photocard vouchers for CBT Examination Desk and Result Portal Access
                  {selectedClassFilter !== "ALL" || selectedArmFilter !== "ALL"
                    ? ` — Filtered by ${selectedClassFilter !== "ALL" ? selectedClassFilter : "All Classes"}${selectedArmFilter !== "ALL" ? ` (${selectedArmFilter})` : ""}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                  }}
                  className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print {filteredStudents.length} Slip{filteredStudents.length === 1 ? "" : "s"}</span>
                </button>
                <button
                  onClick={() => setIsPrintSlipsOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 print:p-0 print:bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
                {filteredStudents.map((st) => {
                  const parsedSlip = parseClassAndArm(st.currentClass || st.current_class, st.arm);
                  return (
                  <div
                    key={st.id}
                    className="border-2 border-dashed border-blue-900 rounded-2xl p-4 bg-white shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-950 p-1 flex items-center justify-center">
                          <Image
                            src="/assets/images/school-logo.jpg"
                            alt="GFMS Logo"
                            width={28}
                            height={28}
                            className="rounded-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="font-black text-[11px] text-blue-950 leading-none">
                            GREAT-FAVOUR MONTESSORI SCHOOL
                          </div>
                          <div className="text-[9px] font-bold text-yellow-600 uppercase mt-0.5">
                            CBT Examination &amp; Result Docket
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                          {parsedSlip.baseLevel || st.currentClass || st.current_class}
                        </span>
                        {parsedSlip.arm && (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded">
                            {parsedSlip.arm}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs">
                        <span className="text-slate-500 text-[10px] block">Candidate Full Name:</span>
                        <strong className="text-slate-900 font-bold text-sm">
                          {st.fullName || st.full_name}
                        </strong>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-center">
                        <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase">Registration Number</div>
                          <div className="text-sm font-black font-mono text-blue-950">
                            {st.admNo || st.adm_no}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase">Candidate Surname</div>
                          <div className="text-sm font-black font-mono text-emerald-800">
                            {st.surname}
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-500 flex justify-between pt-1 font-mono">
                        <span>CBT Login: greatfavourmontessori.com.ng/cbt</span>
                        <span>Result: /result</span>
                      </div>
                    </div>

                    <div className="text-[8px] text-slate-400 border-t border-slate-100 pt-1 leading-tight">
                      &bull; Keep this slip confidential. Your Surname is required alongside your RegNo for system access.
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

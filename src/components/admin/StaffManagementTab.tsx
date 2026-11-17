"use client";

import React, { useState, useTransition, useEffect } from "react";
import {
  UserCheck,
  PlusCircle,
  Search,
  Trash2,
  Lock,
  Mail,
  BookOpen,
  GraduationCap,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  createTeacherAccountAction,
  deleteTeacherAccountAction,
} from "@/app/actions/staff-admin";
import { ToastBanner, ToastFeedbackState } from "@/components/ui/ToastBanner";

interface Props {
  initialTeachers: any[];
}

export default function StaffManagementTab({ initialTeachers }: Props) {
  const [teachers, setTeachers] = useState<any[]>(initialTeachers);

  useEffect(() => {
    setTeachers(initialTeachers);
  }, [initialTeachers]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionToast, setActionToast] = useState<ToastFeedbackState | null>(null);
  const showToast = (type: "success" | "error", text: string, durationMs = 3600) => {
    setActionToast({ type, text });
    if (durationMs > 0) {
      setTimeout(() => {
        setActionToast((prev) => (prev?.text === text ? null : prev));
      }, durationMs);
    }
  };

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assignedSubject, setAssignedSubject] = useState("Mathematics");
  const [assignedClass, setAssignedClass] = useState("SS 1");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("TEACHER");

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const openAddModal = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setAssignedSubject("Mathematics");
    setAssignedClass("SS 1");
    setPhone("");
    setRole("TEACHER");
    setFeedback(null);
    setIsAddModalOpen(true);
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("assignedSubject", assignedSubject);
    formData.append("assignedClass", assignedClass);
    formData.append("phone", phone);
    formData.append("role", role);

    startTransition(async () => {
      const res = await createTeacherAccountAction(formData);
      if (!res.success) {
        const errMsg = res.error || "Failed to create teacher account.";
        setFeedback({ type: "error", text: errMsg });
        showToast("error", errMsg);
      } else {
        const okMsg = `Created! Account ready for ${res.teacher.fullName}. They can now log in at /staff/login.`;
        setFeedback({
          type: "success",
          text: okMsg,
        });
        showToast("success", `Created! Staff account ready for ${res.teacher.fullName}.`);
        setTeachers((prev) => [res.teacher, ...prev]);
        setTimeout(() => {
          setIsAddModalOpen(false);
          setFeedback(null);
        }, 1200);
      }
    });
  };

  const handleDeleteTeacher = (id: number) => {
    if (!confirm("Are you sure you want to remove this staff account?")) return;
    startTransition(async () => {
      const res = await deleteTeacherAccountAction(id);
      if (res.success) {
        setTeachers((prev) => prev.filter((t) => t.id !== id));
        showToast("success", "Removed! Staff account deleted.");
      } else {
        showToast("error", res.error || "Failed to delete staff member.");
      }
    });
  };

  const handleCopyEmail = (em: string) => {
    navigator.clipboard.writeText(em);
    setCopiedEmail(em);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const filteredTeachers = teachers.filter((t) => {
    const name = (t.fullName || "").toLowerCase();
    const em = (t.email || "").toLowerCase();
    const subj = (t.assignedSubject || "").toLowerCase();
    const cls = (t.assignedClass || "").toLowerCase();
    const q = searchQuery.toLowerCase();

    return name.includes(q) || em.includes(q) || subj.includes(q) || cls.includes(q);
  });

  return (
    <div className="space-y-6">
      <ToastBanner toast={actionToast} onDismiss={() => setActionToast(null)} />
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg sm:text-xl font-black text-white">
              Staff &amp; Teacher Accounts Desk
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Super Admin staff management. Add teachers, assign subjects and classes, and issue credentials for question
            uploads and theory scoring.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition"
        >
          <PlusCircle className="w-4 h-4 text-yellow-400" />
          <span>Add New Teacher / HOD</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Total Staff</div>
            <div className="text-base sm:text-lg font-black text-white truncate">{teachers.length}</div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Disciplines</div>
            <div className="text-xs sm:text-lg font-black text-emerald-400 truncate">Core Subjects</div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Coverage</div>
            <div className="text-xs sm:text-base font-black text-yellow-400 truncate">JSS 1 – SS 3</div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 border border-purple-700 text-purple-400 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Staff Portal</div>
            <div className="text-xs sm:text-base font-black text-purple-300 truncate">/staff/login</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search staff by name, institutional email, assigned subject, or class..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Staff Directory Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Academic Staff Directory ({filteredTeachers.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Teachers can access the Question Desk and Theory Scoring Desk
          </span>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-3">
            <UserCheck className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs">No staff members found matching your search.</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add First Staff Account</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (Visible on small screens) */}
            <div className="md:hidden divide-y divide-slate-800">
              {filteredTeachers.map((t) => {
                const isSuper = t.role === "SUPER_ADMIN";
                return (
                  <div key={t.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                          <span>{t.fullName}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                              isSuper
                                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                                : "bg-blue-900/40 text-blue-300 border border-blue-700"
                            }`}
                          >
                            {t.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {t.phone || "No phone recorded"}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800 shrink-0">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 gap-2">
                      <div className="min-w-0">
                        <span className="text-slate-500 uppercase text-[9px] font-bold block">Subject</span>
                        <span className="font-bold text-purple-300 truncate block">
                          {t.assignedSubject || "General"}
                        </span>
                      </div>
                      <div className="text-center min-w-0">
                        <span className="text-slate-500 uppercase text-[9px] font-bold block">Class</span>
                        <span className="font-bold text-blue-300 truncate block">
                          {t.assignedClass || "All Classes"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 uppercase text-[9px] font-bold block">Access</span>
                        <span className="text-emerald-400 font-bold font-mono text-[10px]">CBT Desk</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="font-mono text-slate-300 text-xs truncate">
                          {t.email}
                        </span>
                        <button
                          onClick={() => handleCopyEmail(t.email)}
                          className="p-1 text-slate-400 hover:text-white transition active:scale-95 shrink-0"
                          title="Copy Email"
                        >
                          {copiedEmail === t.email ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {!isSuper && (
                        <button
                          onClick={() => handleDeleteTeacher(t.id)}
                          className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-semibold transition active:scale-95 flex items-center gap-1 shrink-0"
                          title="Delete Teacher Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden xs:inline">Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="p-3 font-semibold">Teacher Name &amp; Role</th>
                    <th className="p-3 font-semibold">Institutional Email</th>
                    <th className="p-3 font-semibold">Assigned Subject</th>
                    <th className="p-3 font-semibold">Assigned Class</th>
                    <th className="p-3 font-semibold text-center">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredTeachers.map((t) => {
                    const isSuper = t.role === "SUPER_ADMIN";
                    return (
                      <tr key={t.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{t.fullName}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                                isSuper
                                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                                  : "bg-blue-900/40 text-blue-300 border border-blue-700"
                              }`}
                            >
                              {t.role}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">{t.phone || "No phone recorded"}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-300 text-xs">{t.email}</span>
                            <button
                              onClick={() => handleCopyEmail(t.email)}
                              className="p-1 text-slate-400 hover:text-white transition"
                              title="Copy Email"
                            >
                              {copiedEmail === t.email ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-900/40 text-purple-300 border border-purple-700">
                            {t.assignedSubject || "General"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-900/50 text-blue-300 border border-blue-700">
                            {t.assignedClass || "All Classes"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                            Active
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {!isSuper && (
                            <button
                              onClick={() => handleDeleteTeacher(t.id)}
                              className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg transition ml-auto"
                              title="Delete Teacher Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
      {/* MODAL: ADD NEW TEACHER ACCOUNT                                     */}
      {/* ================================================================== */}
      {isAddModalOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sheet-panel bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white">Create Staff / Teacher Account</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Name &amp; Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Emmanuel Eze (B.Sc Ed)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Institutional Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. eze@gfms.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Initial Password *
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-yellow-400 font-mono focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Assigned Subject *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics"
                    value={assignedSubject}
                    onChange={(e) => setAssignedSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Assigned Class *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SS 2"
                    value={assignedClass}
                    onChange={(e) => setAssignedClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Designated Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="TEACHER">Subject Teacher / Examiner</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Phone Contact (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08031234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {isPending ? "Creating Account..." : "Create Teacher Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

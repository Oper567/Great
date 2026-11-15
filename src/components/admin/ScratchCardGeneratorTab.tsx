"use client";

import React, { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import {
  CreditCard,
  PlusCircle,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  RotateCcw,
  Trash2,
  Search,
  Lock,
  Layers,
  Sparkles,
  ShieldCheck,
  Calendar,
  X,
  UserCheck,
} from "lucide-react";
import {
  generateScratchCardsAction,
  deleteScratchCardAction,
  resetScratchCardAction,
} from "@/app/actions/scratch-card-admin";

interface Props {
  initialCardsData: {
    cards: any[];
    stats?: {
      total: number;
      active: number;
      exhausted: number;
      assigned: number;
    } | null;
  };
}

export default function ScratchCardGeneratorTab({ initialCardsData }: Props) {
  const [cards, setCards] = useState<any[]>(initialCardsData?.cards || []);

  useEffect(() => {
    if (initialCardsData?.cards) {
      setCards(initialCardsData.cards);
    }
  }, [initialCardsData]);
  const [quantity, setQuantity] = useState<number>(10);
  const [session, setSession] = useState("2025/2026");
  const [term, setTerm] = useState("Third Term");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "EXHAUSTED" | "ASSIGNED">("ALL");

  const [isPending, startTransition] = useTransition();
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Printable Slips Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Stats calculation
  const totalCount = cards.length;
  const activeCount = cards.filter((c) => c.status === "active" && (c.usageCount || 0) < (c.maxUsage || 3)).length;
  const exhaustedCount = cards.filter((c) => c.status === "exhausted" || (c.usageCount || 0) >= (c.maxUsage || 3)).length;
  const assignedCount = cards.filter((c) => !!c.admNo).length;

  const handleGenerateCards = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.append("quantity", String(quantity));
    formData.append("session", session);
    formData.append("term", term);

    startTransition(async () => {
      const res = await generateScratchCardsAction(formData);
      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Failed to generate scratch cards." });
      } else {
        setFeedback({
          type: "success",
          text: `Successfully created ${res.count} scratch cards with strictly 3-check usage limit!`,
        });
        if (res.cards && res.cards.length > 0) {
          setCards((prev) => [...res.cards!, ...prev]);
        }
      }
    });
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  const handleDeleteCard = (cardId: string) => {
    if (!confirm("Are you sure you want to delete this scratch card PIN?")) return;
    startTransition(async () => {
      const res = await deleteScratchCardAction(cardId);
      if (res.success) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
      } else {
        alert(res.error || "Failed to delete card.");
      }
    });
  };

  const handleResetCard = (cardId: string) => {
    if (!confirm("Reset this scratch card back to 0 checks and clear the student lock?")) return;
    startTransition(async () => {
      const res = await resetScratchCardAction(cardId);
      if (res.success) {
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, usageCount: 0, admNo: null, status: "active" } : c))
        );
      } else {
        alert(res.error || "Failed to reset card.");
      }
    });
  };

  const filteredCards = cards.filter((c) => {
    const pin = (c.pin || "").toLowerCase();
    const sn = (c.serialNumber || "").toLowerCase();
    const adm = (c.admNo || "").toLowerCase();
    const matchesSearch =
      pin.includes(searchQuery.toLowerCase()) ||
      sn.includes(searchQuery.toLowerCase()) ||
      adm.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const max = c.maxUsage || 3;
    if (statusFilter === "ACTIVE") return c.status === "active" && (c.usageCount || 0) < max;
    if (statusFilter === "EXHAUSTED") return c.status === "exhausted" || (c.usageCount || 0) >= max;
    if (statusFilter === "ASSIGNED") return !!c.admNo;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg sm:text-xl font-black text-white">
              Scratch Card Generator & Inventory
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Super Admin issuance portal. Generate, monitor, and print official GFMS result verification PINs.
            <strong className="text-yellow-400"> Strictly 3 checks permitted per card PIN</strong> with student
            admission number locking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cards.length > 0 && (
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Print Batch Slips</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Total PINs</div>
            <div className="text-base sm:text-lg font-black text-white truncate">{totalCount}</div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Active PINs</div>
            <div className="text-base sm:text-lg font-black text-emerald-400 truncate">{activeCount}</div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 border border-purple-700 text-purple-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">In Use / Locked</div>
            <div className="text-base sm:text-lg font-black text-purple-300 truncate">{assignedCount}</div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-rose-900/40 border border-rose-700 text-rose-400 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Exhausted (3 Max)</div>
            <div className="text-base sm:text-lg font-black text-rose-400 truncate">{exhaustedCount}</div>
          </div>
        </div>
      </div>

      {/* Generator Control Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Batch PIN Generator
            </h3>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full self-start xs:self-auto">
            Enforced Rule: Max 3 Checks Per PIN
          </span>
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

        <form onSubmit={handleGenerateCards} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Quantity to Mint
            </label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="1">1 PIN</option>
              <option value="5">5 PINs</option>
              <option value="10">10 PINs (Recommended)</option>
              <option value="25">25 PINs</option>
              <option value="50">50 PINs</option>
              <option value="100">100 PINs</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Academic Session
            </label>
            <input
              type="text"
              required
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Academic Term
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4 text-yellow-400" />
              <span>{isPending ? "Minting PINs..." : `Generate ${quantity} Cards`}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by PIN (GFMS-...), Serial Number, or Student Admission Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(["ALL", "ACTIVE", "EXHAUSTED", "ASSIGNED"] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold transition whitespace-nowrap ${
                statusFilter === filterKey
                  ? "bg-blue-700 text-white"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {filterKey === "ALL" && `All (${cards.length})`}
              {filterKey === "ACTIVE" && `Active (${activeCount})`}
              {filterKey === "EXHAUSTED" && `Exhausted (${exhaustedCount})`}
              {filterKey === "ASSIGNED" && `Locked (${assignedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Cards Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Scratch Card Inventory ({filteredCards.length})</span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={filteredCards.length === 0}
              className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition active:scale-95"
              title="Print official cut-out voucher slips on standard A4 paper"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              <span>Print A4 Voucher Sheets ({filteredCards.length})</span>
            </button>
            <span className="hidden lg:inline text-[11px] text-slate-400">
              Card PIN locks to the first student admission number upon check #1
            </span>
          </div>
        </div>

        {filteredCards.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-3">
            <CreditCard className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs">No scratch cards found matching your query.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (Visible on small screens) */}
            <div className="md:hidden divide-y divide-slate-800">
              {filteredCards.map((card) => {
                const max = card.maxUsage || 3;
                const count = card.usageCount || 0;
                const isExhausted = card.status === "exhausted" || count >= max;
                const isAssigned = !!card.admNo;

                return (
                  <div key={card.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-yellow-400 bg-yellow-950/40 px-2.5 py-1 rounded-lg border border-yellow-800/60 text-sm">
                          {card.pin}
                        </code>
                        <button
                          onClick={() => handleCopyPin(card.pin)}
                          className="p-1.5 text-slate-400 hover:text-white transition active:scale-95 rounded-md bg-slate-900 border border-slate-800"
                          title="Copy PIN"
                        >
                          {copiedPin === card.pin ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          isExhausted
                            ? "bg-rose-950/70 text-rose-400 border border-rose-800"
                            : count === 0
                            ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800"
                            : "bg-amber-950/70 text-amber-300 border border-amber-800"
                        }`}
                      >
                        {isExhausted ? "Exhausted" : count === 0 ? "Fresh Active" : `${count}/${max} Used`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-center text-[11px]">
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] font-bold block">Usage</span>
                        <span className="font-mono font-bold text-white">
                          {count} / {max}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] font-bold block">Term</span>
                        <span className="text-slate-300 font-medium truncate block">
                          {card.term || "Third Term"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] font-bold block">Serial No</span>
                        <span className="font-mono text-slate-400 truncate block">
                          {card.serialNumber ? card.serialNumber.slice(-8) : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="min-w-0">
                        {isAssigned ? (
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            <span className="font-mono font-bold text-yellow-400 text-xs">
                              {card.admNo}
                            </span>
                            {card.studentName && (
                              <span className="text-slate-300 text-xs truncate max-w-[130px]">
                                &bull; {card.studentName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs italic">
                            Unassigned (locks on check #1)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(count > 0 || isAssigned) && (
                          <button
                            onClick={() => handleResetCard(card.id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition active:scale-95"
                            title="Reset usage count to 0 and unlock student admission"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg transition active:scale-95"
                          title="Delete Card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                    <th className="p-3 font-semibold">Security PIN</th>
                    <th className="p-3 font-semibold">Serial Number</th>
                    <th className="p-3 font-semibold">Session / Term</th>
                    <th className="p-3 font-semibold text-center">Usage Count</th>
                    <th className="p-3 font-semibold">Assigned Student</th>
                    <th className="p-3 font-semibold text-center">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredCards.map((card) => {
                    const max = card.maxUsage || 3;
                    const count = card.usageCount || 0;
                    const isExhausted = card.status === "exhausted" || count >= max;
                    const isAssigned = !!card.admNo;

                    return (
                      <tr key={card.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-bold text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-800/60">
                              {card.pin}
                            </code>
                            <button
                              onClick={() => handleCopyPin(card.pin)}
                              className="p-1 text-slate-400 hover:text-white transition"
                              title="Copy PIN"
                            >
                              {copiedPin === card.pin ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">
                          {card.serialNumber || "—"}
                        </td>
                        <td className="p-3 text-[11px]">
                          <div className="text-slate-300 font-medium">{card.session || "2025/2026"}</div>
                          <div className="text-slate-500 text-[10px]">{card.term || "Third Term"}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                              count === 0
                                ? "bg-slate-800 text-slate-300"
                                : count < max
                                ? "bg-amber-950 text-amber-300 border border-amber-700"
                                : "bg-rose-950 text-rose-300 border border-rose-700"
                            }`}
                          >
                            {count} / {max} Checks
                          </span>
                        </td>
                        <td className="p-3">
                          {isAssigned ? (
                            <div className="flex items-center gap-1.5">
                              <Lock className="w-3 h-3 text-yellow-400" />
                              <span className="font-mono font-semibold text-yellow-400 text-xs">
                                {card.admNo}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Unassigned (Open)</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isExhausted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800">
                              Exhausted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(count > 0 || isAssigned) && (
                              <button
                                onClick={() => handleResetCard(card.id)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                title="Reset usage count to 0 and unlock student admission"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteCard(card.id)}
                              className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg transition"
                              title="Delete Card"
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
      {/* MODAL: PRINT CUT-OUT SLIPS VIEW                                    */}
      {/* ================================================================== */}
      {isPrintModalOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="sheet-panel sheet-flush bg-white text-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Actions Header */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-4 flex items-center justify-between no-print">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Printable Official Scratch Card Slips ({filteredCards.length} Vouchers)
                </h3>
                <p className="text-xs text-slate-600">
                  Standard A4 layout &bull; 10 vouchers per sheet &bull; Ready-to-cut with scissors for distribution to parents
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                  }}
                  className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow transition active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print A4 Voucher Sheets</span>
                </button>

                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Content Sheet */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 print:p-0 print:bg-white print:overflow-visible">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2.5">
                {filteredCards.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className="border-2 border-dashed border-slate-400 rounded-xl p-3 bg-white shadow-xs relative flex flex-col justify-between space-y-2 print:border-slate-500 print:shadow-none page-break-inside-avoid"
                  >
                    {/* Top Cut Guide */}
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 border-b border-dashed border-slate-200 pb-1">
                      <span>✂ CUT ALONG DOTTED LINE</span>
                      <span>VOUCHER #{idx + 1}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-950 p-0.5 flex items-center justify-center shrink-0">
                          <Image
                            src="/assets/images/school-logo.webp"
                            alt="GFMS Logo"
                            width={24}
                            height={24}
                            className="rounded-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="font-black text-[10px] text-blue-950 tracking-tight leading-none uppercase">
                            Great-Favour Montessori School
                          </div>
                          <div className="text-[8px] font-bold text-yellow-700 uppercase mt-0.5">
                            Official Online Result Checker PIN
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[8px] font-black bg-blue-100 text-blue-900 border border-blue-300 px-1.5 py-0.5 rounded">
                          STRICTLY 3 CHECKS
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[9px] text-slate-600 flex justify-between">
                        <span>Session: <strong>{c.session || "2025/2026"}</strong></span>
                        <span>Term: <strong>{c.term || "Third Term"}</strong></span>
                      </div>

                      {/* Security PIN Display Box */}
                      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-2 border-yellow-500/60 rounded-lg p-2 text-center shadow-inner">
                        <div className="text-[8px] text-slate-600 font-bold uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-yellow-700" />
                          <span>Confidential Result PIN</span>
                        </div>
                        <div className="text-sm font-black font-mono text-blue-950 tracking-widest">
                          {c.pin}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-600 pt-0.5">
                        <span>SN: <strong>{c.serialNumber || `SN-GFMS-2026-${String(idx + 1).padStart(4, "0")}`}</strong></span>
                        <span className="text-blue-900 font-bold">www.greatfavourmontessori.edu.ng/result</span>
                      </div>
                    </div>

                    {/* Security Barcode Simulation & Disclaimer */}
                    <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[7.5px] text-slate-500 leading-tight">
                      <span>&bull; Valid strictly for <strong>3 checks</strong> per admission number.</span>
                      <span className="font-mono tracking-tighter text-[8px] font-bold text-slate-700">||| | |||| || | ||| ||||</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

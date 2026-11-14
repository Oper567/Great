"use client";

import React, { useState } from "react";
import { Sparkles, Eye, ChevronDown, ChevronUp, Binary, Hash, X } from "lucide-react";
import { FormattedMathText } from "./FormattedMathText";

interface Props {
  value?: string;
  onChange?: (newValue: string) => void;
  targetInputId?: string;
  showPreview?: boolean;
  compact?: boolean;
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

interface SymbolGroup {
  name: string;
  symbols: { label: string; insert: string; title?: string }[];
}

const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    name: "Number Bases (Binary, Octa...)",
    symbols: [
      { label: "₂ (Base 2)", insert: "₂", title: "Binary Base 2 (e.g. 1011₂)" },
      { label: "₈ (Base 8)", insert: "₈", title: "Octal Base 8 (e.g. 347₈)" },
      { label: "₁₀ (Base 10)", insert: "₁₀", title: "Denary / Decimal Base 10 (e.g. 95₁₀)" },
      { label: "₁₆ (Base 16)", insert: "₁₆", title: "Hexadecimal Base 16 (e.g. 2F₁₆)" },
      { label: "₃ (Base 3)", insert: "₃", title: "Base 3 (Ternary)" },
      { label: "₄ (Base 4)", insert: "₄", title: "Base 4" },
      { label: "₅ (Base 5)", insert: "₅", title: "Base 5 (Quinary)" },
      { label: "₆ (Base 6)", insert: "₆", title: "Base 6" },
      { label: "₇ (Base 7)", insert: "₇", title: "Base 7 (Septenary)" },
      { label: "₉ (Base 9)", insert: "₉", title: "Base 9" },
      { label: "ₙ (Base n)", insert: "_{n}", title: "Generic Base n" },
      { label: "ₓ (Base x)", insert: "_{x}", title: "Unknown Base x" },
      { label: "1101₂", insert: "1101₂", title: "Binary Number Template" },
      { label: "347₈", insert: "347₈", title: "Octal Number Template" },
      { label: "2F₁₆", insert: "2F₁₆", title: "Hexadecimal Number Template" },
      { label: "403₅", insert: "403₅", title: "Base 5 Number Template" },
      { label: "(N)₂", insert: "(N)₂", title: "Bracketed Binary: ( ... )₂" },
      { label: "(N)₈", insert: "(N)₈", title: "Bracketed Octal: ( ... )₈" },
      { label: "(N)₁₀", insert: "(N)₁₀", title: "Bracketed Denary: ( ... )₁₀" },
      { label: "(N)₁₆", insert: "(N)₁₆", title: "Bracketed Hex: ( ... )₁₆" },
      { label: "1101₂ + 101₂", insert: "1101₂ + 101₂", title: "Binary Addition Template" },
      { label: "1011₂ × 11₂", insert: "1011₂ × 11₂", title: "Binary Multiplication Template" },
      { label: "Convert _ to base _", insert: "Convert 110101₂ to base 8 (octal)", title: "Base Conversion Question Prompt" },
      { label: "_{base}", insert: "_{base}", title: "Custom Base Subscript (e.g. _{12})" },
    ],
  },
  {
    name: "Powers & Subscripts",
    symbols: [
      { label: "x²", insert: "²", title: "Superscript 2 (Square)" },
      { label: "x³", insert: "³", title: "Superscript 3 (Cube)" },
      { label: "xⁿ", insert: "^{n}", title: "Superscript Power (e.g. ^{n})" },
      { label: "x₂", insert: "₂", title: "Subscript 2" },
      { label: "x₁", insert: "₁", title: "Subscript 1" },
      { label: "xᵢ", insert: "_{i}", title: "Subscript Index (e.g. _{i})" },
      { label: "10⁻³", insert: "10⁻³", title: "Scientific Power (10⁻³)" },
      { label: "⁻¹", insert: "⁻¹", title: "Inverse Power (⁻¹)" },
    ],
  },
  {
    name: "Math Symbols",
    symbols: [
      { label: "√", insert: "√", title: "Square Root" },
      { label: "π", insert: "π", title: "Pi (3.14159...)" },
      { label: "θ", insert: "θ", title: "Theta (Angle)" },
      { label: "±", insert: "±", title: "Plus-or-Minus" },
      { label: "×", insert: "×", title: "Multiplication Sign" },
      { label: "÷", insert: "÷", title: "Division Sign" },
      { label: "≠", insert: "≠", title: "Not Equal To" },
      { label: "≤", insert: "≤", title: "Less Than or Equal To" },
      { label: "≥", insert: "≥", title: "Greater Than or Equal To" },
      { label: "°", insert: "°", title: "Degree Symbol (e.g. 45°)" },
      { label: "Δ", insert: "Δ", title: "Delta (Change)" },
      { label: "½", insert: "½", title: "Half" },
      { label: "¼", insert: "¼", title: "Quarter" },
      { label: "¾", insert: "¾", title: "Three Quarters" },
      { label: "∞", insert: "∞", title: "Infinity" },
    ],
  },
  {
    name: "Science & Units",
    symbols: [
      { label: "H₂O", insert: "H₂O", title: "Water" },
      { label: "CO₂", insert: "CO₂", title: "Carbon Dioxide" },
      { label: "SO₄²⁻", insert: "SO₄²⁻", title: "Sulfate Ion" },
      { label: "H₂SO₄", insert: "H₂SO₄", title: "Sulfuric Acid" },
      { label: "m/s²", insert: "m/s²", title: "Acceleration (m/s²)" },
      { label: "cm³", insert: "cm³", title: "Cubic Centimeter (cm³)" },
      { label: "g/cm³", insert: "g/cm³", title: "Density (g/cm³)" },
      { label: "Ω", insert: "Ω", title: "Ohm (Resistance)" },
    ],
  },
];

export function MathToolbar({
  value = "",
  onChange,
  targetInputId,
  showPreview = true,
  compact = false,
  isModal = false,
  isOpen = true,
  onClose,
}: Props) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  // Number Base Builder Quick State
  const [baseNumberInput, setBaseNumberInput] = useState("");
  const [selectedBase, setSelectedBase] = useState("2");
  const [useBrackets, setUseBrackets] = useState(false);

  const handleInsert = (textToInsert: string) => {
    // If target element is available in DOM, insert at cursor
    let el: HTMLTextAreaElement | HTMLInputElement | null = null;
    if (targetInputId) {
      el = document.getElementById(targetInputId) as any;
    }
    if (!el && typeof document !== "undefined") {
      const active = document.activeElement;
      if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
        el = active as any;
      }
    }

    const currentVal = el ? el.value : (value || "");

    if (el && typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = currentVal.substring(start, end);

      let insertVal = textToInsert;

      // Smart wrap if user selected text and clicked superscript, subscript, or base
      if (selected) {
        const baseSubscripts = ["₂", "₈", "₁₀", "₁₆", "₃", "₄", "₅", "₆", "₇", "₉", "ₙ", "ₓ", "²", "³"];
        if (baseSubscripts.includes(textToInsert)) {
          insertVal = `${selected}${textToInsert}`;
        } else if (textToInsert === "^{n}") {
          insertVal = `^{${selected}}`;
        } else if (textToInsert === "_{i}" || textToInsert === "_{n}" || textToInsert === "_{x}") {
          insertVal = `_{${selected}}`;
        } else if (textToInsert === "(N)₂") {
          insertVal = `(${selected})₂`;
        } else if (textToInsert === "(N)₈") {
          insertVal = `(${selected})₈`;
        } else if (textToInsert === "(N)₁₀") {
          insertVal = `(${selected})₁₀`;
        } else if (textToInsert === "(N)₁₆") {
          insertVal = `(${selected})₁₆`;
        } else if (textToInsert === "_{base}") {
          insertVal = `${selected}_{2}`;
        }
      }

      const newVal = currentVal.substring(0, start) + insertVal + currentVal.substring(end);
      if (onChange) {
        onChange(newVal);
      } else if (el) {
        const proto =
          el.tagName === "TEXTAREA"
            ? window.HTMLTextAreaElement?.prototype
            : window.HTMLInputElement?.prototype;
        const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, "value")?.set : undefined;
        if (nativeSetter) {
          nativeSetter.call(el, newVal);
        } else {
          el.value = newVal;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }

      // Restore focus and cursor position after insertion
      setTimeout(() => {
        el?.focus();
        const nextCursor = start + insertVal.length;
        el?.setSelectionRange(nextCursor, nextCursor);
      }, 10);
    } else {
      // Fallback: append to end
      const newVal = (currentVal || "") + textToInsert;
      if (onChange) {
        onChange(newVal);
      } else if (el) {
        const proto =
          el.tagName === "TEXTAREA"
            ? window.HTMLTextAreaElement?.prototype
            : window.HTMLInputElement?.prototype;
        const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, "value")?.set : undefined;
        if (nativeSetter) {
          nativeSetter.call(el, newVal);
        } else {
          el.value = newVal;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  };

  const handleInsertConstructedBase = () => {
    if (!baseNumberInput.trim()) return;
    const baseSubMap: Record<string, string> = {
      "2": "₂",
      "3": "₃",
      "4": "₄",
      "5": "₅",
      "6": "₆",
      "7": "₇",
      "8": "₈",
      "9": "₉",
      "10": "₁₀",
      "16": "₁₆",
      "n": "_{n}",
      "x": "_{x}",
    };
    const sub = baseSubMap[selectedBase] || `_{${selectedBase}}`;
    const num = baseNumberInput.trim();
    const formatted = useBrackets ? `(${num})${sub}` : `${num}${sub}`;
    handleInsert(formatted);
    setBaseNumberInput("");
  };

  const currentGroup = SYMBOL_GROUPS[activeGroupIndex];

  const toolbarContent = (
    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 sm:p-2.5 space-y-2 select-none shadow-md">
      {/* Group Tabs & Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1.5">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Math & Formula:</span>
          </span>
          <div className="flex items-center gap-1">
            {SYMBOL_GROUPS.map((grp, idx) => (
              <button
                key={grp.name}
                type="button"
                onClick={() => setActiveGroupIndex(idx)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                  activeGroupIndex === idx
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {grp.name}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview Toggle */}
        {showPreview && value && (
          <button
            type="button"
            onClick={() => setIsPreviewOpen((prev) => !prev)}
            className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1 font-semibold"
          >
            <Eye className="w-3 h-3" />
            <span>{isPreviewOpen ? "Hide Preview" : "View Math"}</span>
            {isPreviewOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Buttons in Active Group */}
      <div className="flex flex-wrap items-center gap-1.5">
        {currentGroup.symbols.map((sym) => (
          <button
            key={sym.label}
            type="button"
            onClick={() => handleInsert(sym.insert)}
            title={sym.title || sym.label}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/60 text-slate-200 hover:text-amber-300 font-mono text-xs rounded-lg transition active:scale-95 shadow-sm"
          >
            {sym.label}
          </button>
        ))}

        <span className="text-[10px] text-slate-500 italic ml-auto hidden sm:inline">
          Tip: Tap to insert or highlight text & click any base (e.g. ₂)
        </span>
      </div>

      {/* Interactive Number Base Builder (shown when Number Bases tab is active) */}
      {currentGroup.name.includes("Number Bases") && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
              <Binary className="w-3.5 h-3.5 text-yellow-400" />
              <span>Base Number Attacher &amp; Generator</span>
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Select text in question or type number below:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Number (e.g. 110101, 347, 2A)"
              value={baseNumberInput}
              onChange={(e) => setBaseNumberInput(e.target.value)}
              className="w-36 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:border-yellow-400 focus:outline-none"
            />
            <select
              value={selectedBase}
              onChange={(e) => setSelectedBase(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-300 font-bold focus:border-yellow-400 focus:outline-none"
            >
              <option value="2">Base 2 (Binary - ₂)</option>
              <option value="8">Base 8 (Octal - ₈)</option>
              <option value="10">Base 10 (Denary - ₁₀)</option>
              <option value="16">Base 16 (Hexadecimal - ₁₆)</option>
              <option value="3">Base 3 (Ternary - ₃)</option>
              <option value="4">Base 4 (Quaternary - ₄)</option>
              <option value="5">Base 5 (Quinary - ₅)</option>
              <option value="6">Base 6 (Senary - ₆)</option>
              <option value="7">Base 7 (Septenary - ₇)</option>
              <option value="9">Base 9 (Nonary - ₉)</option>
              <option value="n">Base n (Variable - ₙ)</option>
              <option value="x">Base x (Variable - ₓ)</option>
            </select>
            <label className="text-[11px] text-slate-300 flex items-center gap-1 cursor-pointer bg-slate-950 px-2 py-1 rounded border border-slate-700">
              <input
                type="checkbox"
                checked={useBrackets}
                onChange={(e) => setUseBrackets(e.target.checked)}
                className="rounded text-amber-500 focus:ring-0"
              />
              <span>In (Brackets)</span>
            </label>
            <button
              type="button"
              disabled={!baseNumberInput.trim()}
              onClick={handleInsertConstructedBase}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-lg transition active:scale-95 shadow-sm"
            >
              + Insert Base Number
            </button>
          </div>

          {baseNumberInput.trim() && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400">Preview:</span>
              <span className="font-bold text-yellow-300 font-mono text-sm">
                <FormattedMathText
                  text={
                    useBrackets
                      ? `(${baseNumberInput.trim()})_{${selectedBase}}`
                      : `${baseNumberInput.trim()}_{${selectedBase}}`
                  }
                />
              </span>
            </div>
          )}
        </div>
      )}

      {/* Live Formatted Preview Card */}
      {showPreview && isPreviewOpen && value && (
        <div className="pt-1.5 border-t border-slate-800/80">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Neat Student View:
            </span>
            <div className="text-white font-medium leading-relaxed">
              <FormattedMathText text={value} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    if (!isOpen) return null;
    return (
      <div
        className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="sheet-panel relative max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-slate-950 border border-amber-500/50 rounded-2xl p-4 shadow-2xl space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                Floating Math, Science &amp; Number Base Keyboard
              </h4>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {toolbarContent}
        </div>
      </div>
    );
  }

  return toolbarContent;
}

export function FloatingMathButton({
  onClick,
  label = "Math & Science Symbols",
  shortLabel = "Math (x²)",
  positionClassName,
}: {
  onClick: () => void;
  label?: string;
  shortLabel?: string;
  positionClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        positionClassName ||
        "fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 sm:left-auto sm:right-6 sm:bottom-6 z-40 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-[0_8px_25px_rgba(245,158,11,0.45)] flex items-center gap-1.5 sm:gap-2 transition-all hover:scale-105 active:scale-95 border-2 border-yellow-200 max-w-fit pointer-events-auto"
      }
      title="Open Floating Math & Formula Keyboard"
    >
      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 animate-pulse shrink-0" />
      <span className="hidden sm:inline font-black text-xs whitespace-nowrap">{label}</span>
      <span className="sm:hidden font-extrabold text-[11px] whitespace-nowrap tracking-tight">{shortLabel}</span>
    </button>
  );
}

export default MathToolbar;

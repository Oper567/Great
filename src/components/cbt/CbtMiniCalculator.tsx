"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Calculator as CalcIcon,
  X,
  Minus,
  Move,
  Delete,
} from "lucide-react";

interface CbtMiniCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CbtMiniCalculator({ isOpen, onClose }: CbtMiniCalculatorProps) {
  // Calculator state
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory] = useState<number | null>(null);

  // Dragging & Positioning state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const calcRef = useRef<HTMLDivElement>(null);

  // Center/initial position placement upon opening
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const defaultWidth = 320;
      const initialX = Math.max(16, window.innerWidth - defaultWidth - 32);
      const initialY = 72; // Just below header bar
      setPosition({ x: initialX, y: initialY });
    }
  }, [isOpen]);

  // Mouse & Touch Dragging logic
  const handleStartDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragOffset({
      x: clientX - position.x,
      y: clientY - position.y,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from header handle
    if ((e.target as HTMLElement).closest("button")) return;
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const touch = e.touches[0];
    if (touch) {
      handleStartDrag(touch.clientX, touch.clientY);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      if (touch) {
        const newX = Math.max(0, Math.min(window.innerWidth - 300, touch.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, touch.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleStopDrag = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleStopDrag);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleStopDrag);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleStopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleStopDrag);
    };
  }, [isDragging, dragOffset]);

  // Calculator Core Logic
  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay((prev) => (prev === "0" ? digit : prev.length < 15 ? prev + digit : prev));
    }
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay((prev) => prev + ".");
    }
  }, [display, waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setEquation("");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay("0");
  }, []);

  const handleBackspace = useCallback(() => {
    if (waitingForOperand) return;
    if (display.length === 1 || display === "-0" || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0");
    } else {
      setDisplay((prev) => prev.slice(0, -1));
    }
  }, [display, waitingForOperand]);

  const toggleSign = useCallback(() => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay(String(-val));
    }
  }, [display]);

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+":
        return a + b;
      case "−":
      case "-":
        return a - b;
      case "×":
      case "*":
        return a * b;
      case "÷":
      case "/":
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  };

  const performOperation = useCallback((nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
      setEquation(`${inputValue} ${nextOperator}`);
    } else if (operator) {
      const currentValue = prevValue || 0;
      const result = calculate(currentValue, inputValue, operator);

      if (isNaN(result) || !isFinite(result)) {
        setDisplay("Cannot divide by 0");
        setPrevValue(null);
        setOperator(null);
        setEquation("");
        setWaitingForOperand(true);
        return;
      }

      // Format clean precision
      const rounded = Number(Math.round(Number(result + "e+10")) + "e-10");
      setDisplay(String(rounded));
      setPrevValue(rounded);
      setEquation(`${rounded} ${nextOperator}`);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [display, operator, prevValue]);

  const handleEqual = useCallback(() => {
    if (!operator || prevValue === null) return;
    const inputValue = parseFloat(display);
    const result = calculate(prevValue, inputValue, operator);

    if (isNaN(result) || !isFinite(result)) {
      setDisplay("Cannot divide by 0");
      setEquation("");
    } else {
      const rounded = Number(Math.round(Number(result + "e+10")) + "e-10");
      setEquation(`${prevValue} ${operator} ${inputValue} =`);
      setDisplay(String(rounded));
      setPrevValue(rounded);
    }

    setOperator(null);
    setWaitingForOperand(true);
  }, [display, operator, prevValue]);

  // Scientific & Shortcut Functions
  const handleSquareRoot = useCallback(() => {
    const val = parseFloat(display);
    if (val < 0) {
      setDisplay("Invalid Input");
      setWaitingForOperand(true);
      return;
    }
    const res = Math.sqrt(val);
    const rounded = Number(Math.round(Number(res + "e+10")) + "e-10");
    setEquation(`√(${val})`);
    setDisplay(String(rounded));
    setWaitingForOperand(true);
  }, [display]);

  const handleSquare = useCallback(() => {
    const val = parseFloat(display);
    const res = val * val;
    const rounded = Number(Math.round(Number(res + "e+10")) + "e-10");
    setEquation(`sqr(${val})`);
    setDisplay(String(rounded));
    setWaitingForOperand(true);
  }, [display]);

  const handleReciprocal = useCallback(() => {
    const val = parseFloat(display);
    if (val === 0) {
      setDisplay("Cannot divide by 0");
      setWaitingForOperand(true);
      return;
    }
    const res = 1 / val;
    const rounded = Number(Math.round(Number(res + "e+10")) + "e-10");
    setEquation(`1/(${val})`);
    setDisplay(String(rounded));
    setWaitingForOperand(true);
  }, [display]);

  const handlePercent = useCallback(() => {
    const val = parseFloat(display);
    const res = prevValue !== null ? (prevValue * val) / 100 : val / 100;
    const rounded = Number(Math.round(Number(res + "e+10")) + "e-10");
    setDisplay(String(rounded));
    setWaitingForOperand(true);
  }, [display, prevValue]);

  const handlePi = useCallback(() => {
    setDisplay(String(Math.PI));
    setWaitingForOperand(true);
  }, []);

  // Memory Registers
  const handleMemoryAdd = () => {
    const val = parseFloat(display);
    setMemory((prev) => (prev ?? 0) + (isNaN(val) ? 0 : val));
  };

  const handleMemorySub = () => {
    const val = parseFloat(display);
    setMemory((prev) => (prev ?? 0) - (isNaN(val) ? 0 : val));
  };

  const handleMemoryRecall = () => {
    if (memory !== null) {
      setDisplay(String(memory));
      setWaitingForOperand(true);
    }
  };

  const handleMemoryClear = () => {
    setMemory(null);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if student is currently typing in an input or textarea (e.g. theory response)
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea") return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === "+" || e.key === "-") {
        e.preventDefault();
        performOperation(e.key === "-" ? "−" : "+");
      } else if (e.key === "*") {
        e.preventDefault();
        performOperation("×");
      } else if (e.key === "/") {
        e.preventDefault();
        performOperation("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEqual();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, inputDigit, inputDecimal, performOperation, handleEqual, handleBackspace, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={calcRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      className="fixed top-0 left-0 z-50 w-72 sm:w-80 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl select-none animate-in fade-in zoom-in-95 duration-150 overflow-hidden ring-1 ring-white/10"
    >
      {/* Draggable Header Bar */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="px-3.5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between cursor-move text-slate-200"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-yellow-500/20 text-yellow-400">
            <CalcIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
            <span>CBT Calculator</span>
            {memory !== null && (
              <span className="text-[9px] px-1 py-0.2 bg-blue-900/80 text-blue-300 font-mono font-bold rounded">
                M
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div className="text-slate-500 hover:text-slate-300 p-1 cursor-grab active:cursor-grabbing" title="Drag window">
            <Move className="w-3.5 h-3.5" />
          </div>
          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
            title="Close Calculator"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3 space-y-2.5">
          {/* Digital LCD Display Screen */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-right shadow-inner">
            <div className="text-[11px] font-mono text-slate-400 h-4 truncate">
              {equation || "\u00A0"}
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-yellow-400 overflow-x-auto whitespace-nowrap scrollbar-none">
              {display}
            </div>
          </div>

          {/* Memory Row */}
          <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
            <button
              onClick={handleMemoryClear}
              className={`py-1 rounded font-bold transition ${
                memory !== null
                  ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
                  : "bg-slate-950 text-slate-600 cursor-not-allowed"
              }`}
              disabled={memory === null}
            >
              MC
            </button>
            <button
              onClick={handleMemoryRecall}
              className={`py-1 rounded font-bold transition ${
                memory !== null
                  ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
                  : "bg-slate-950 text-slate-600 cursor-not-allowed"
              }`}
              disabled={memory === null}
            >
              MR
            </button>
            <button
              onClick={handleMemoryAdd}
              className="py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition"
            >
              M+
            </button>
            <button
              onClick={handleMemorySub}
              className="py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition"
            >
              M−
            </button>
          </div>

          {/* Scientific Quick Function Row (Maths / Physics) */}
          <div className="grid grid-cols-5 gap-1 text-xs">
            <button
              onClick={handleSquareRoot}
              className="py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono transition active:scale-95"
              title="Square Root"
            >
              √
            </button>
            <button
              onClick={handleSquare}
              className="py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono transition active:scale-95"
              title="Square (x²)"
            >
              x²
            </button>
            <button
              onClick={handleReciprocal}
              className="py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono transition active:scale-95"
              title="Reciprocal (1/x)"
            >
              1/x
            </button>
            <button
              onClick={handlePercent}
              className="py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono transition active:scale-95"
              title="Percentage"
            >
              %
            </button>
            <button
              onClick={handlePi}
              className="py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono transition active:scale-95"
              title="Pi (π)"
            >
              π
            </button>
          </div>

          {/* Standard Keypad Grid */}
          <div className="grid grid-cols-4 gap-1.5 font-mono text-sm">
            {/* Row 1 */}
            <button
              onClick={clearEntry}
              className="py-2.5 rounded-xl bg-slate-800/90 text-rose-300 hover:bg-slate-700 font-bold active:scale-95 transition"
            >
              CE
            </button>
            <button
              onClick={clearAll}
              className="py-2.5 rounded-xl bg-slate-800/90 text-rose-400 hover:bg-slate-700 font-bold active:scale-95 transition"
            >
              C
            </button>
            <button
              onClick={handleBackspace}
              className="py-2.5 rounded-xl bg-slate-800/90 text-slate-300 hover:bg-slate-700 flex items-center justify-center active:scale-95 transition"
              title="Backspace"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              onClick={() => performOperation("÷")}
              className={`py-2.5 rounded-xl font-bold text-base transition active:scale-95 ${
                operator === "÷"
                  ? "bg-yellow-500 text-slate-950"
                  : "bg-blue-900/60 text-yellow-300 hover:bg-blue-800"
              }`}
            >
              ÷
            </button>

            {/* Row 2 */}
            <button
              onClick={() => inputDigit("7")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              7
            </button>
            <button
              onClick={() => inputDigit("8")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              8
            </button>
            <button
              onClick={() => inputDigit("9")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              9
            </button>
            <button
              onClick={() => performOperation("×")}
              className={`py-2.5 rounded-xl font-bold text-base transition active:scale-95 ${
                operator === "×"
                  ? "bg-yellow-500 text-slate-950"
                  : "bg-blue-900/60 text-yellow-300 hover:bg-blue-800"
              }`}
            >
              ×
            </button>

            {/* Row 3 */}
            <button
              onClick={() => inputDigit("4")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              4
            </button>
            <button
              onClick={() => inputDigit("5")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              5
            </button>
            <button
              onClick={() => inputDigit("6")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              6
            </button>
            <button
              onClick={() => performOperation("−")}
              className={`py-2.5 rounded-xl font-bold text-base transition active:scale-95 ${
                operator === "−"
                  ? "bg-yellow-500 text-slate-950"
                  : "bg-blue-900/60 text-yellow-300 hover:bg-blue-800"
              }`}
            >
              −
            </button>

            {/* Row 4 */}
            <button
              onClick={() => inputDigit("1")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              1
            </button>
            <button
              onClick={() => inputDigit("2")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              2
            </button>
            <button
              onClick={() => inputDigit("3")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              3
            </button>
            <button
              onClick={() => performOperation("+")}
              className={`py-2.5 rounded-xl font-bold text-base transition active:scale-95 ${
                operator === "+"
                  ? "bg-yellow-500 text-slate-950"
                  : "bg-blue-900/60 text-yellow-300 hover:bg-blue-800"
              }`}
            >
              +
            </button>

            {/* Row 5 */}
            <button
              onClick={toggleSign}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-bold active:scale-95 transition shadow-sm"
            >
              ±
            </button>
            <button
              onClick={() => inputDigit("0")}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              0
            </button>
            <button
              onClick={inputDecimal}
              className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-white font-bold active:scale-95 transition shadow-sm"
            >
              .
            </button>
            <button
              onClick={handleEqual}
              className="py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black text-lg shadow-md active:scale-95 transition"
            >
              =
            </button>
          </div>

          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>GFMS Safe CBT Engine</span>
            <span>Tab-Lock Safe</span>
          </div>
        </div>
      )}
    </div>
  );
}

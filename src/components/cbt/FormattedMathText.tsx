import React from "react";

interface Props {
  text: string;
  className?: string;
}

/**
 * Parses and neatly renders mathematical and scientific formulas:
 * - HTML tags: <sup>...</sup> and <sub>...</sub>
 * - Caret superscripts: x^2, x^(2n+1), 10^-3, etc.
 * - Underscore subscripts: H_2O, x_1, a_{n+1}, CO_2, etc.
 * - Unicode superscripts: x², y³, 10⁻³
 * - Unicode subscripts: H₂O, CO₂, x₁
 * - Math symbols: √, π, θ, α, β, ±, ×, ÷, ≠, ≤, ≥, °, etc.
 */
export function FormattedMathText({ text, className = "" }: Props) {
  if (!text) return null;

  // Split lines to preserve intentional line breaks
  const lines = text.split("\n");

  return (
    <span className={`inline-block font-sans ${className}`}>
      {lines.map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {renderMathLine(line)}
        </React.Fragment>
      ))}
    </span>
  );
}

function renderMathLine(line: string): React.ReactNode[] {
  if (!line) return [];

  // 1. Tokenize HTML <sup> and <sub> tags first
  const htmlTagRegex = /(<(?:sup|sub)>[\s\S]*?<\/(?:sup|sub)>)/gi;
  const parts = line.split(htmlTagRegex);

  const nodes: React.ReactNode[] = [];
  let keyCounter = 0;

  for (const part of parts) {
    if (!part) continue;

    // Check if part is <sup>...</sup>
    const supMatch = part.match(/^<sup>([\s\S]*?)<\/sup>$/i);
    if (supMatch) {
      nodes.push(
        <sup
          key={`sup-tag-${keyCounter++}`}
          className="text-[0.78em] font-semibold relative -top-[0.45em] ml-0.5 mr-0.5 leading-none select-text text-amber-300 inline-block"
        >
          {supMatch[1]}
        </sup>
      );
      continue;
    }

    // Check if part is <sub>...</sub>
    const subMatch = part.match(/^<sub>([\s\S]*?)<\/sub>$/i);
    if (subMatch) {
      nodes.push(
        <sub
          key={`sub-tag-${keyCounter++}`}
          className="text-[0.78em] font-semibold relative -bottom-[0.25em] ml-0.5 mr-0.5 leading-none select-text text-amber-300 inline-block"
        >
          {subMatch[1]}
        </sub>
      );
      continue;
    }

    // Parse caret (^), underscore (_), and unicode scripts inside raw text
    nodes.push(...parseCaretAndUnderscores(part, keyCounter));
    keyCounter += 100;
  }

  return nodes;
}

function parseCaretAndUnderscores(text: string, baseKey: number): React.ReactNode[] {
  // Regex to match:
  // 1. Caret with braces: ^{...}
  // 2. Caret with simple value: ^([0-9a-zA-Z+-]+)
  // 3. Underscore with braces: _{...}
  // 4. Underscore with simple value: _([0-9a-zA-Z+-]+)
  // 5. Sequence of unicode superscripts: ([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+)
  // 6. Sequence of unicode subscripts: ([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₙ]+)
  // 7. Base notation in parentheses: (base 2), (base 8), (base 10), (base 16), (base n)
  const mathTokenRegex = /(\^\{[^{}]+\}|\^[0-9a-zA-Z+-]+|_\{[^{}]+\}|_[0-9a-zA-Z+-]+|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+|[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₙ]+|\(\s*base\s+[0-9a-zA-Z]+\s*\))/gi;

  const chunks = text.split(mathTokenRegex);
  const elements: React.ReactNode[] = [];
  let counter = baseKey;

  for (const chunk of chunks) {
    if (!chunk) continue;

    // Parenthesized Base Notation: e.g. "(base 2)", "(base 8)", "(base 16)"
    const baseParenMatch = chunk.match(/^\(\s*base\s+([0-9a-zA-Z]+)\s*\)$/i);
    if (baseParenMatch) {
      const baseVal = baseParenMatch[1];
      elements.push(
        <sub
          key={`base-paren-${counter++}`}
          className="text-[0.76em] font-bold relative -bottom-[0.22em] ml-0.5 mr-0.5 leading-none select-text text-amber-300 inline-block font-sans"
          title={`Base ${baseVal}`}
        >
          ₍base {baseVal}₎
        </sub>
      );
      continue;
    }

    // Caret Superscript with braces: ^{expr}
    if (chunk.startsWith("^{") && chunk.endsWith("}")) {
      const content = chunk.slice(2, -1);
      elements.push(
        <sup
          key={`caret-brace-${counter++}`}
          className="text-[0.78em] font-semibold relative -top-[0.45em] ml-0.5 mr-0.5 leading-none select-text text-amber-300 inline-block"
        >
          {content}
        </sup>
      );
    }
    // Caret Superscript simple: ^val
    else if (chunk.startsWith("^")) {
      const content = chunk.slice(1);
      elements.push(
        <sup
          key={`caret-simple-${counter++}`}
          className="text-[0.78em] font-semibold relative -top-[0.45em] ml-0.5 mr-0.5 leading-none select-text text-amber-300 inline-block"
        >
          {content}
        </sup>
      );
    }
    // Underscore Subscript with braces: _{expr}
    else if (chunk.startsWith("_{") && chunk.endsWith("}")) {
      const rawContent = chunk.slice(2, -1);
      const content = normalizeBaseWord(rawContent);
      elements.push(
        <sub
          key={`under-brace-${counter++}`}
          className="text-[0.80em] font-bold relative -bottom-[0.25em] ml-0.5 mr-0.5 leading-none select-text text-amber-300 inline-block"
        >
          {content}
        </sub>
      );
    }
    // Underscore Subscript simple: _val
    else if (chunk.startsWith("_")) {
      const rawContent = chunk.slice(1);
      const content = normalizeBaseWord(rawContent);
      elements.push(
        <sub
          key={`under-simple-${counter++}`}
          className="text-[0.80em] font-bold relative -bottom-[0.25em] ml-0.5 mr-0.5 leading-none select-text text-amber-300 inline-block"
        >
          {content}
        </sub>
      );
    }
    // Unicode Superscript: e.g. x² or 10⁻³
    else if (/^[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+$/.test(chunk)) {
      elements.push(
        <sup
          key={`unicode-sup-${counter++}`}
          className="text-[0.82em] font-bold relative -top-[0.42em] ml-0.5 mr-0.5 leading-none select-text text-amber-300 inline-block"
        >
          {chunk}
        </sup>
      );
    }
    // Unicode Subscript: e.g. 1101₂ or 347₈ or 2A₁₆ or H₂O
    else if (/^[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₙ]+$/.test(chunk)) {
      elements.push(
        <sub
          key={`unicode-sub-${counter++}`}
          className="text-[0.82em] font-bold relative -bottom-[0.22em] ml-0.5 mr-0.5 leading-none select-text text-amber-300 inline-block"
        >
          {chunk}
        </sub>
      );
    }
    // Normal Text
    else {
      elements.push(
        <span key={`text-${counter++}`}>
          {formatMathSymbols(chunk)}
        </span>
      );
    }
  }

  return elements;
}

/**
 * Normalizes English base words like "two", "eight", "hex" to standard base digits
 */
function normalizeBaseWord(str: string): string {
  const lower = str.trim().toLowerCase();
  if (lower === "two" || lower === "binary") return "2";
  if (lower === "eight" || lower === "octal") return "8";
  if (lower === "ten" || lower === "denary" || lower === "decimal") return "10";
  if (lower === "sixteen" || lower === "hex" || lower === "hexadecimal") return "16";
  if (lower === "three" || lower === "ternary") return "3";
  if (lower === "four" || lower === "quaternary") return "4";
  if (lower === "five" || lower === "quinary") return "5";
  if (lower === "six" || lower === "senary") return "6";
  if (lower === "seven" || lower === "septenary") return "7";
  return str;
}

/**
 * Clean up common LaTeX-like shorthand symbols if teachers copy-pasted from Word or LaTeX
 */
function formatMathSymbols(str: string): string {
  return str
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\pm/g, "±")
    .replace(/\\ne\b|\\neq\b/g, "≠")
    .replace(/\\le\b|\\leq\b/g, "≤")
    .replace(/\\ge\b|\\geq\b/g, "≥")
    .replace(/\\pi\b/g, "π")
    .replace(/\\theta\b/g, "θ")
    .replace(/\\alpha\b/g, "α")
    .replace(/\\beta\b/g, "β")
    .replace(/\\Delta\b/g, "Δ")
    .replace(/\\cdot\b/g, "·")
    .replace(/\\approx\b/g, "≈")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\degree\b/g, "°")
    .replace(/\\sqrt\b/g, "√");
}

export default FormattedMathText;

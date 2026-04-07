"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  onStart: (names: string[]) => void;
}

export function SetupScreen({ onStart }: Props) {
  const [names, setNames] = useState<string[]>([""]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [quickCount, setQuickCount] = useState("30");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastInputRef = useRef<HTMLInputElement>(null);

  const generateQuick = useCallback(() => {
    const n = Math.min(Math.max(parseInt(quickCount) || 0, 2), 1000);
    if (n < 2) return;
    setNames(Array.from({ length: n }, (_, i) => `참가자${i + 1}`));
  }, [quickCount]);

  const validNames = names.map((n) => n.trim()).filter(Boolean);
  const canStart = validNames.length >= 2;

  const addName = useCallback(() => {
    setNames((prev) => [...prev, ""]);
    setTimeout(() => lastInputRef.current?.focus(), 50);
  }, []);

  const updateName = useCallback((i: number, val: string) => {
    setNames((prev) => prev.map((n, idx) => (idx === i ? val : n)));
  }, []);

  const removeName = useCallback((i: number) => {
    setNames((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length === 0 ? [""] : next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setNames((prev) => {
          const next = [...prev];
          next.splice(i + 1, 0, "");
          return next;
        });
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>("[data-name-input]");
          inputs[i + 1]?.focus();
        }, 30);
      }
      if (e.key === "Backspace" && names[i] === "" && names.length > 1) {
        e.preventDefault();
        removeName(i);
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>("[data-name-input]");
          inputs[Math.max(0, i - 1)]?.focus();
        }, 30);
      }
    },
    [names, removeName]
  );

  // Paste multi-line text → split into multiple entries
  const handlePaste = useCallback(
    (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text");
      if (!text.includes("\n")) return;
      e.preventDefault();
      const pasted = text.split("\n").map((s) => s.trim()).filter(Boolean);
      setNames((prev) => {
        const next = [...prev];
        next.splice(i, 1, ...pasted);
        return next;
      });
    },
    []
  );

  const applyBulkText = () => {
    const parsed = bulkText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (parsed.length > 0) {
      setNames(parsed.length === 0 ? [""] : parsed);
    }
    setBulkMode(false);
  };

  const openBulkMode = () => {
    setBulkText(names.filter(Boolean).join("\n"));
    setBulkMode(true);
  };

  const handleStart = () => {
    if (!canStart) return;
    onStart(validNames);
  };

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "linear-gradient(160deg, #0d0d1f 0%, #0a0f1e 100%)" }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", top: "-15%", left: "-15%", background: "radial-gradient(circle, rgba(99,60,180,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", bottom: "5%", right: "-10%", background: "radial-gradient(circle, rgba(255,140,0,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 px-5 pt-10 pb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl mb-4"
          style={{ background: "linear-gradient(135deg, rgba(108,63,196,0.4), rgba(58,123,213,0.4))", border: "1px solid rgba(255,255,255,0.1)" }}>
          🎱
        </div>
        <h1 className="text-2xl font-black mb-1" style={{ color: "#fff" }}>구슬 추첨기</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          참가자를 입력하고 추첨을 시작하세요
        </p>
      </header>

      {/* Quick generate bar */}
      <div className="relative z-10 px-4 mb-1">
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <span className="text-sm flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
            빠른 생성
          </span>
          <input
            type="number"
            min={2}
            max={1000}
            value={quickCount}
            onChange={(e) => setQuickCount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateQuick()}
            className="w-20 px-3 py-1.5 rounded-xl text-sm text-center outline-none"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.9)",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(255,215,0,0.4)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>명</span>
          <button
            onClick={generateQuick}
            className="flex-1 py-1.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(108,63,196,0.6), rgba(58,123,213,0.6))",
              color: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            생성
          </button>
        </div>
      </div>

      {/* Name List */}
      <div className="relative z-10 flex-1 flex flex-col px-4 gap-3 overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>참가자 목록</span>
            {validNames.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(255,215,0,0.15)", color: "rgba(255,215,0,0.9)" }}>
                {validNames.length}명
              </span>
            )}
          </div>
          <button
            onClick={bulkMode ? () => setBulkMode(false) : openBulkMode}
            className="text-xs px-3 py-1.5 rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {bulkMode ? "← 목록으로" : "📋 일괄 입력"}
          </button>
        </div>

        {bulkMode ? (
          /* Bulk textarea mode */
          <div className="flex flex-col gap-3 flex-1">
            <textarea
              autoFocus
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"이름을 한 줄에 하나씩 입력하세요\n예)\n홍길동\n김철수\n이영희"}
              className="flex-1 rounded-2xl p-4 text-sm resize-none outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,215,0,0.3)",
                color: "rgba(255,255,255,0.9)",
                lineHeight: 1.9,
                minHeight: 200,
              }}
              spellCheck={false}
            />
            <button
              onClick={applyBulkText}
              className="w-full py-3.5 rounded-2xl font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #6c3fc4, #3a7bd5)", color: "#fff" }}
            >
              적용하기
            </button>
          </div>
        ) : (
          /* Individual card list */
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pb-2" style={{ scrollbarWidth: "none" }}>
            {names.map((name, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <span className="text-xs w-7 text-right flex-shrink-0 font-mono tabular-nums"
                  style={{ color: "rgba(255,255,255,0.25)" }}>
                  {i + 1}
                </span>
                <input
                  ref={i === names.length - 1 ? lastInputRef : undefined}
                  data-name-input
                  type="text"
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={(e) => handlePaste(i, e)}
                  placeholder={`참가자 ${i + 1}`}
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.9)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(255,215,0,0.35)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                  autoComplete="off"
                />
                <button
                  onClick={() => removeName(i)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                  style={{ background: "rgba(255,80,80,0.12)", color: "rgba(255,120,120,0.7)" }}
                  tabIndex={-1}
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Add name row */}
            <button
              onClick={addName}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all mt-1"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <span className="text-lg leading-none">+</span>
              <span>이름 추가</span>
              <span className="text-xs ml-auto" style={{ color: "rgba(255,255,255,0.2)" }}>
                Enter로도 추가
              </span>
            </button>
            <div ref={bottomRef} />
          </div>
        )}

        {/* Start button */}
        {!bulkMode && (
          <div className="flex-shrink-0 pb-6 pt-2">
            {validNames.length < 2 && (
              <p className="text-center text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                최소 2명 이상 입력해주세요
              </p>
            )}
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="w-full rounded-2xl font-black text-lg transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed relative overflow-hidden"
              style={{
                height: 64,
                background: canStart
                  ? "linear-gradient(135deg, #ffd700 0%, #ffaa00 50%, #ff8c00 100%)"
                  : "rgba(255,255,255,0.05)",
                color: canStart ? "#1a1000" : "rgba(255,255,255,0.2)",
                boxShadow: canStart ? "0 8px 32px rgba(255,180,0,0.3)" : "none",
                border: canStart ? "none" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {canStart && (
                <div className="absolute inset-0 opacity-30"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
              )}
              <span className="relative">
                {canStart ? `🎯 추첨 시작 (${validNames.length}명)` : "이름을 입력해주세요"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

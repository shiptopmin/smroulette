"use client";

import { useEffect, useState } from "react";
import { Confetti } from "./Confetti";

type Props = {
  winner: string | null;
  onClose: () => void;
  onDrawAgain: () => void;
  remainingCount: number;
};

export function WinnerModal({ winner, onClose, onDrawAgain, remainingCount }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (winner) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [winner]);

  if (!winner) return null;

  return (
    <>
      <Confetti active={!!winner} />
      <div
        className="fixed inset-0 flex items-center justify-center z-50 px-5"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <div
          className={`relative max-w-sm w-full rounded-3xl text-center transition-all duration-500 overflow-hidden ${
            visible ? "winner-pop" : "opacity-0 scale-0"
          }`}
          style={{
            background: "linear-gradient(160deg, #1e1432 0%, #141020 100%)",
            boxShadow: "0 0 0 1px rgba(255,215,0,0.3), 0 0 80px rgba(255,180,0,0.2), 0 30px 80px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top glow bar */}
          <div className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, transparent, #ffd700, #ff8c00, #ffd700, transparent)" }} />

          {/* Confetti bg effect inside modal */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
            {Array.from({length: 8}).map((_, i) => (
              <div key={i} className="absolute rounded-full"
                style={{
                  width: 6 + i * 4,
                  height: 6 + i * 4,
                  left: (i * 13) + "%",
                  top: ((i % 3) * 30) + "%",
                  background: ["#ffd700","#ff6b9d","#4ecdc4","#ff8e53"][i % 4],
                }} />
            ))}
          </div>

          <div className="relative px-8 py-8">
            {/* Trophy */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-4"
              style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.08))",
                border: "1px solid rgba(255,215,0,0.2)",
              }}>
              <span className="text-5xl float-animation">🏆</span>
            </div>

            <p className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: "rgba(255,215,0,0.6)" }}>
              🎉 당첨자 발표
            </p>

            <div className="my-4 px-4 py-4 rounded-2xl"
              style={{
                background: "rgba(255,215,0,0.06)",
                border: "1px solid rgba(255,215,0,0.15)",
              }}>
              <h2
                className="font-black shimmer-text"
                style={{
                  fontSize: winner.length > 6 ? "2rem" : winner.length > 4 ? "2.5rem" : "3rem",
                  lineHeight: 1.2,
                  wordBreak: "keep-all",
                }}
              >
                {winner}
              </h2>
            </div>

            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
              축하드립니다! 🎊
            </p>

            <div className="flex gap-3">
              {remainingCount > 0 ? (
                <button
                  onClick={onDrawAgain}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                    color: "#1a1000",
                    boxShadow: "0 4px 20px rgba(255,180,0,0.3)",
                  }}
                >
                  <div className="absolute inset-0 opacity-30"
                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)" }} />
                  <span className="relative">다시 추첨 ({remainingCount}명 남음)</span>
                </button>
              ) : (
                <div className="flex-1 py-3.5 rounded-2xl text-sm text-center font-medium"
                  style={{
                    background: "rgba(255,215,0,0.06)",
                    border: "1px solid rgba(255,215,0,0.15)",
                    color: "rgba(255,215,0,0.5)",
                  }}>
                  모두 추첨 완료! 🎊
                </div>
              )}
              <button
                onClick={onClose}
                className="px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

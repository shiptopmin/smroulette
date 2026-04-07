"use client";

import { useState, useEffect } from "react";
import { Confetti } from "./Confetti";

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

interface Props {
  ranking: string[];
  onRestart: () => void;
  onRedraw: () => void;
}

export function RankingScreen({ ranking, onRestart, onRedraw }: Props) {
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setConfetti(false), 5000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "linear-gradient(160deg, #0d0d1f 0%, #0a0f1e 100%)" }}
    >
      <Confetti active={confetti} />

      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", top: "-20%", left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* Header */}
      <header
        className={`relative z-10 px-5 pt-10 pb-6 text-center transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
      >
        <div className="text-6xl mb-3">🏆</div>
        <h1 className="text-2xl font-black mb-1" style={{ color: "#fff" }}>최종 순위</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          총 {ranking.length}명의 순위가 결정되었습니다
        </p>
      </header>

      {/* Ranking list */}
      <div className="relative z-10 flex-1 px-4 overflow-y-auto pb-4" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col gap-2 max-w-lg mx-auto">
          {ranking.map((name, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            const medal = RANK_MEDALS[rank];
            const delay = Math.min(i * 60, 600);

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-500`}
                style={{
                  background: rank === 1
                    ? "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,140,0,0.06))"
                    : rank === 2
                    ? "linear-gradient(135deg, rgba(192,192,192,0.08), rgba(150,150,150,0.04))"
                    : rank === 3
                    ? "linear-gradient(135deg, rgba(205,127,50,0.08), rgba(180,100,30,0.04))"
                    : "rgba(255,255,255,0.03)",
                  border: rank === 1
                    ? "1px solid rgba(255,215,0,0.2)"
                    : rank === 2
                    ? "1px solid rgba(192,192,192,0.15)"
                    : rank === 3
                    ? "1px solid rgba(205,127,50,0.15)"
                    : "1px solid rgba(255,255,255,0.05)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-20px)",
                  transitionDelay: `${delay}ms`,
                  boxShadow: rank === 1 ? "0 4px 20px rgba(255,215,0,0.1)" : "none",
                }}
              >
                {/* Rank indicator */}
                <div
                  className="flex items-center justify-center flex-shrink-0 font-black"
                  style={{
                    width: isTop3 ? 44 : 36,
                    height: isTop3 ? 44 : 36,
                    borderRadius: isTop3 ? 14 : 10,
                    fontSize: isTop3 ? "1.5rem" : "0.8rem",
                    background: rank === 1
                      ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,0,0.1))"
                      : "rgba(255,255,255,0.05)",
                    color: isTop3 ? undefined : "rgba(255,255,255,0.4)",
                  }}
                >
                  {medal ?? rank}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span
                    className="font-bold truncate block"
                    style={{
                      fontSize: rank === 1 ? "1.25rem" : rank <= 3 ? "1.1rem" : "0.95rem",
                      color: rank === 1
                        ? "rgba(255,215,0,0.95)"
                        : rank <= 3
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(255,255,255,0.65)",
                    }}
                  >
                    {name}
                  </span>
                  {rank === 1 && (
                    <span className="text-xs" style={{ color: "rgba(255,215,0,0.5)" }}>
                      대상 🎉
                    </span>
                  )}
                </div>

                {/* Rank number for top 3 */}
                {isTop3 && (
                  <div
                    className="text-xs font-bold flex-shrink-0"
                    style={{ color: rank === 1 ? "rgba(255,215,0,0.6)" : "rgba(255,255,255,0.3)" }}
                  >
                    {rank}등
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div
        className={`relative z-10 px-4 pb-8 pt-4 flex flex-col gap-3 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        style={{ transitionDelay: "400ms" }}
      >
        <button
          onClick={onRedraw}
          className="w-full py-4 rounded-2xl font-black text-base relative overflow-hidden transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #ffd700, #ff8c00)",
            color: "#1a1000",
            boxShadow: "0 8px 32px rgba(255,180,0,0.25)",
          }}
        >
          <div className="absolute inset-0 opacity-30"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
          <span className="relative">🔄 같은 인원으로 다시 추첨</span>
        </button>
        <button
          onClick={onRestart}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
          style={{
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          ← 처음부터 다시
        </button>
      </div>
    </div>
  );
}

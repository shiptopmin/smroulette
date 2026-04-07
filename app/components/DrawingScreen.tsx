"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useMarblePhysics } from "../hooks/useMarblePhysics";
import { Confetti } from "./Confetti";

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const STAGE_INFO = [
  { name: "낙하 구간",  icon: "⬇️",  desc: "구슬이 페그를 통해 떨어집니다" },
  { name: "미로 구간",  icon: "🌀",  desc: "지그재그 경사면을 통과합니다" },
  { name: "혼돈 구간",  icon: "💥",  desc: "회전 패들과 범퍼가 구슬을 뒤섞습니다" },
  { name: "깔때기",     icon: "📐",  desc: "병목 구간으로 좁혀집니다" },
  { name: "결승선",     icon: "🏁",  desc: "먼저 도착한 구슬이 승리합니다!" },
];

interface Props {
  roundNumber: number;
  totalParticipants: number;
  remaining: string[];
  ranking: string[];
  onRoundComplete: (winner: string) => void;
  onSkipToEnd: () => void;
}

export function DrawingScreen({
  roundNumber,
  totalParticipants,
  remaining,
  ranking,
  onRoundComplete,
  onSkipToEnd,
}: Props) {
  // Winner waiting to be revealed (physics done, user hasn't clicked yet)
  const [pendingWinner, setPendingWinner] = useState<string | null>(null);
  // Winner after user clicks reveal
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [stageKey, setStageKey] = useState(0);
  const prevStageRef = useRef(-1);

  // Called by physics when a marble crosses the finish line
  const handleWinner = useCallback((name: string) => {
    setPendingWinner(name);
    setIsRunning(false);
  }, []);

  const handleStageChange = useCallback((idx: number) => {
    if (idx !== prevStageRef.current) {
      prevStageRef.current = idx;
      setCurrentStage(idx);
      setStageKey(k => k + 1);
    }
  }, []);

  const revealWinner = useCallback(() => {
    if (!pendingWinner) return;
    setRoundWinner(pendingWinner);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  }, [pendingWinner]);

  const { canvasRef, startDrop, cleanup } = useMarblePhysics(handleWinner, handleStageChange);

  useEffect(() => {
    setPendingWinner(null);
    setRoundWinner(null);
    setIsRunning(false);
    setCurrentStage(-1);
    prevStageRef.current = -1;
    const t = setTimeout(() => {
      setIsRunning(true);
      const canvas = canvasRef.current;
      if (canvas) { canvas.width = 343; canvas.height = 630; }
      startDrop(remaining);
    }, 400);
    return () => { clearTimeout(t); cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const medal = RANK_MEDALS[roundNumber] ?? `${roundNumber}`;
  const isTopThree = roundNumber <= 3;
  const stageInfo = currentStage >= 0 ? STAGE_INFO[currentStage] : null;

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "linear-gradient(160deg, #080818 0%, #0a0d1e 100%)" }}
    >
      <Confetti active={showConfetti} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{medal}</span>
          <div>
            <h2 className="text-base font-black leading-none" style={{ color: "#fff" }}>
              {roundNumber}등 추첨
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              {remaining.length}명 참가 중
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-bold" style={{ color: "rgba(255,215,0,0.8)" }}>
              {roundNumber} / {totalParticipants}
            </div>
            <div className="w-24 h-1 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${((roundNumber - 1) / totalParticipants) * 100}%`,
                  background: "linear-gradient(90deg, #6c3fc4, #ffd700)",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
          <button
            onClick={onSkipToEnd}
            className="text-xs px-2.5 py-1.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            건너뛰기
          </button>
        </div>
      </header>

      {/* Stage indicator */}
      <div className="relative z-10 px-4 mb-2 flex-shrink-0" style={{ minHeight: 44 }}>
        {stageInfo && isRunning && !pendingWinner ? (
          <div
            key={stageKey}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              animation: "stageIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <span className="text-xl">{stageInfo.icon}</span>
            <div>
              <div className="text-sm font-black" style={{ color: "rgba(255,255,255,0.9)" }}>{stageInfo.name}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{stageInfo.desc}</div>
            </div>
            <div className="ml-auto flex gap-1">
              {STAGE_INFO.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === currentStage ? 16 : 6,
                    height: 6,
                    background: i <= currentStage
                      ? "linear-gradient(90deg, #6c3fc4, #ffd700)"
                      : "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>
          </div>
        ) : !pendingWinner && isRunning ? (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: "#ffd700", animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite alternate` }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>준비 중...</span>
          </div>
        ) : null}
      </div>

      {/* Canvas + Ranking */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-3 px-4 pb-4 min-h-0">
        {/* Canvas */}
        <div
          className="flex-1 relative rounded-3xl overflow-hidden min-h-0"
          style={{
            minHeight: 340,
            background: "linear-gradient(180deg, #060616 0%, #0a0d1e 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="absolute top-0 left-1/4 right-1/4 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(100,140,255,0.5), transparent)" }}
          />

          {!isRunning && !pendingWinner && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-5xl opacity-10">🎱</div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ opacity: isRunning || pendingWinner ? 1 : 0, transition: "opacity 0.3s" }}
          />

          {/* Reveal button — floats over canvas when physics is done */}
          {pendingWinner && !roundWinner && (
            <div className="absolute inset-0 flex items-end justify-center pb-10">
              <button
                onClick={revealWinner}
                className="px-10 py-5 rounded-3xl font-black text-xl active:scale-95 transition-transform"
                style={{
                  background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                  color: "#1a1000",
                  boxShadow: "0 0 40px rgba(255,180,0,0.55), 0 8px 32px rgba(0,0,0,0.5)",
                  animation: "revealPulse 1.8s ease-in-out infinite",
                }}
              >
                🎉 결과 공개!
              </button>
            </div>
          )}
        </div>

        {/* Ranking sidebar */}
        {ranking.length > 0 && (
          <div
            className="lg:w-48 flex-shrink-0 rounded-2xl p-3 overflow-y-auto"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", maxHeight: 300 }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>지금까지 순위</p>
            <div className="flex flex-col gap-1.5">
              {ranking.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
                  style={{ background: i < 3 ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.03)" }}
                >
                  <span className="text-sm">{RANK_MEDALS[i + 1] ?? `${i + 1}`}</span>
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: i < 3 ? "rgba(255,215,0,0.85)" : "rgba(255,255,255,0.6)" }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Round winner bottom-sheet — only after user clicks reveal */}
      {roundWinner && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="relative rounded-t-3xl px-6 pt-6 pb-10"
            style={{
              background: "linear-gradient(180deg, #1e1432 0%, #12101e 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderBottom: "none",
              animation: "slideUp 0.4s cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            <div
              className="absolute top-0 left-1/4 right-1/4 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.7), transparent)" }}
            />
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">{medal}</div>
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: "rgba(255,215,0,0.55)" }}
              >
                {roundNumber}등 당첨
              </p>
              <div
                className="inline-block px-8 py-4 rounded-2xl"
                style={{ background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.2)" }}
              >
                <span
                  className="font-black shimmer-text"
                  style={{ fontSize: roundWinner.length > 6 ? "1.9rem" : "2.5rem", lineHeight: 1.2 }}
                >
                  {roundWinner}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>🎉 축하드립니다!</p>
            </div>

            <div className="flex gap-3">
              {remaining.length > 1 ? (
                <button
                  onClick={() => onRoundComplete(roundWinner)}
                  className="flex-1 py-4 rounded-2xl font-black text-base relative overflow-hidden active:scale-95 transition-all"
                  style={{
                    background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                    color: "#1a1000",
                    boxShadow: "0 6px 24px rgba(255,180,0,0.3)",
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-25"
                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 60%)" }}
                  />
                  <span className="relative">
                    {isTopThree ? `${roundNumber + 1}등 추첨하기 →` : "다음 순위 추첨 →"}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => onRoundComplete(roundWinner)}
                  className="flex-1 py-4 rounded-2xl font-black text-base relative overflow-hidden active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #6c3fc4, #3a7bd5)",
                    color: "#fff",
                    boxShadow: "0 6px 24px rgba(108,63,196,0.4)",
                  }}
                >
                  <span className="relative">🏆 최종 결과 보기</span>
                </button>
              )}
              {remaining.length > 2 && (
                <button
                  onClick={onSkipToEnd}
                  className="px-5 py-4 rounded-2xl text-sm font-medium active:scale-95"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  결과보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes bounce {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes stageIn {
          from { transform: scale(0.92) translateY(4px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes revealPulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 40px rgba(255,180,0,0.55), 0 8px 32px rgba(0,0,0,0.5); }
          50%       { transform: scale(1.04); box-shadow: 0 0 60px rgba(255,180,0,0.8),  0 8px 40px rgba(0,0,0,0.5); }
        }
      `}</style>
    </div>
  );
}

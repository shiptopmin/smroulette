"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useMarblePhysics } from "../hooks/useMarblePhysics";
import { Confetti } from "./Confetti";

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const STAGE_INFO = [
  { name: "갈튼 보드",      icon: "⬇️",  desc: "핀 사이로 구슬이 흩어집니다" },
  { name: "지그재그",       icon: "↔️",  desc: "경사판을 타고 좌우로 튕깁니다" },
  { name: "스피너 지옥",    icon: "🌀",  desc: "회전하는 장애물을 돌파하세요" },
  { name: "이동 플랫폼",    icon: "🚧",  desc: "움직이는 발판이 경로를 바꿉니다!" },
  { name: "고탄성 범퍼",    icon: "💥",  desc: "닿는 순간 팅겨나가는 짜릿함!" },
  { name: "최후의 질주",    icon: "🏁",  desc: "승자가 결정되는 순간!" },
];

export function DrawingScreen({ names, onComplete, onSkipToEnd }: {
  names: string[];
  onComplete: (rankings: string[]) => void;
  onSkipToEnd: () => void;
}) {
  const [firstFinisher, setFirstFinisher] = useState<string | null>(null);
  const [rankings, setRankings] = useState<string[] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const prevStageRef = useRef(-1);

  const handleFirstFinish = useCallback((name: string) => {
    setFirstFinisher(name);
  }, []);

  const handleComplete = useCallback((ranks: string[]) => {
    setRankings(ranks);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  }, []);

  const handleStageChange = useCallback((idx: number) => {
    if (idx !== prevStageRef.current) {
      prevStageRef.current = idx;
      setCurrentStage(idx);
    }
  }, []);

  const { canvasRef, startDrop, revealResults, cleanup } = useMarblePhysics(
    handleFirstFinish, handleComplete, handleStageChange
  );

  useEffect(() => {
    setFirstFinisher(null);
    setRankings(null);
    setCurrentStage(-1);
    if (canvasRef.current) canvasRef.current.style.top = "0px";

    const t = setTimeout(() => {
      if (canvasRef.current) canvasRef.current.width = 343;
      startDrop(names);
    }, 400);
    return () => { clearTimeout(t); cleanup(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageInfo = currentStage >= 0 ? STAGE_INFO[currentStage] : null;

  return (
    <div className="min-h-dvh flex flex-col bg-[#080818]">
      <Confetti active={showConfetti} />
      <header className="p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 text-white">
          <span className="text-2xl">🎱</span>
          <h2 className="font-bold">구슬 추첨 레이스</h2>
        </div>
        <button onClick={onSkipToEnd} className="text-xs text-white/30 px-3 py-1 border border-white/10 rounded-lg">건너뛰기</button>
      </header>

      <div className="flex-1 relative mx-4 mb-4 rounded-3xl overflow-hidden bg-[#050510] shadow-2xl border border-white/5">
        {/* 스테이지 안내창 */}
        {stageInfo && (
          <div className="absolute top-4 left-4 right-4 z-20 p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-white animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <span className="text-xl">{stageInfo.icon}</span>
              <span className="font-bold text-sm">{stageInfo.name}</span>
            </div>
            <p className="text-[10px] text-white/50">{stageInfo.desc}</p>
          </div>
        )}

        {/* 물리 엔진 캔버스 */}
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* 결과 확인 버튼 — 첫 번째 구슬이 결승선 통과 후 표시 */}
        {firstFinisher && !rankings && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
            <button
              onClick={revealResults}
              className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl font-black text-xl shadow-yellow-500/20 shadow-2xl scale-110 active:scale-95 transition-all"
            >
              🎉 결과 확인!
            </button>
          </div>
        )}
      </div>

      {/* 전체 순위 결과창 */}
      {rankings && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md">
          <div className="bg-[#1e1432] rounded-t-3xl border-t border-white/10 animate-in slide-in-from-bottom flex flex-col max-h-[80vh]">
            <div className="p-6 text-center flex-shrink-0">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-white text-xl font-black">최종 순위</h2>
              <p className="text-white/40 text-xs mt-1">총 {rankings.length}명</p>
            </div>

            {/* 순위 리스트 */}
            <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ scrollbarWidth: "none" }}>
              <div className="flex flex-col gap-2">
                {rankings.map((name, i) => {
                  const rank = i + 1;
                  const medal = RANK_MEDALS[rank];
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                      style={{
                        background: rank === 1
                          ? "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.08))"
                          : rank === 2 ? "rgba(192,192,192,0.08)"
                          : rank === 3 ? "rgba(205,127,50,0.08)"
                          : "rgba(255,255,255,0.03)",
                        border: rank === 1 ? "1px solid rgba(255,215,0,0.25)"
                          : rank <= 3 ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="flex items-center justify-center flex-shrink-0 font-black"
                        style={{
                          width: rank <= 3 ? 40 : 32, height: rank <= 3 ? 40 : 32,
                          borderRadius: rank <= 3 ? 12 : 8,
                          fontSize: rank <= 3 ? "1.4rem" : "0.75rem",
                          background: rank > 3 ? "rgba(255,255,255,0.05)" : undefined,
                          color: rank > 3 ? "rgba(255,255,255,0.4)" : undefined,
                        }}>
                        {medal ?? rank}
                      </div>
                      <span className="font-bold flex-1 truncate"
                        style={{
                          fontSize: rank === 1 ? "1.2rem" : rank <= 3 ? "1rem" : "0.9rem",
                          color: rank === 1 ? "rgba(255,215,0,0.95)"
                            : rank <= 3 ? "rgba(255,255,255,0.9)"
                            : "rgba(255,255,255,0.6)",
                        }}>
                        {name}
                      </span>
                      <span className="text-xs flex-shrink-0"
                        style={{ color: rank === 1 ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.2)" }}>
                        {rank}등
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-5 pb-8 pt-3 flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => onComplete(rankings)}
                className="w-full py-4 rounded-2xl font-black text-base relative overflow-hidden transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#1a1000", boxShadow: "0 8px 32px rgba(255,180,0,0.25)" }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useMarblePhysics } from "../hooks/useMarblePhysics";
import { Confetti } from "./Confetti";

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const STAGE_INFO = [
  { name: "낙하 구간",  icon: "⬇️",  desc: "핀 사이로 구슬이 쏟아집니다" },
  { name: "스피너 지옥", icon: "🌀",  desc: "회전하는 장애물을 돌파하세요" },
  { name: "고탄성 범퍼", icon: "💥",  desc: "닿는 순간 팅겨나가는 짜릿함!" },
  { name: "죽음의 깔때기", icon: "📐",  desc: "좁은 문을 통과해야 합니다" },
  { name: "최후의 질주", icon: "🏁",  desc: "승자가 결정되는 순간!" },
];

export function DrawingScreen({ roundNumber, totalParticipants, remaining, ranking, onRoundComplete, onSkipToEnd }: any) {
  const [pendingWinner, setPendingWinner] = useState<string | null>(null);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const prevStageRef = useRef(-1);

  const handleWinner = useCallback((name: string) => {
    setPendingWinner(name);
    setIsRunning(false);
  }, []);

  const handleStageChange = useCallback((idx: number) => {
    if (idx !== prevStageRef.current) {
      prevStageRef.current = idx;
      setCurrentStage(idx);
    }
  }, []);

  const { canvasRef, startDrop, cleanup } = useMarblePhysics(handleWinner, handleStageChange);

  useEffect(() => {
    setPendingWinner(null);
    setRoundWinner(null);
    setIsRunning(false);
    setCurrentStage(-1);

    if (canvasRef.current) {
      canvasRef.current.style.top = "0px";
    }

    const t = setTimeout(() => {
      setIsRunning(true);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 343;
        // ⚠️ 절대 여기서 canvas.height를 고정값으로 설정하지 마세요!
      }
      startDrop(remaining);
    }, 400);
    return () => { clearTimeout(t); cleanup(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealWinner = () => {
    setRoundWinner(pendingWinner);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  };

  const medal = RANK_MEDALS[roundNumber] ?? `${roundNumber}`;
  const stageInfo = currentStage >= 0 ? STAGE_INFO[currentStage] : null;

  return (
    <div className="min-h-dvh flex flex-col bg-[#080818]">
      <Confetti active={showConfetti} />
      <header className="p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 text-white">
          <span className="text-2xl">{medal}</span>
          <h2 className="font-bold">{roundNumber}등 추첨 중</h2>
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

        {/* 결과 공개 버튼 */}
        {pendingWinner && !roundWinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
            <button onClick={revealWinner} className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl font-black text-xl shadow-yellow-500/20 shadow-2xl scale-110 active:scale-95 transition-all">
              🎉 결과 확인!
            </button>
          </div>
        )}
      </div>

      {/* 우승자 결과창 */}
      {roundWinner && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md">
          <div className="bg-[#1e1432] p-8 rounded-t-3xl text-center border-t border-white/10 animate-in slide-in-from-bottom">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-yellow-500 font-bold mb-2 uppercase tracking-widest text-xs">{roundNumber}등 당첨자</p>
            <h1 className="text-white text-4xl font-black mb-8">{roundWinner}</h1>
            <button onClick={() => onRoundComplete(roundWinner)} className="w-full py-4 bg-yellow-500 rounded-xl font-bold">다음으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

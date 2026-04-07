"use client";

import { forwardRef, useMemo } from "react";

type Props = {
  isRunning: boolean;
};

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const MARBLE_COLORS = [
  "#FF6B6B", "#FF8E53", "#FFC857", "#4ECDC4", "#45B7D1",
  "#96CEB4", "#BB8FCE", "#F1948A", "#85C1E9",
];

export const MarbleCanvas = forwardRef<HTMLCanvasElement, Props>(function MarbleCanvas(
  { isRunning },
  ref
) {
  const stars = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      width: seededRand(i * 5) * 2 + 0.5,
      left: seededRand(i * 5 + 1) * 100,
      top: seededRand(i * 5 + 2) * 90,
      opacity: seededRand(i * 5 + 3) * 0.5 + 0.1,
      delay: seededRand(i * 5 + 4) * 3,
    })), []);

  const decorativeMarbles = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      color: MARBLE_COLORS[i % MARBLE_COLORS.length],
      size: seededRand(i * 3 + 10) * 24 + 28,
      left: 10 + (i * 14) + seededRand(i * 3 + 11) * 8,
      bottom: seededRand(i * 3 + 12) * 15 + 5,
      delay: seededRand(i * 3 + 13) * 2,
    })), []);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Star field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((s, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: s.width + "px",
              height: s.width + "px",
              left: s.left + "%",
              top: s.top + "%",
              background: "white",
              opacity: s.opacity,
              animation: `twinkle ${2 + s.delay}s ease-in-out ${s.delay}s infinite alternate`,
            }} />
        ))}
      </div>

      {/* Idle decorative scene */}
      {!isRunning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
          {/* Decorative marbles at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-28 overflow-hidden">
            {decorativeMarbles.map((m, i) => (
              <div key={i}
                className="absolute rounded-full"
                style={{
                  width: m.size,
                  height: m.size,
                  left: m.left + "%",
                  bottom: m.bottom + "%",
                  background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), ${m.color} 50%, rgba(0,0,0,0.3))`,
                  boxShadow: `0 4px 20px ${m.color}50, inset 0 -3px 6px rgba(0,0,0,0.2)`,
                  animation: `floatMarble ${3 + m.delay}s ease-in-out ${m.delay}s infinite alternate`,
                  opacity: 0.7,
                }} />
            ))}
            {/* Ground glow */}
            <div className="absolute bottom-0 left-0 right-0 h-12"
              style={{ background: "linear-gradient(to top, rgba(255,180,0,0.08), transparent)" }} />
          </div>

          {/* Center icon & text */}
          <div className="flex flex-col items-center gap-3 mb-16">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{
                background: "linear-gradient(135deg, rgba(108,63,196,0.3), rgba(58,123,213,0.3))",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 32px rgba(108,63,196,0.2)",
              }}>
              🎱
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                추첨을 시작해보세요
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                구슬이 페그를 통해 자연스럽게 떨어집니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Physics canvas */}
      <canvas
        ref={ref}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: isRunning ? 1 : 0, transition: "opacity 0.4s" }}
      />

      <style jsx>{`
        @keyframes twinkle {
          from { opacity: 0.1; transform: scale(0.8); }
          to { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes floatMarble {
          from { transform: translateY(0px) rotate(0deg); }
          to { transform: translateY(-8px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
});

"use client";

import { useEffect } from "react";

export function Confetti({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;

      const duration = 4000;
      const end = Date.now() + duration;

      const colors = ["#ffd700", "#ff6b9d", "#4ecdc4", "#ff8e53", "#96ceb4", "#bb8fce"];

      const frame = () => {
        if (cancelled || Date.now() > end) return;

        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors,
          zIndex: 9999,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors,
          zIndex: 9999,
        });

        requestAnimationFrame(frame);
      };

      frame();

      // Big burst at center
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
        zIndex: 9999,
        startVelocity: 40,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [active]);

  return null;
}

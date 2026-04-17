"use client";
import { useRef, useCallback } from "react";

export type MarbleBody = { id: string; name: string; color: string; body: unknown };
type Return = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startDrop: (names: string[]) => void;
  revealResults: () => void;
  cleanup: () => void;
};

const COLORS = ["#00FFAB", "#FF2E63", "#08D9D6", "#FFDE7D", "#FF9A00", "#B2FCFF", "#FF00FF", "#711DB0", "#39FF14", "#FF6EC7"];
const MAX = 10;
const R = 11;
const VW = 343;
const VH = 600;
const WH = 5000;
const ZONE = [0, 900, 2000, 3200, 4200, WH];

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function useMarblePhysics(
  onFirstFinish: (name: string) => void,
  onComplete: (rankings: string[]) => void,
  onStage?: (i: number) => void,
): Return {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const S = useRef({
    engine: null as any, render: null as any, runner: null as any,
    marbles: [] as MarbleBody[], spinners: [] as any[],
    timer: null as any, stuckTimer: null as any,
    lastPos: new Map<number, { x: number; y: number }>(),
    finishOrder: [] as string[],
    done: false, stage: -1, camY: 0, tick: 0,
    rafRunning: false, rafId: 0,
  });

  const cleanup = useCallback(() => {
    const s = S.current;
    s.rafRunning = false;
    if (s.rafId) cancelAnimationFrame(s.rafId);
    if (s.timer) clearTimeout(s.timer);
    if (s.stuckTimer) clearInterval(s.stuckTimer);
    if (canvasRef.current) canvasRef.current.style.top = "0px";
    import("matter-js").then((M) => {
      if (s.render) (M.Render as any).stop(s.render);
      if (s.runner) (M.Runner as any).stop(s.runner);
      if (s.engine) (M.Engine as any).clear(s.engine);
      s.engine = s.render = s.runner = null;
      s.marbles = []; s.spinners = []; s.done = false; s.stage = -1;
      s.camY = 0; s.tick = 0; s.finishOrder = [];
    });
  }, []);

  // 버튼으로 강제 결과 공개 — 현재 y위치로 나머지 순위 결정
  const revealResults = useCallback(() => {
    const s = S.current;
    if (s.done) return;
    s.done = true;
    if (s.timer) clearTimeout(s.timer);
    const finished = new Set(s.finishOrder);
    const remaining = s.marbles
      .filter(m => !finished.has(m.name))
      .sort((a, b) => (b.body as any).position.y - (a.body as any).position.y)
      .map(m => m.name);
    onComplete([...s.finishOrder, ...remaining]);
  }, [onComplete]);

  const startDrop = useCallback(async (names: string[]) => {
    if (!canvasRef.current) return;
    cleanup();
    const s = S.current;
    s.done = false; s.stage = -1; s.camY = 0; s.tick = 0; s.finishOrder = [];
    const M = await import("matter-js");
    const canvas = canvasRef.current;

    canvas.width = VW; canvas.height = WH;
    canvas.style.position = "absolute";
    canvas.style.top = "0px";

    const simNames = shuffle(names.length > MAX ? names.slice(0, MAX) : names);
    const count = simNames.length;

    const engine = M.Engine.create({ gravity: { x: 0, y: 0.85 } });
    s.engine = engine;

    const render = M.Render.create({
      canvas, engine,
      options: { width: VW, height: WH, wireframes: false, background: "#050510" }
    });
    s.render = render;
    const runner = M.Runner.create(); s.runner = runner;

    const bodies: any[] = [];

    const wall = (x: number, y: number, w: number, h: number) =>
      M.Bodies.rectangle(x, y, w, h, { isStatic: true, render: { fillStyle: "transparent", strokeStyle: "transparent", lineWidth: 0 } });
    bodies.push(wall(-15, WH / 2, 30, WH * 2), wall(VW + 15, WH / 2, 30, WH * 2));

    const plank = (x: number, y: number, w: number, angle: number, color: string, rest = 0.3) => {
      const b = M.Bodies.rectangle(x, y, w, 12, {
        isStatic: true, friction: 0.05, restitution: rest,
        render: { fillStyle: color, strokeStyle: color, lineWidth: 2 }
      });
      M.Body.setAngle(b, angle);
      return b;
    };

    const pin = (x: number, y: number, r: number, color: string) =>
      M.Bodies.circle(x, y, r, {
        isStatic: true, restitution: 0.5, friction: 0.01,
        render: { fillStyle: color, strokeStyle: "#ffffff44", lineWidth: 1 }
      });

    // ══════════════════════════════════════════════
    // [Zone 0] 갈튼 보드 (y 80–870)
    // ══════════════════════════════════════════════
    for (let row = 0; row < 14; row++) {
      const cols = row % 2 === 0 ? 8 : 7;
      const startX = row % 2 === 0 ? 20 : 40;
      for (let col = 0; col < cols; col++) {
        bodies.push(pin(startX + col * 40, 80 + row * 56, 7, "#4466ff88"));
      }
    }

    // ══════════════════════════════════════════════
    // [Zone 1] 지그재그 경사판 (y 920–1940)
    // ══════════════════════════════════════════════
    const plankW = 240;
    const zigzagRows = [
      { x: VW * 0.62, y: 960,  angle: -0.38, col: "#9966ff" },
      { x: VW * 0.38, y: 1070, angle:  0.38, col: "#9966ff" },
      { x: VW * 0.62, y: 1180, angle: -0.38, col: "#9966ff" },
      { x: VW * 0.38, y: 1290, angle:  0.38, col: "#9966ff" },
      { x: VW * 0.62, y: 1400, angle: -0.38, col: "#aa77ff" },
      { x: VW * 0.38, y: 1510, angle:  0.38, col: "#aa77ff" },
      { x: VW * 0.62, y: 1620, angle: -0.38, col: "#aa77ff" },
      { x: VW * 0.38, y: 1730, angle:  0.38, col: "#aa77ff" },
      { x: VW * 0.62, y: 1840, angle: -0.38, col: "#aa77ff" },
    ];
    zigzagRows.forEach(p => bodies.push(plank(p.x, p.y, plankW, p.angle, p.col)));
    // 양옆 빈틈 가이드 핀
    for (let row = 0; row < 5; row++) {
      bodies.push(pin(10, 1010 + row * 200, 8, "#9966ff88"), pin(VW - 10, 1010 + row * 200, 8, "#9966ff88"));
    }

    // ══════════════════════════════════════════════
    // [Zone 2] 스피너 + 핀 혼합 (y 2020–3140)
    // 스피너 3행 + 핀 격자 2행으로 다양화
    // ══════════════════════════════════════════════
    // 스피너 3행 (팔 65px)
    const spinnerRows = [
      [VW * 0.18, 2100], [VW * 0.50, 2100], [VW * 0.82, 2100],
      [VW * 0.34, 2380], [VW * 0.66, 2380],
      [VW * 0.18, 2660], [VW * 0.50, 2660], [VW * 0.82, 2660],
    ];
    spinnerRows.forEach(([x, y], idx) => {
      const speed = idx % 2 === 0 ? 0.05 : -0.05;
      const arm1 = M.Bodies.rectangle(x, y, 65, 9, { isStatic: true, friction: 0.01, restitution: 0.6, render: { fillStyle: "#08D9D6", strokeStyle: "#08D9D6", lineWidth: 2 } });
      const arm2 = M.Bodies.rectangle(x, y, 9, 65, { isStatic: true, friction: 0.01, restitution: 0.6, render: { fillStyle: "#08D9D6", strokeStyle: "#08D9D6", lineWidth: 2 } });
      s.spinners.push({ b1: arm1, b2: arm2, speed });
      bodies.push(arm1, arm2);
    });
    // 중간 변화: 큰 핀 격자 (y 2800–3100)
    for (let row = 0; row < 3; row++) {
      const cols = row % 2 === 0 ? 6 : 5;
      const sx = row % 2 === 0 ? 25 : 50;
      for (let col = 0; col < cols; col++) {
        bodies.push(pin(sx + col * 55, 2840 + row * 130, 10, "#08D9D688"));
      }
    }
    // 양옆 가이드 핀
    for (let row = 0; row < 4; row++) {
      bodies.push(pin(10, 2200 + row * 220, 8, "#08D9D688"), pin(VW - 10, 2200 + row * 220, 8, "#08D9D688"));
    }

    // ══════════════════════════════════════════════
    // [Zone 3] 탄성 범퍼 격자 (y 3220–4160)
    // ══════════════════════════════════════════════
    const bumperR = 18;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        bodies.push(M.Bodies.circle(38 + col * 68 + (row % 2) * 34, 3280 + row * 170, bumperR, {
          isStatic: true, restitution: 1.2,
          render: { fillStyle: "#FF2E63", strokeStyle: "#ff6688", lineWidth: 3 }
        }));
      }
    }
    for (let col = 0; col < 4; col++) {
      bodies.push(M.Bodies.circle(55 + col * 80, 4080, bumperR, {
        isStatic: true, restitution: 1.2,
        render: { fillStyle: "#FF2E63", strokeStyle: "#ff6688", lineWidth: 3 }
      }));
    }

    // ══════════════════════════════════════════════
    // [Zone 4] 최후의 질주 (y 4220–5000)
    // ══════════════════════════════════════════════
    const funnelColor = "#FFDE7D55";
    // 1차 깔때기 (교차 없음: 끝 사이 91px 여유)
    bodies.push(
      plank(VW * 0.14, 4320, 170, 0.40, funnelColor, 0.25),
      plank(VW * 0.86, 4320, 170, -0.40, funnelColor, 0.25),
    );
    // 지그재그 경사판 3개
    bodies.push(
      plank(VW * 0.65, 4480, 180, -0.30, funnelColor, 0.2),
      plank(VW * 0.35, 4600, 180,  0.30, funnelColor, 0.2),
      plank(VW * 0.65, 4720, 180, -0.30, funnelColor, 0.2),
    );
    // 결승선 직전 범퍼
    for (let i = 0; i < 4; i++) {
      bodies.push(M.Bodies.circle(42 + i * 88, 4860, 14, {
        isStatic: true, restitution: 0.9,
        render: { fillStyle: "#FFDE7D", strokeStyle: "#ffff00", lineWidth: 2 }
      }));
    }
    // 결승선 센서
    const sensor = M.Bodies.rectangle(VW / 2, WH - 60, VW, 20, {
      isStatic: true, isSensor: true, label: "finish",
      render: { fillStyle: "#FFDE7D55", strokeStyle: "#FFDE7D", lineWidth: 3 }
    });
    bodies.push(sensor);

    // ══════════════════════════════════════════════
    // 구슬 생성 — 모두 동일 물리 속성 (공정한 레이스)
    // ══════════════════════════════════════════════
    const spread = VW * 0.75;
    const marbles = simNames.map((name, i) => {
      const baseX = VW / 2 - spread / 2 + (i / Math.max(count - 1, 1)) * spread;
      const x = baseX + (Math.random() - 0.5) * 15;
      const y = -R * 2 - i * 20;
      const b = M.Bodies.circle(x, y, R, {
        restitution: 0.35, friction: 0.02, frictionAir: 0.012,
        density: 0.002, // 모든 구슬 동일
        render: { fillStyle: COLORS[i % COLORS.length], strokeStyle: "#ffffff88", lineWidth: 2 },
        label: "marble"
      });
      return { id: String((b as any).id), name, color: COLORS[i % COLORS.length], body: b };
    });
    s.marbles = marbles;
    M.Composite.add(engine.world, [...bodies, ...marbles.map(m => m.body as any)]);

    // ── 이벤트 ───────────────────────────────────
    M.Events.on(engine, "beforeUpdate", () => {
      s.tick++;
      s.spinners.forEach(sp => {
        M.Body.setAngle(sp.b1, sp.b1.angle + sp.speed);
        M.Body.setAngle(sp.b2, sp.b2.angle + sp.speed);
      });
    });

    // 이름 라벨 렌더
    M.Events.on(render, "afterRender", () => {
      const ctx = (render as any).context;
      ctx.save();
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      s.marbles.forEach((m, idx) => {
        const { x, y } = (m.body as any).position;
        const txt = m.name.length > 5 ? m.name.slice(0, 4) + ".." : m.name;
        const tw = ctx.measureText(txt).width;
        const rank = s.finishOrder.indexOf(m.name);
        const isFinished = rank >= 0;
        ctx.fillStyle = isFinished ? "rgba(255,220,0,0.9)" : "rgba(0,0,0,0.75)";
        ctx.fillRect(x - tw / 2 - 3, y - R - 19, tw + 6, 14);
        ctx.fillStyle = isFinished ? "#000" : "#fff";
        ctx.fillText(isFinished ? `${rank + 1}등` : txt, x, y - R - 8);
      });
      ctx.restore();
    });

    // 결승선 감지 — 통과 순서 기록
    M.Events.on(engine, "collisionStart", (e: any) => {
      if (s.done) return;
      e.pairs.forEach((p: any) => {
        const mb = p.bodyA.label === "finish" ? p.bodyB : p.bodyB.label === "finish" ? p.bodyA : null;
        if (!mb) return;
        const found = s.marbles.find(m => (m.body as any).id === mb.id && !s.finishOrder.includes(m.name));
        if (!found) return;
        s.finishOrder.push(found.name);
        if (s.finishOrder.length === 1) {
          // 첫 번째 도착 → 버튼 표시
          onFirstFinish(found.name);
          if (s.timer) clearTimeout(s.timer);
          // 5초 내에 나머지도 처리
          s.timer = setTimeout(() => {
            if (!s.done) revealResults();
          }, 8000);
        }
        if (s.finishOrder.length === s.marbles.length) {
          s.done = true;
          if (s.timer) clearTimeout(s.timer);
          onComplete([...s.finishOrder]);
        }
      });
    });

    // 전체 폴백 타이머
    s.timer = setTimeout(() => {
      if (!s.done) revealResults();
    }, 55000);

    // 막힘 방지
    s.stuckTimer = setInterval(() => {
      if (s.done) return;
      s.marbles.forEach(m => {
        const b = m.body as any;
        const last = s.lastPos.get(b.id);
        if (last && Math.abs(b.position.x - last.x) + Math.abs(b.position.y - last.y) < 3) {
          M.Body.setVelocity(b, { x: (Math.random() - 0.5) * 2, y: Math.abs(b.velocity.y) + 1 });
        }
        s.lastPos.set(b.id, { x: b.position.x, y: b.position.y });
      });
    }, 1500);

    // ── CSS 카메라 RAF ────────────────────────────
    s.rafRunning = true;
    const loop = () => {
      if (!s.rafRunning) return;
      let leadY = 0;
      s.marbles.forEach(m => { leadY = Math.max(leadY, (m.body as any).position.y); });
      const target = Math.max(0, Math.min(WH - VH, leadY - VH * 0.35));
      s.camY += (target - s.camY) * 0.1;
      if (canvasRef.current) canvasRef.current.style.top = `-${Math.round(s.camY)}px`;
      const si = ZONE.findIndex((z, i) => i < ZONE.length - 1 && leadY >= z && leadY < ZONE[i + 1]);
      if (si >= 0 && si !== s.stage) { s.stage = si; onStage?.(si); }
      s.rafId = requestAnimationFrame(loop);
    };
    s.rafId = requestAnimationFrame(loop);

    M.Render.run(render);
    M.Runner.run(runner, engine);
  }, [cleanup, onFirstFinish, onComplete, onStage, revealResults]);

  return { canvasRef, startDrop, revealResults, cleanup };
}

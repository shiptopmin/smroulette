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
const WH = 5200;
// Zone 0: 갈튼 | Zone 1: 지그재그 | Zone 2: 스피너 | Zone 3: 이동 플랫폼 | Zone 4: 범퍼 | Zone 5: 진자 | Zone 6: 최후의 질주
const ZONE = [0, 800, 1350, 2050, 2900, 3750, 4550, WH];

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
    marbles: [] as MarbleBody[],
    spinners: [] as any[],
    movingPlatforms: [] as any[],
    pendulums: [] as any[], // 진자
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
      s.marbles = []; s.spinners = []; s.movingPlatforms = []; s.pendulums = [];
      s.done = false; s.stage = -1; s.camY = 0; s.tick = 0; s.finishOrder = [];
    });
  }, []);

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

    // 중력 강화
    const engine = M.Engine.create({ gravity: { x: 0, y: 1.5 } });
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
    // [Zone 0] 갈튼 보드 (y 70–720) — 10행
    // ══════════════════════════════════════════════
    for (let row = 0; row < 10; row++) {
      const cols = row % 2 === 0 ? 8 : 7;
      const startX = row % 2 === 0 ? 20 : 40;
      for (let col = 0; col < cols; col++) {
        bodies.push(pin(startX + col * 40, 70 + row * 65, 7, "#4466ff88"));
      }
    }

    // ══════════════════════════════════════════════
    // [Zone 1] 지그재그 경사판 (y 830–1300) — 5개
    // ══════════════════════════════════════════════
    const zigzagRows = [
      { x: VW * 0.62, y: 870,  angle: -0.38, col: "#9966ff" },
      { x: VW * 0.38, y: 970,  angle:  0.38, col: "#9966ff" },
      { x: VW * 0.62, y: 1070, angle: -0.38, col: "#aa77ff" },
      { x: VW * 0.38, y: 1170, angle:  0.38, col: "#aa77ff" },
      { x: VW * 0.62, y: 1270, angle: -0.38, col: "#aa77ff" },
    ];
    zigzagRows.forEach(p => bodies.push(plank(p.x, p.y, 240, p.angle, p.col)));
    for (let row = 0; row < 3; row++) {
      bodies.push(pin(10, 900 + row * 170, 8, "#9966ff88"), pin(VW - 10, 900 + row * 170, 8, "#9966ff88"));
    }

    // ══════════════════════════════════════════════
    // [Zone 2] 스피너 + 핀 혼합 (y 1380–2000)
    // ══════════════════════════════════════════════
    const spinnerRows = [
      [VW * 0.18, 1440], [VW * 0.50, 1440], [VW * 0.82, 1440],
      [VW * 0.34, 1700], [VW * 0.66, 1700],
      [VW * 0.18, 1960], [VW * 0.50, 1960], [VW * 0.82, 1960],
    ];
    spinnerRows.forEach(([x, y], idx) => {
      const speed = idx % 2 === 0 ? 0.05 : -0.05;
      const arm1 = M.Bodies.rectangle(x, y, 65, 9, { isStatic: true, friction: 0.01, restitution: 0.6, render: { fillStyle: "#08D9D6", strokeStyle: "#08D9D6", lineWidth: 2 } });
      const arm2 = M.Bodies.rectangle(x, y, 9, 65, { isStatic: true, friction: 0.01, restitution: 0.6, render: { fillStyle: "#08D9D6", strokeStyle: "#08D9D6", lineWidth: 2 } });
      s.spinners.push({ b1: arm1, b2: arm2, speed });
      bodies.push(arm1, arm2);
    });
    for (let row = 0; row < 2; row++) {
      const cols = row % 2 === 0 ? 6 : 5;
      const sx = row % 2 === 0 ? 25 : 50;
      for (let col = 0; col < cols; col++) {
        bodies.push(pin(sx + col * 55, 2100 + row * 100, 10, "#08D9D688"));
      }
    }
    for (let row = 0; row < 3; row++) {
      bodies.push(pin(10, 1540 + row * 220, 8, "#08D9D688"), pin(VW - 10, 1540 + row * 220, 8, "#08D9D688"));
    }

    // ══════════════════════════════════════════════
    // [Zone 3] 이동 플랫폼 구간 (y 2100–2860)
    // 좌우로 왕복하는 플랫폼 — 매 레이스마다 경로 달라짐
    // ══════════════════════════════════════════════
    const platformDefs = [
      { baseX: VW * 0.30, y: 2200, amplitude: 90, speed: 0.022, phase: 0 },
      { baseX: VW * 0.70, y: 2320, amplitude: 80, speed: 0.028, phase: Math.PI },
      { baseX: VW * 0.25, y: 2450, amplitude: 95, speed: 0.018, phase: Math.PI * 0.5 },
      { baseX: VW * 0.70, y: 2570, amplitude: 85, speed: 0.025, phase: Math.PI * 1.5 },
      { baseX: VW * 0.40, y: 2700, amplitude: 90, speed: 0.020, phase: Math.PI * 0.7 },
      { baseX: VW * 0.65, y: 2820, amplitude: 80, speed: 0.030, phase: Math.PI * 1.2 },
    ];
    platformDefs.forEach(def => {
      const b = M.Bodies.rectangle(def.baseX, def.y, 150, 14, {
        isStatic: true, friction: 0.02, restitution: 0.4,
        render: { fillStyle: "#FF9A00", strokeStyle: "#ffcc44", lineWidth: 2 }
      });
      s.movingPlatforms.push({ body: b, ...def });
      bodies.push(b);
    });

    // ══════════════════════════════════════════════
    // [Zone 4] 탄성 범퍼 격자 (y 2950–3660)
    // ══════════════════════════════════════════════
    const bumperR = 18;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        bodies.push(M.Bodies.circle(38 + col * 68 + (row % 2) * 34, 3010 + row * 155, bumperR, {
          isStatic: true, restitution: 1.2,
          render: { fillStyle: "#FF2E63", strokeStyle: "#ff6688", lineWidth: 3 }
        }));
      }
    }
    for (let col = 0; col < 4; col++) {
      bodies.push(M.Bodies.circle(55 + col * 80, 3630, bumperR, {
        isStatic: true, restitution: 1.2,
        render: { fillStyle: "#FF2E63", strokeStyle: "#ff6688", lineWidth: 3 }
      }));
    }

    // ══════════════════════════════════════════════
    // [Zone 5] 진자 구간 (y 3800–4500)
    // 천장 고정점에서 매달린 진자 6개가 각자 다른 타이밍으로 좌우 휘두름
    // 진자에 맞으면 반대방향으로 튕겨나감
    // ══════════════════════════════════════════════
    const armLen = 110;
    const pendulumDefs = [
      { pivotX: VW * 0.15, pivotY: 3820, speed: 0.032, phase: 0,              maxAngle: 0.80 },
      { pivotX: VW * 0.42, pivotY: 3840, speed: 0.025, phase: Math.PI * 0.6,  maxAngle: 0.90 },
      { pivotX: VW * 0.72, pivotY: 3820, speed: 0.038, phase: Math.PI,        maxAngle: 0.75 },
      { pivotX: VW * 0.28, pivotY: 4060, speed: 0.028, phase: Math.PI * 1.3,  maxAngle: 0.85 },
      { pivotX: VW * 0.58, pivotY: 4040, speed: 0.035, phase: Math.PI * 0.4,  maxAngle: 0.80 },
      { pivotX: VW * 0.85, pivotY: 4060, speed: 0.022, phase: Math.PI * 1.7,  maxAngle: 0.70 },
      { pivotX: VW * 0.20, pivotY: 4290, speed: 0.030, phase: Math.PI * 0.9,  maxAngle: 0.85 },
      { pivotX: VW * 0.55, pivotY: 4280, speed: 0.042, phase: Math.PI * 0.2,  maxAngle: 0.75 },
      { pivotX: VW * 0.80, pivotY: 4300, speed: 0.026, phase: Math.PI * 1.5,  maxAngle: 0.90 },
    ];
    pendulumDefs.forEach(def => {
      // 진자 arm: 고정점 아래로 매달린 막대
      const initAngle = Math.sin(def.phase) * def.maxAngle;
      const cx = def.pivotX + Math.sin(initAngle) * armLen * 0.5;
      const cy = def.pivotY + Math.cos(initAngle) * armLen * 0.5;
      const arm = M.Bodies.rectangle(cx, cy, 10, armLen, {
        isStatic: true, friction: 0, restitution: 0.9,
        render: { fillStyle: "#39FF14", strokeStyle: "#39FF14aa", lineWidth: 2 }
      });
      M.Body.setAngle(arm, initAngle);
      // 고정점 표시 (작은 원)
      const pivot = M.Bodies.circle(def.pivotX, def.pivotY, 5, {
        isStatic: true, isSensor: false,
        render: { fillStyle: "#39FF1488", strokeStyle: "#39FF14", lineWidth: 1 }
      });
      s.pendulums.push({ body: arm, ...def, armLen });
      bodies.push(arm, pivot);
    });

    // ══════════════════════════════════════════════
    // [Zone 6] 최후의 질주 (y 4600–5200)
    // ══════════════════════════════════════════════
    const funnelColor = "#FFDE7D55";
    bodies.push(
      plank(VW * 0.14, 4680, 170, 0.40, funnelColor, 0.25),
      plank(VW * 0.86, 4680, 170, -0.40, funnelColor, 0.25),
    );
    bodies.push(
      plank(VW * 0.65, 4830, 180, -0.30, funnelColor, 0.2),
      plank(VW * 0.35, 4950, 180,  0.30, funnelColor, 0.2),
      plank(VW * 0.65, 5060, 180, -0.30, funnelColor, 0.2),
    );
    for (let i = 0; i < 4; i++) {
      bodies.push(M.Bodies.circle(42 + i * 88, 5110, 14, {
        isStatic: true, restitution: 0.9,
        render: { fillStyle: "#FFDE7D", strokeStyle: "#ffff00", lineWidth: 2 }
      }));
    }
    // 결승선 센서 (WH - 60)
    const sensor = M.Bodies.rectangle(VW / 2, WH - 60, VW, 20, {
      isStatic: true, isSensor: true, label: "finish",
      render: { fillStyle: "#FFDE7D55", strokeStyle: "#FFDE7D", lineWidth: 3 }
    });
    bodies.push(sensor);

    // ══════════════════════════════════════════════
    // 구슬 생성 — 동일 물리 속성
    // ══════════════════════════════════════════════
    const spread = VW * 0.75;
    const marbles = simNames.map((name, i) => {
      const baseX = VW / 2 - spread / 2 + (i / Math.max(count - 1, 1)) * spread;
      const x = baseX + (Math.random() - 0.5) * 15;
      const y = -R * 2 - i * 20;
      const b = M.Bodies.circle(x, y, R, {
        restitution: 0.35, friction: 0.02, frictionAir: 0.004,
        density: 0.002,
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
      // 스피너 회전
      s.spinners.forEach(sp => {
        M.Body.setAngle(sp.b1, sp.b1.angle + sp.speed);
        M.Body.setAngle(sp.b2, sp.b2.angle + sp.speed);
      });
      // 이동 플랫폼 — 좌우 왕복
      s.movingPlatforms.forEach(p => {
        const newX = p.baseX + Math.sin(s.tick * p.speed + p.phase) * p.amplitude;
        M.Body.setPosition(p.body, { x: newX, y: p.body.position.y });
      });
      // 진자 — 고정점 기준 사인파 회전
      s.pendulums.forEach(p => {
        const angle = Math.sin(s.tick * p.speed + p.phase) * p.maxAngle;
        const cx = p.pivotX + Math.sin(angle) * p.armLen * 0.5;
        const cy = p.pivotY + Math.cos(angle) * p.armLen * 0.5;
        M.Body.setPosition(p.body, { x: cx, y: cy });
        M.Body.setAngle(p.body, angle);
      });
    });

    // 이름 라벨 렌더
    M.Events.on(render, "afterRender", () => {
      const ctx = (render as any).context;
      ctx.save();
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      s.marbles.forEach(m => {
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
          onFirstFinish(found.name);
          if (s.timer) clearTimeout(s.timer);
          s.timer = setTimeout(() => { if (!s.done) revealResults(); }, 8000);
        }
        if (s.finishOrder.length === s.marbles.length) {
          s.done = true;
          if (s.timer) clearTimeout(s.timer);
          onComplete([...s.finishOrder]);
        }
      });
    });

    // 폴백 타이머
    s.timer = setTimeout(() => { if (!s.done) revealResults(); }, 40000);

    // 막힘 방지
    s.stuckTimer = setInterval(() => {
      if (s.done) return;
      s.marbles.forEach(m => {
        const b = m.body as any;
        const last = s.lastPos.get(b.id);
        if (last && Math.abs(b.position.x - last.x) + Math.abs(b.position.y - last.y) < 3) {
          M.Body.setVelocity(b, { x: (Math.random() - 0.5) * 2, y: Math.abs(b.velocity.y) + 1.5 });
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

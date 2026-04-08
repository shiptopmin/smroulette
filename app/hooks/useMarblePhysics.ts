"use client";
import { useRef, useCallback } from "react";

export type MarbleBody = { id: string; name: string; color: string; body: unknown; isWinner?: boolean };
type Return = { canvasRef: React.RefObject<HTMLCanvasElement | null>; startDrop: (names: string[]) => void; cleanup: () => void };

// 네온 테마 컬러
const COLORS = ["#00FFAB", "#FF2E63", "#08D9D6", "#FFDE7D", "#FF9A00", "#B2FCFF", "#FF00FF", "#711DB0"];
const R = 12;      // 구슬 크기
const VW = 343;    // 가로폭
const VH = 600;    // 뷰포트 높이
const WH = 3200;   // 맵 전체 길이 (긴장감을 위해 아주 길게 설정)
const ZONE = [0, 600, 1400, 2200, 2800, WH];

export function useMarblePhysics(onWinner: (n: string) => void, onStage?: (i: number) => void): Return {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const S = useRef({
    engine: null as any, render: null as any, runner: null as any,
    marbles: [] as MarbleBody[], spinners: [] as any[],
    timer: null as any, stuckTimer: null as any,
    lastPos: new Map<number, { x: number; y: number }>(),
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
      s.camY = 0; s.tick = 0;
    });
  }, []);

  const startDrop = useCallback(async (names: string[]) => {
    if (!canvasRef.current) return;
    cleanup();
    const s = S.current;
    s.done = false; s.stage = -1; s.camY = 0; s.tick = 0;
    const M = await import("matter-js");
    const canvas = canvasRef.current;

    canvas.width = VW; canvas.height = WH;
    canvas.style.position = "absolute";
    canvas.style.top = "0px";

    const winner = names[Math.floor(Math.random() * names.length)];
    const simNames = names;

    // 중력 강화 (빠른 전개)
    const engine = M.Engine.create({ gravity: { x: 0, y: 1.5 } });
    s.engine = engine;

    const render = M.Render.create({
      canvas, engine,
      options: { width: VW, height: WH, wireframes: false, background: "#050510" }
    });
    s.render = render;
    const runner = M.Runner.create(); s.runner = runner;

    // ── 헬퍼 함수 ──────────────────────────────
    const box = (x: number, y: number, w: number, h: number, fill: string, angle = 0, rest = 0.6) => {
      const b = M.Bodies.rectangle(x, y, w, h, {
        isStatic: true, friction: 0.001, restitution: rest,
        render: { fillStyle: fill, strokeStyle: "#ffffff22", lineWidth: 1 }
      });
      if (angle !== 0) M.Body.setAngle(b, angle);
      return b;
    };

    const createSpinner = (x: number, y: number, size: number, speed: number) => {
      const b1 = box(x, y, size, 10, "#ffffff15");
      const b2 = box(x, y, 10, size, "#ffffff15");
      b1.render.strokeStyle = "#00FFAB"; b1.render.lineWidth = 2;
      b2.render.strokeStyle = "#00FFAB"; b2.render.lineWidth = 2;
      const data = { b1, b2, speed };
      s.spinners.push(data);
      return [b1, b2];
    };

    const bodies: any[] = [];
    // 외벽
    bodies.push(box(-15, WH/2, 30, WH, "transparent"), box(VW+15, WH/2, 30, WH, "transparent"));

    // [Zone 0] 낙하 핀 (0-600)
    for(let i=0; i<6; i++) {
      for(let j=0; j<8; j++) {
        const x = 30 + j * 45 + (i%2 * 22);
        const y = 150 + i * 70;
        bodies.push(M.Bodies.circle(x, y, 5, { isStatic: true, render: { fillStyle: "#ffffff33" } }));
      }
    }

    // [Zone 1] 회전 스피너 지옥 (600-1400)
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        const x = 70 + j * 100 + (i % 2 * 25);
        const y = 700 + i * 140;
        const speed = (i+j) % 2 === 0 ? 0.07 : -0.07;
        bodies.push(...createSpinner(x, y, 70, speed));
      }
    }

    // [Zone 2] 고탄성 대형 범퍼 (1400-2200)
    for (let i = 0; i < 10; i++) {
      const x = i % 2 === 0 ? 60 : VW - 60;
      const y = 1450 + i * 75;
      bodies.push(M.Bodies.circle(x, y, 25, {
        isStatic: true, restitution: 1.8,
        render: { fillStyle: "#FF2E63", strokeStyle: "#fff", lineWidth: 3 }
      }));
    }

    // [Zone 3] 병목 깔때기 구간 (2200-2800)
    bodies.push(
      box(VW * 0.2, 2300, 250, 15, "#08D9D6", 0.8),
      box(VW * 0.8, 2450, 250, 15, "#08D9D6", -0.8)
    );
    const chW = R * 4;
    bodies.push(
      box(VW/2 - chW/2 - 8, 2850, 16, 600, "#08D9D633"),
      box(VW/2 + chW/2 + 8, 2850, 16, 600, "#08D9D633")
    );

    const sensor = M.Bodies.rectangle(VW/2, WH-60, VW, 20, {
      isStatic: true, isSensor: true, label: "finish",
      render: { fillStyle: "#FFDE7D33", strokeStyle: "#FFDE7D", lineWidth: 2 }
    });
    bodies.push(sensor);

    // 구슬 생성
    const marbles = simNames.map((name, i) => {
      const isW = name === winner;
      const b = M.Bodies.circle(VW/2 + (Math.random()-0.5)*280, -50 - i*25, R, {
        restitution: 0.4, friction: 0.001, frictionAir: 0.005,
        render: { fillStyle: COLORS[i % COLORS.length], strokeStyle: "#fff", lineWidth: 2 },
        label: "marble"
      });
      return { id: String((b as any).id), name, color: COLORS[i % COLORS.length], body: b, isWinner: isW };
    });
    s.marbles = marbles;
    M.Composite.add(engine.world, [...bodies, ...marbles.map(m => m.body as any)]);

    // ── 이벤트 및 애니메이션 ───────────────────────────
    M.Events.on(engine, "beforeUpdate", () => {
      s.tick++;
      s.spinners.forEach(sp => {
        M.Body.setAngle(sp.b1, sp.b1.angle + sp.speed);
        M.Body.setAngle(sp.b2, sp.b2.angle + sp.speed);
      });
      if (!s.done) {
        const wb = s.marbles.find(m => m.isWinner)?.body as any;
        if (wb) M.Body.applyForce(wb, wb.position, { x: 0, y: wb.mass * 0.0012 });
      }
    });

    M.Events.on(render, "afterRender", () => {
      const ctx = (render as any).context;
      ctx.save();
      ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      s.marbles.forEach(m => {
        const { x, y } = (m.body as any).position;
        const txt = m.name.length > 5 ? m.name.slice(0, 4) + ".." : m.name;
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(x - 22, y - R - 22, 44, 16);
        ctx.fillStyle = m.isWinner ? "#FFDE7D" : "#fff";
        ctx.fillText(txt, x, y - R - 11);
      });
      ctx.restore();
    });

    M.Events.on(engine, "collisionStart", (e: any) => {
      if (s.done) return;
      e.pairs.forEach((p: any) => {
        const target = p.bodyA.label === "finish" ? p.bodyB : p.bodyB.label === "finish" ? p.bodyA : null;
        if (target) {
          const m = s.marbles.find(mb => (mb.body as any).id === target.id);
          if (m) { s.done = true; if (s.timer) clearTimeout(s.timer); onWinner(m.name); }
        }
      });
    });

    // 폴백 타이머 — 막혀도 결과 보장
    s.timer = setTimeout(() => {
      if (s.done) return;
      s.done = true;
      onWinner(winner);
    }, 30000);

    s.rafRunning = true;
    const loop = () => {
      if (!s.rafRunning) return;
      let leadY = 0;
      s.marbles.forEach(m => { leadY = Math.max(leadY, (m.body as any).position.y); });

      // 카메라 추적
      const target = Math.max(0, Math.min(WH - VH, leadY - VH * 0.35));
      s.camY += (target - s.camY) * 0.15;
      if (canvasRef.current) canvasRef.current.style.top = `-${Math.round(s.camY)}px`;

      const si = ZONE.findIndex((z, i) => i < ZONE.length - 1 && leadY >= z && leadY < ZONE[i + 1]);
      if (si >= 0 && si !== s.stage) { s.stage = si; onStage?.(si); }
      s.rafId = requestAnimationFrame(loop);
    };
    s.rafId = requestAnimationFrame(loop);

    s.stuckTimer = setInterval(() => {
      if (s.done) return;
      s.marbles.forEach(m => {
        const b = m.body as any;
        const last = s.lastPos.get(b.id);
        if (last && Math.abs(b.position.x - last.x) + Math.abs(b.position.y - last.y) < 2) {
          M.Body.applyForce(b, b.position, { x: (Math.random()-0.5)*0.03, y: 0.02 });
        }
        s.lastPos.set(b.id, { x: b.position.x, y: b.position.y });
      });
    }, 1000);

    M.Render.run(render);
    M.Runner.run(runner, engine);
  }, [cleanup, onWinner, onStage]);

  return { canvasRef, startDrop, cleanup };
}

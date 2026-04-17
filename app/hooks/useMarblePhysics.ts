"use client";
import { useRef, useCallback } from "react";

export type MarbleBody = { id: string; name: string; color: string; body: unknown; isWinner?: boolean };
type Return = { canvasRef: React.RefObject<HTMLCanvasElement | null>; startDrop: (names: string[]) => void; cleanup: () => void };

const COLORS = ["#00FFAB", "#FF2E63", "#08D9D6", "#FFDE7D", "#FF9A00", "#B2FCFF", "#FF00FF", "#711DB0", "#39FF14", "#FF6EC7"];
const MAX = 10;    // 최대 구슬 수
const R = 11;      // 구슬 반지름
const VW = 343;
const VH = 600;
const WH = 5000;   // 맵 전체 길이 (늘어남)
const ZONE = [0, 900, 2000, 3200, 4200, WH];

function rnd<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

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

    // 최대 MAX개로 제한
    const winner = rnd(names);
    const simNames = shuffle(
      names.length > MAX
        ? [winner, ...shuffle(names.filter(n => n !== winner)).slice(0, MAX - 1)]
        : names
    );
    const count = simNames.length;

    // 중력 — 레이스가 12~20초 지속
    const engine = M.Engine.create({ gravity: { x: 0, y: 0.85 } });
    s.engine = engine;

    const render = M.Render.create({
      canvas, engine,
      options: { width: VW, height: WH, wireframes: false, background: "#050510" }
    });
    s.render = render;
    const runner = M.Runner.create(); s.runner = runner;

    const bodies: any[] = [];

    // 좌우 외벽
    const wall = (x: number, y: number, w: number, h: number) =>
      M.Bodies.rectangle(x, y, w, h, { isStatic: true, render: { fillStyle: "transparent", strokeStyle: "transparent", lineWidth: 0 } });
    bodies.push(wall(-15, WH / 2, 30, WH * 2), wall(VW + 15, WH / 2, 30, WH * 2));

    // 경사판 헬퍼
    const plank = (x: number, y: number, w: number, angle: number, color: string, rest = 0.3) => {
      const b = M.Bodies.rectangle(x, y, w, 12, {
        isStatic: true, friction: 0.05, restitution: rest,
        render: { fillStyle: color, strokeStyle: color, lineWidth: 2 }
      });
      M.Body.setAngle(b, angle);
      return b;
    };

    // 원형 핀 헬퍼
    const pin = (x: number, y: number, r: number, color: string) =>
      M.Bodies.circle(x, y, r, {
        isStatic: true, restitution: 0.5, friction: 0.01,
        render: { fillStyle: color, strokeStyle: "#ffffff44", lineWidth: 1 }
      });

    // ══════════════════════════════════════════════
    // [Zone 0] 갈튼 보드 (y 80–870) — 전체 폭 커버
    // 14행 × 8핀, 행마다 엇갈림
    // ══════════════════════════════════════════════
    const pinR = 7;
    const pinSpacingX = 40;
    const pinSpacingY = 56;
    for (let row = 0; row < 14; row++) {
      const cols = row % 2 === 0 ? 8 : 7;
      const startX = row % 2 === 0 ? 20 : 40;
      for (let col = 0; col < cols; col++) {
        const px = startX + col * pinSpacingX;
        const py = 80 + row * pinSpacingY;
        bodies.push(pin(px, py, pinR, "#4466ff88"));
      }
    }

    // ══════════════════════════════════════════════
    // [Zone 1] 지그재그 경사판 (y 920–1940)
    // 좌우 교대 9개, 각 판이 화면 70% 커버
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
    // Zone1 양옆 가이드 핀 — 벽 타고 직선 낙하 방지
    for (let row = 0; row < 5; row++) {
      const py = 1010 + row * 200;
      bodies.push(
        pin(10, py, 8, "#9966ff88"),
        pin(VW - 10, py, 8, "#9966ff88"),
      );
    }

    // ══════════════════════════════════════════════
    // [Zone 2] 스피너 지옥 (y 2020–3140)
    // 팔 길이 65px — 스피너 사이 충분한 틈 확보 (막힘 방지)
    // ══════════════════════════════════════════════
    const spinnerPositions = [
      [VW * 0.18, 2080], [VW * 0.50, 2080], [VW * 0.82, 2080],
      [VW * 0.34, 2300], [VW * 0.66, 2300],
      [VW * 0.18, 2520], [VW * 0.50, 2520], [VW * 0.82, 2520],
      [VW * 0.34, 2740], [VW * 0.66, 2740],
      [VW * 0.18, 2960], [VW * 0.50, 2960], [VW * 0.82, 2960],
      [VW * 0.34, 3080], [VW * 0.66, 3080],
    ];
    spinnerPositions.forEach(([x, y], idx) => {
      const speed = idx % 2 === 0 ? 0.05 : -0.05;
      const arm1 = M.Bodies.rectangle(x, y, 65, 9, {
        isStatic: true, friction: 0.01, restitution: 0.6,
        render: { fillStyle: "#08D9D6", strokeStyle: "#08D9D6", lineWidth: 2 }
      });
      const arm2 = M.Bodies.rectangle(x, y, 9, 65, {
        isStatic: true, friction: 0.01, restitution: 0.6,
        render: { fillStyle: "#08D9D6", strokeStyle: "#08D9D6", lineWidth: 2 }
      });
      s.spinners.push({ b1: arm1, b2: arm2, speed });
      bodies.push(arm1, arm2);
    });
    // Zone2 양옆 가이드 핀 — 스트레이트 낙하 방지
    for (let row = 0; row < 4; row++) {
      const py = 2180 + row * 220;
      bodies.push(
        pin(12, py, 8, "#08D9D688"),
        pin(VW - 12, py, 8, "#08D9D688"),
      );
    }

    // ══════════════════════════════════════════════
    // [Zone 3] 탄성 범퍼 격자 (y 3220–4160)
    // 5행 × 5열 격자 → 어디서 떨어져도 반드시 맞음
    // ══════════════════════════════════════════════
    const bumperR = 18;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const bx = 38 + col * 68 + (row % 2) * 34;
        const by = 3280 + row * 170;
        bodies.push(M.Bodies.circle(bx, by, bumperR, {
          isStatic: true, restitution: 1.2,
          render: { fillStyle: "#FF2E63", strokeStyle: "#ff6688", lineWidth: 3 }
        }));
      }
    }
    // 추가 보조 범퍼 행
    for (let col = 0; col < 4; col++) {
      const bx = 55 + col * 80;
      const by = 4080;
      bodies.push(M.Bodies.circle(bx, by, bumperR, {
        isStatic: true, restitution: 1.2,
        render: { fillStyle: "#FF2E63", strokeStyle: "#ff6688", lineWidth: 3 }
      }));
    }

    // ══════════════════════════════════════════════
    // [Zone 4] 깔때기 + 결승선 (y 4220–5000)
    // 좁은 통로 제거 — 깔때기만으로 자연스럽게 순서 결정
    // ══════════════════════════════════════════════
    const funnelColor = "#FFDE7D55";
    // 1차 넓은 깔때기
    bodies.push(
      plank(VW * 0.20, 4320, 260, 0.48, funnelColor, 0.2),
      plank(VW * 0.80, 4320, 260, -0.48, funnelColor, 0.2),
    );
    // 2차 완만한 깔때기
    bodies.push(
      plank(VW * 0.32, 4520, 160, 0.35, funnelColor, 0.2),
      plank(VW * 0.68, 4520, 160, -0.35, funnelColor, 0.2),
    );
    // 바닥 범퍼 (결승선 직전 흥미 유발)
    for (let i = 0; i < 3; i++) {
      bodies.push(M.Bodies.circle(VW * 0.25 + i * VW * 0.25, 4700, 14, {
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
    // 구슬 생성 — 화면 상단에서 분산 시작
    // ══════════════════════════════════════════════
    const spread = VW * 0.75;
    const marbles = simNames.map((name, i) => {
      const isW = name === winner;
      const baseX = VW / 2 - spread / 2 + (i / Math.max(count - 1, 1)) * spread;
      const x = baseX + (Math.random() - 0.5) * 15;
      const y = -R * 2 - i * 20;
      const b = M.Bodies.circle(x, y, R, {
        restitution: 0.35, friction: 0.02, frictionAir: 0.012,
        density: isW ? 0.0025 : 0.002,
        render: { fillStyle: COLORS[i % COLORS.length], strokeStyle: "#ffffff88", lineWidth: 2 },
        label: "marble"
      });
      return { id: String((b as any).id), name, color: COLORS[i % COLORS.length], body: b, isWinner: isW };
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
      // 위너 구슬에 살짝 힘 추가
      if (!s.done) {
        const wb = s.marbles.find(m => m.isWinner)?.body as any;
        if (wb) M.Body.applyForce(wb, wb.position, { x: 0, y: wb.mass * 0.002 });
      }
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
        ctx.fillStyle = m.isWinner ? "rgba(255,220,0,0.9)" : "rgba(0,0,0,0.75)";
        ctx.fillRect(x - tw / 2 - 3, y - R - 19, tw + 6, 14);
        ctx.fillStyle = m.isWinner ? "#000" : "#fff";
        ctx.fillText(txt, x, y - R - 8);
      });
      ctx.restore();
    });

    // 결승선 감지
    M.Events.on(engine, "collisionStart", (e: any) => {
      if (s.done) return;
      e.pairs.forEach((p: any) => {
        const mb = p.bodyA.label === "finish" ? p.bodyB : p.bodyB.label === "finish" ? p.bodyA : null;
        if (!mb) return;
        const found = s.marbles.find(m => (m.body as any).id === mb.id);
        if (found) { s.done = true; if (s.timer) clearTimeout(s.timer); onWinner(found.name); }
      });
    });

    // 폴백 타이머 (55초)
    s.timer = setTimeout(() => {
      if (s.done) return;
      s.done = true;
      onWinner(winner);
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
  }, [cleanup, onWinner, onStage]);

  return { canvasRef, startDrop, cleanup };
}

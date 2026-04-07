"use client";
import { useRef, useCallback } from "react";

export type MarbleBody = { id: string; name: string; color: string; body: unknown; isWinner?: boolean };
type Return = { canvasRef: React.RefObject<HTMLCanvasElement | null>; startDrop: (names: string[]) => void; cleanup: () => void };

const COLORS = [
  "#FF6B6B","#FF8E53","#FFC857","#4ECDC4","#45B7D1",
  "#96CEB4","#F0A8FF","#DDA0DD","#98D8C8","#F7DC6F",
];
const MAX = 10;
const R = 14;             // marble radius
const VW = 343, VH = 630; // visible canvas size
const WW = 343, WH = 1600; // full physics world height
const ZONE = [0, 280, 680, 1080, 1320, WH]; // 5 zone boundaries

function rnd<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function useMarblePhysics(
  onWinner: (n: string) => void,
  onStage?: (i: number) => void,
): Return {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const S = useRef({
    engine: null as unknown,
    render: null as unknown,
    runner: null as unknown,
    marbles: [] as MarbleBody[],
    paddles: [] as unknown[],
    timer: null as ReturnType<typeof setTimeout> | null,
    stuckTimer: null as ReturnType<typeof setInterval> | null,
    lastPos: new Map<number, { x: number; y: number }>(),
    done: false, stage: -1, camY: 0, tick: 0,
  });

  const cleanup = useCallback(() => {
    const s = S.current;
    if (s.timer) clearTimeout(s.timer);
    if (s.stuckTimer) clearInterval(s.stuckTimer);
    s.timer = null; s.stuckTimer = null;
    import("matter-js").then((M) => {
      if (s.render) (M.Render as any).stop(s.render as any);
      if (s.runner) (M.Runner as any).stop(s.runner as any);
      if (s.engine) (M.Engine as any).clear(s.engine as any);
      s.engine = s.render = s.runner = null;
      s.marbles = []; s.paddles = [];
      s.done = false; s.stage = -1; s.camY = 0; s.tick = 0;
      s.lastPos.clear();
    });
  }, []);

  const startDrop = useCallback(async (names: string[]) => {
    if (!canvasRef.current) return;
    cleanup();
    const s = S.current;
    s.done = false; s.stage = -1; s.camY = 0; s.tick = 0;

    const M = await import("matter-js");

    // Visible canvas — sized to 343×630
    const visCanvas = canvasRef.current;
    visCanvas.width = VW;
    visCanvas.height = VH;

    // Pick winner and build marble list (up to MAX=10)
    const winner = rnd(names);
    const simNames = shuffle(
      names.length > MAX
        ? [winner, ...shuffle(names.filter(n => n !== winner)).slice(0, MAX - 1)]
        : names,
    );
    const count = simNames.length;

    // ── Physics engine ───────────────────────────────────────────────
    const engine = M.Engine.create({ gravity: { x: 0, y: 1.0 } });
    s.engine = engine;

    // ── Renderer — directly to visible canvas with hasBounds camera ──
    // hasBounds=true: Matter.js applies render.bounds as the camera viewport
    // We update bounds every frame in beforeRender to follow the leading marble
    const render = M.Render.create({
      canvas: visCanvas,
      engine,
      options: {
        width: VW,
        height: VH,
        hasBounds: true,
        wireframes: false,
        background: "#060616", // solid dark — ensures clean frame clearing
      },
    });
    s.render = render;
    // Start camera at top of world (y=0 → y=630)
    (render as any).bounds = { min: { x: 0, y: 0 }, max: { x: VW, y: VH } };

    const runner = M.Runner.create();
    s.runner = runner;

    // ── Body helpers ─────────────────────────────────────────────────
    const ramp = (x: number, y: number, w: number, h: number, angle: number, fill: string) => {
      const b = M.Bodies.rectangle(x, y, w, h, {
        isStatic: true, friction: 0.02, restitution: 0.20,
        render: { fillStyle: fill, strokeStyle: fill.replace(/[\d.]+\)$/, "0.95)"), lineWidth: 2 },
      });
      M.Body.setAngle(b, angle);
      return b;
    };
    const wall = (x: number, y: number, w: number, h: number, fill = "rgba(180,220,255,0.28)") =>
      M.Bodies.rectangle(x, y, w, h, {
        isStatic: true, friction: 0.01, restitution: 0.15,
        render: { fillStyle: fill, strokeStyle: fill.replace(/[\d.]+\)$/, "0.7)"), lineWidth: 1.5 },
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodies: any[] = [];
    const invis = { render: { fillStyle: "transparent", strokeStyle: "transparent", lineWidth: 0 } };

    // ── World perimeter ──────────────────────────────────────────────
    bodies.push(
      M.Bodies.rectangle(-25,     WH / 2, 50,       WH * 2, { isStatic: true, ...invis }),
      M.Bodies.rectangle(WW + 25, WH / 2, 50,       WH * 2, { isStatic: true, ...invis }),
      M.Bodies.rectangle(WW / 2,  WH + 25, WW + 100, 50,   { isStatic: true, ...invis }),
    );

    // ── Zone 0: 낙하 구간 (y 0–280) ─────────────────────────────────
    // 3 staggered deflectors to start spreading marbles
    const blue = "rgba(80,160,255,0.55)";
    bodies.push(
      wall(18,       140, 12, 260, "rgba(80,140,255,0.32)"),  // left guide
      wall(WW - 18,  140, 12, 260, "rgba(80,140,255,0.32)"),  // right guide
      ramp(WW * 0.72, 90,  160, 14, -0.52, blue),
      ramp(WW * 0.28, 175, 160, 14,  0.52, blue),
      ramp(WW * 0.72, 256, 160, 14, -0.52, blue),
    );

    // ── Zone 1: 미로 구간 (y 280–680) ───────────────────────────────
    // 6 zigzag ramps
    const z1 = ZONE[1] + 15;
    const purple = "rgba(160,80,255,0.60)";
    bodies.push(
      ramp(WW * 0.68, z1 + 40,  195, 14, -0.55, purple),
      ramp(WW * 0.32, z1 + 115, 195, 14,  0.55, purple),
      ramp(WW * 0.68, z1 + 195, 195, 14, -0.55, purple),
      ramp(WW * 0.32, z1 + 275, 195, 14,  0.55, purple),
      ramp(WW * 0.68, z1 + 350, 195, 14, -0.55, purple),
      ramp(WW * 0.32, z1 + 380, 155, 14,  0.55, purple),
    );

    // ── Zone 2: 혼돈 구간 (y 680–1080) ──────────────────────────────
    // Angled ramps (NO diamond pegs — they trap marbles!) + 2 rotating paddles
    const z2 = ZONE[2] + 20;
    const orange = "rgba(255,140,40,0.65)";
    bodies.push(
      ramp(WW * 0.22, z2 + 55,  135, 14,  0.65, orange),
      ramp(WW * 0.78, z2 + 55,  135, 14, -0.65, orange),
      ramp(WW * 0.55, z2 + 150, 155, 14,  0.35, orange),
      ramp(WW * 0.22, z2 + 245, 135, 14,  0.65, orange),
      ramp(WW * 0.78, z2 + 245, 135, 14, -0.65, orange),
      ramp(WW * 0.45, z2 + 330, 155, 14, -0.35, orange),
    );

    const padY = z2 + 370;
    const pad1 = M.Bodies.rectangle(WW * 0.27, padY, WW * 0.40, 12, {
      isStatic: true, friction: 0.03, restitution: 0.45,
      render: { fillStyle: "rgba(255,60,60,0.70)", strokeStyle: "rgba(255,150,150,0.95)", lineWidth: 2.5 },
    });
    const pad2 = M.Bodies.rectangle(WW * 0.73, padY, WW * 0.40, 12, {
      isStatic: true, friction: 0.03, restitution: 0.45,
      render: { fillStyle: "rgba(40,160,255,0.70)", strokeStyle: "rgba(120,210,255,0.95)", lineWidth: 2.5 },
    });
    s.paddles = [pad1, pad2];
    bodies.push(pad1, pad2);

    // ── Zone 3: 깔때기 (y 1080–1320) ────────────────────────────────
    const z3 = ZONE[3] + 10;
    const fH = ZONE[4] - z3 - 20; // ~210px funnel height
    const teal = "rgba(40,220,170,0.50)";
    bodies.push(
      ramp(50,       z3 + fH * 0.44, 18, fH * 0.9,  0.36, teal),
      ramp(WW - 50,  z3 + fH * 0.44, 18, fH * 0.9, -0.36, teal),
    );
    const cw = R * 3.0; // chute width = 42px
    const fw = 14;
    const cTop = z3 + fH * 0.52;
    bodies.push(
      wall(WW / 2 - cw / 2 - fw / 2, (cTop + ZONE[4]) / 2, fw, ZONE[4] - cTop + 10, "rgba(40,220,170,0.35)"),
      wall(WW / 2 + cw / 2 + fw / 2, (cTop + ZONE[4]) / 2, fw, ZONE[4] - cTop + 10, "rgba(40,220,170,0.35)"),
    );

    // ── Zone 4: 결승선 (y 1320–1600) ────────────────────────────────
    const z4 = ZONE[4];
    const finY = WH - 55;
    const gold = "rgba(255,215,0,0.35)";
    bodies.push(
      wall(WW / 2 - cw / 2 - fw / 2, (z4 + finY) / 2, fw, finY - z4 + 12, gold),
      wall(WW / 2 + cw / 2 + fw / 2, (z4 + finY) / 2, fw, finY - z4 + 12, gold),
    );
    const sensor = M.Bodies.rectangle(WW / 2, finY, WW, 18, {
      isStatic: true, isSensor: true, label: "finish",
      render: { fillStyle: "rgba(255,215,0,0.55)", strokeStyle: "rgba(255,215,0,1)", lineWidth: 3 },
    });
    bodies.push(sensor);

    // ── Marbles — ALL start inside world (y > 0), visible from frame 1 ──
    // Small y stagger (21px) keeps them in zone 0 at start, camera sees all
    const marbles: MarbleBody[] = [];
    const spread = WW * 0.72;
    simNames.forEach((name, i) => {
      const isW = name === winner;
      const baseX = WW / 2 - spread / 2 + (i / Math.max(count - 1, 1)) * spread;
      const x = baseX + (Math.random() - 0.5) * 10;
      const y = R + 4 + i * Math.ceil(R * 1.5); // y=18..~220, all in zone 0
      const body = M.Bodies.circle(x, y, R, {
        restitution: 0.30, friction: 0.05,
        density: isW ? 0.0022 : 0.002,
        render: {
          fillStyle: COLORS[i % COLORS.length],
          strokeStyle: "rgba(255,255,255,0.65)",
          lineWidth: 2.5,
        },
        label: "marble",
      });
      marbles.push({ id: String((body as any).id), name, color: COLORS[i % COLORS.length], body, isWinner: isW });
    });
    s.marbles = marbles;
    M.Composite.add(engine.world, [...bodies, ...marbles.map(m => m.body as any)]);

    // ── Finish sensor ────────────────────────────────────────────────
    M.Events.on(engine, "collisionStart", (e: any) => {
      if (s.done) return;
      e.pairs.forEach((p: any) => {
        const { bodyA, bodyB } = p;
        if (bodyA.label !== "finish" && bodyB.label !== "finish") return;
        const mb = bodyA.label === "finish" ? bodyB : bodyA;
        const found = s.marbles.find(m => (m.body as any).id === mb.id);
        if (found) {
          s.done = true;
          if (s.timer) clearTimeout(s.timer);
          onWinner(found.name);
        }
      });
    });

    // ── beforeUpdate: paddle rotation + winner nudge ─────────────────
    M.Events.on(engine, "beforeUpdate", () => {
      s.tick++;
      if (s.paddles.length >= 2) {
        M.Body.setAngle(s.paddles[0] as any,  Math.sin(s.tick * 0.025) * 0.70);
        M.Body.setAngle(s.paddles[1] as any, -Math.sin(s.tick * 0.025 + 1.5) * 0.70);
      }
      if (!s.done) {
        const wb = s.marbles.find(m => m.isWinner)?.body as any;
        if (wb) M.Body.applyForce(wb, wb.position, { x: 0, y: wb.mass * engine.gravity.y * 0.06 });
      }
    });

    // ── beforeRender: update camera (bounds) ─────────────────────────
    // This runs inside Matter.js's own RAF — guarantees sync with rendering
    M.Events.on(render, "beforeRender", () => {
      // Find the marble furthest down (leading)
      let leadY = R; // minimum: top of world
      for (const m of s.marbles) {
        const py = (m.body as any)?.position?.y ?? R;
        if (py > leadY) leadY = py;
      }

      // Camera target: leading marble at 35% from top
      const target = Math.max(0, Math.min(WH - VH, leadY - VH * 0.35));
      s.camY += (target - s.camY) * 0.08;

      // Apply camera to render bounds
      const r = render as any;
      r.bounds.min.y = s.camY;
      r.bounds.max.y = s.camY + VH;

      // Stage tracking
      const si = ZONE.findIndex((z, i) => i < ZONE.length - 1 && leadY >= z && leadY < ZONE[i + 1]);
      if (si >= 0 && si !== s.stage) { s.stage = si; onStage?.(si); }
    });

    // ── afterRender: draw marble name labels ─────────────────────────
    // Runs after Matter.js draws bodies — labels appear on top
    M.Events.on(render, "afterRender", () => {
      const ctx = (render as any).context as CanvasRenderingContext2D;
      const camY = Math.round(s.camY);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space (ignore view transform)
      ctx.font = "bold 9px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      s.marbles.forEach(m => {
        const b = m.body as any;
        if (!b?.position) return;
        const sx = b.position.x;          // world x = screen x (no horizontal scroll)
        const sy = b.position.y - camY;   // convert world y → screen y
        if (sy < -(R + 22) || sy > VH + R) return; // skip off-screen

        const raw = m.name;
        const txt = raw.length > 5 ? raw.slice(0, 4) + "…" : raw;
        const tw = ctx.measureText(txt).width;
        const ph = 14, pw = Math.max(tw + 8, 26);
        const lx = sx - pw / 2;
        const ly = sy - R - ph - 2;

        // Pill background
        ctx.fillStyle = m.isWinner ? "rgba(255,215,0,0.95)" : "rgba(10,10,30,0.84)";
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === "function") {
          (ctx as any).roundRect(lx, ly, pw, ph, 5);
        } else {
          ctx.rect(lx, ly, pw, ph);
        }
        ctx.fill();

        // Label text
        ctx.fillStyle = m.isWinner ? "#1a1000" : "#ffffff";
        ctx.fillText(txt, sx, ly + ph / 2);
      });

      ctx.restore();
    });

    // ── Anti-stuck: check every 1.2s, apply force + velocity if stuck ─
    s.stuckTimer = setInterval(() => {
      if (s.done) return;
      s.marbles.forEach(m => {
        const b = m.body as any;
        const cur = b.position;
        const last = s.lastPos.get(b.id);
        if (last && Math.abs(cur.x - last.x) + Math.abs(cur.y - last.y) < 4) {
          M.Body.applyForce(b, cur, { x: (Math.random() - 0.5) * 0.008, y: 0.014 });
          M.Body.setVelocity(b, {
            x: b.velocity.x + (Math.random() - 0.5) * 2,
            y: b.velocity.y + 1.5,
          });
        }
        s.lastPos.set(b.id, { x: cur.x, y: cur.y });
      });
    }, 1200);

    // ── Fallback timer ───────────────────────────────────────────────
    s.timer = setTimeout(() => {
      if (s.done) return;
      s.done = true;
      onWinner(winner);
    }, Math.min(12000 + count * 600, 24000));

    // ── Start physics + rendering ────────────────────────────────────
    M.Render.run(render);
    M.Runner.run(runner, engine);
  }, [cleanup, onWinner, onStage]);

  return { canvasRef, startDrop, cleanup };
}

"use client";

import { useState, useCallback } from "react";
import { SetupScreen } from "./SetupScreen";
import { DrawingScreen } from "./DrawingScreen";
import { RankingScreen } from "./RankingScreen";

type Phase = "setup" | "drawing" | "complete";

export function RouletteApp() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [participants, setParticipants] = useState<string[]>([]);
  const [ranking, setRanking] = useState<string[]>([]);
  const [drawKey, setDrawKey] = useState(0); // forces remount of DrawingScreen each round

  // Participants not yet ranked
  const remaining = participants.filter((n) => !ranking.includes(n));
  const roundNumber = ranking.length + 1;

  const handleStart = useCallback((names: string[]) => {
    setParticipants(names);
    setRanking([]);
    setDrawKey((k) => k + 1);
    setPhase("drawing");
  }, []);

  const handleRoundComplete = useCallback((winner: string) => {
    setRanking((prev) => {
      const next = [...prev, winner];
      const newRemaining = participants.filter((n) => !next.includes(n));

      // If only 1 left, auto-add as last place → complete
      if (newRemaining.length === 1) {
        setTimeout(() => {
          setRanking([...next, newRemaining[0]]);
          setPhase("complete");
        }, 50);
        return next;
      }

      // All done
      if (newRemaining.length === 0) {
        setTimeout(() => setPhase("complete"), 50);
        return next;
      }

      // More rounds: trigger next draw
      setDrawKey((k) => k + 1);
      return next;
    });
  }, [participants]);

  const handleSkipToEnd = useCallback(() => {
    // Add all remaining in random order
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    setRanking((prev) => [...prev, ...shuffled]);
    setPhase("complete");
  }, [remaining]);

  const handleRestart = useCallback(() => {
    setParticipants([]);
    setRanking([]);
    setPhase("setup");
  }, []);

  const handleRedraw = useCallback(() => {
    setRanking([]);
    setDrawKey((k) => k + 1);
    setPhase("drawing");
  }, []);

  if (phase === "setup") {
    return <SetupScreen onStart={handleStart} />;
  }

  if (phase === "complete") {
    return (
      <RankingScreen
        ranking={ranking}
        onRestart={handleRestart}
        onRedraw={handleRedraw}
      />
    );
  }

  // drawing phase
  return (
    <DrawingScreen
      key={drawKey}
      roundNumber={roundNumber}
      totalParticipants={participants.length}
      remaining={remaining}
      ranking={ranking}
      onRoundComplete={handleRoundComplete}
      onSkipToEnd={handleSkipToEnd}
    />
  );
}

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
  const [drawKey, setDrawKey] = useState(0);

  const handleStart = useCallback((names: string[]) => {
    setParticipants(names);
    setRanking([]);
    setDrawKey((k) => k + 1);
    setPhase("drawing");
  }, []);

  const handleComplete = useCallback((rankings: string[]) => {
    setRanking(rankings);
    setPhase("complete");
  }, []);

  const handleSkipToEnd = useCallback(() => {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    setRanking(shuffled);
    setPhase("complete");
  }, [participants]);

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
    return <RankingScreen ranking={ranking} onRestart={handleRestart} onRedraw={handleRedraw} />;
  }

  return (
    <DrawingScreen
      key={drawKey}
      names={participants}
      onComplete={handleComplete}
      onSkipToEnd={handleSkipToEnd}
    />
  );
}

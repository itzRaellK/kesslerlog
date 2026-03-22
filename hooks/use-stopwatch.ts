"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cronômetro que usa relógio do sistema (Date.now), não apenas setInterval.
 * Assim o tempo continua correto com a aba em segundo plano ou o timer do
 * navegador limitado — o mesmo padrão de relógios e apps de produtividade.
 */
export function useStopwatch() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const accumulatedSecRef = useRef(0);
  const segmentStartMsRef = useRef<number | null>(null);

  const computeElapsed = useCallback(() => {
    if (segmentStartMsRef.current == null) return accumulatedSecRef.current;
    return (
      accumulatedSecRef.current +
      Math.floor((Date.now() - segmentStartMsRef.current) / 1000)
    );
  }, []);

  const getElapsedSeconds = useCallback(() => {
    return computeElapsed();
  }, [computeElapsed]);

  useEffect(() => {
    if (!isRunning) return;

    segmentStartMsRef.current = Date.now();

    const tick = () => setElapsed(computeElapsed());

    tick();
    const interval = setInterval(tick, 1000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      if (segmentStartMsRef.current != null) {
        accumulatedSecRef.current += Math.floor(
          (Date.now() - segmentStartMsRef.current) / 1000,
        );
        segmentStartMsRef.current = null;
        setElapsed(accumulatedSecRef.current);
      }
    };
  }, [isRunning, computeElapsed]);

  const reset = useCallback(() => {
    segmentStartMsRef.current = null;
    accumulatedSecRef.current = 0;
    setIsRunning(false);
    setElapsed(0);
  }, []);

  return {
    isRunning,
    setIsRunning,
    elapsed,
    reset,
    getElapsedSeconds,
  };
}

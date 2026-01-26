import {useState, useEffect, useCallback, useRef} from 'react';
import {getCountdownParts, CountdownParts} from '../utils/formatters';

// Debug mode - set to true to enable timer testing
// In production this should be false
const DEBUG_MODE = __DEV__;

// Debug override values per prize (prizeId -> seconds)
const debugOverrideByPrize: Map<string, number> = new Map();

// Legacy global debug override
let debugOverrideSeconds: number | null = null;

export const setDebugCountdown = (seconds: number | null) => {
  debugOverrideSeconds = seconds;
};

export const resetDebugCountdown = () => {
  debugOverrideSeconds = null;
};

// Debug per premio specifico
export const setDebugCountdownForPrize = (prizeId: string, seconds: number) => {
  debugOverrideByPrize.set(prizeId, seconds);
};

export const resetDebugCountdownForPrize = (prizeId: string) => {
  debugOverrideByPrize.delete(prizeId);
};

// Hook per countdown di un premio specifico
export const usePrizeCountdown = (prizeId: string | undefined, scheduledAt: string | undefined) => {
  const [countdown, setCountdown] = useState<CountdownParts>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const updateCountdown = useCallback(() => {
    const debugSeconds = prizeId ? debugOverrideByPrize.get(prizeId) : undefined;

    if (!scheduledAt && debugSeconds === undefined) {
      setIsExpired(false); // Non scaduto, semplicemente non ha timer
      setTotalSeconds(0);
      setCountdown({days: 0, hours: 0, minutes: 0, seconds: 0});
      return;
    }

    let parts: CountdownParts;
    let total: number;

    // Debug mode: use override if set for this prize
    if (DEBUG_MODE && debugSeconds !== undefined) {
      total = debugSeconds;
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      parts = {days, hours, minutes, seconds};

      // Decrement debug seconds
      if (debugSeconds > 0 && prizeId) {
        debugOverrideByPrize.set(prizeId, debugSeconds - 1);
      }
    } else if (scheduledAt) {
      parts = getCountdownParts(scheduledAt);
      total = parts.days * 86400 + parts.hours * 3600 + parts.minutes * 60 + parts.seconds;
    } else {
      parts = {days: 0, hours: 0, minutes: 0, seconds: 0};
      total = 0;
    }

    setCountdown(parts);
    setTotalSeconds(total);

    const isAllZero =
      parts.days === 0 &&
      parts.hours === 0 &&
      parts.minutes === 0 &&
      parts.seconds === 0;

    // È scaduto solo se aveva un timer attivo
    setIsExpired(isAllZero && (!!scheduledAt || debugSeconds !== undefined));
  }, [prizeId, scheduledAt]);

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  // Check if we're in the last minute
  const isLastMinute = totalSeconds > 0 && totalSeconds <= 60;

  return {countdown, isExpired, totalSeconds, isLastMinute};
};

// Hook legacy per compatibilità
export const useCountdown = (targetDate: string | undefined) => {
  const [countdown, setCountdown] = useState<CountdownParts>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const updateCountdown = useCallback(() => {
    if (!targetDate && debugOverrideSeconds === null) {
      setIsExpired(true);
      setTotalSeconds(0);
      return;
    }

    let parts: CountdownParts;
    let total: number;

    // Debug mode: use override if set
    if (DEBUG_MODE && debugOverrideSeconds !== null) {
      total = debugOverrideSeconds;
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      parts = {days, hours, minutes, seconds};

      // Decrement debug seconds
      if (debugOverrideSeconds > 0) {
        debugOverrideSeconds--;
      }
    } else {
      parts = getCountdownParts(targetDate!);
      total = parts.days * 86400 + parts.hours * 3600 + parts.minutes * 60 + parts.seconds;
    }

    setCountdown(parts);
    setTotalSeconds(total);

    const isAllZero =
      parts.days === 0 &&
      parts.hours === 0 &&
      parts.minutes === 0 &&
      parts.seconds === 0;

    setIsExpired(isAllZero);
  }, [targetDate]);

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  // Check if we're in the last minute
  const isLastMinute = totalSeconds > 0 && totalSeconds <= 60;

  return {countdown, isExpired, totalSeconds, isLastMinute};
};

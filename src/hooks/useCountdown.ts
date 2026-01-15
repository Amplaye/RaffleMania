import {useState, useEffect, useCallback} from 'react';
import {getCountdownParts, CountdownParts} from '../utils/formatters';

export const useCountdown = (targetDate: string | undefined) => {
  const [countdown, setCountdown] = useState<CountdownParts>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  const updateCountdown = useCallback(() => {
    if (!targetDate) {
      setIsExpired(true);
      return;
    }

    const parts = getCountdownParts(targetDate);
    setCountdown(parts);

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

  return {countdown, isExpired};
};

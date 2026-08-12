import { useEffect, useState } from 'react';

/**
 * Returns the current time and re-renders the component periodically so that
 * time-derived values (e.g. animal ages) stay up to date while the screen is open.
 */
export function useNow(intervalMs: number = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

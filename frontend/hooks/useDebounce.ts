import { useState, useEffect } from 'react';

/**
 * Hook برای debounce کردن مقدار
 * @param value - مقدار برای debounce
 * @param delay - تاخیر به میلی‌ثانیه
 * @returns مقدار debounced
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

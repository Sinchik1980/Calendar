import { useState, useEffect } from 'react';
import type { Holiday } from '../types';
import { fetchHolidays } from '../api/holidays';

export const useHolidays = (year: number, countryCode: string = 'UA') => {
  const [holidays, setHolidays] = useState<Map<string, Holiday[]>>(new Map());

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchHolidays(year, countryCode);
        const map = new Map<string, Holiday[]>();
        data.forEach((h) => {
          const existing = map.get(h.date) || [];
          existing.push(h);
          map.set(h.date, existing);
        });
        setHolidays(map);
      } catch (err) {
        console.error('Failed to load holidays', err);
      }
    };
    load();
  }, [year, countryCode]);

  return holidays;
};

import { useMemo } from 'react';

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const useCalendar = (year: number, month: number) => {
  const days = useMemo(() => {
    const result: CalendarDay[] = [];
    const today = new Date();
    const todayStr = formatDate(today);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-based week: 0=Mon, 6=Sun
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    // Fill previous month days
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      result.push({
        date: formatDate(d),
        dayOfMonth: d.getDate(),
        isCurrentMonth: false,
        isToday: formatDate(d) === todayStr,
      });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      result.push({
        date: formatDate(d),
        dayOfMonth: day,
        isCurrentMonth: true,
        isToday: formatDate(d) === todayStr,
      });
    }

    // Fill next month days to complete grid (6 rows)
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      result.push({
        date: formatDate(d),
        dayOfMonth: i,
        isCurrentMonth: false,
        isToday: formatDate(d) === todayStr,
      });
    }

    return result;
  }, [year, month]);

  const startDate = days[0].date;
  const endDate = days[days.length - 1].date;

  return { days, startDate, endDate };
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

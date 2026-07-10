import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode, useRef } from 'react';
import {
  fetchDailyPower,
  fetchWeeklyPower,
  fetchMonthlyPower,
  ddmmyyyyToISO,
  mmyyyyToYYYYMM,
  DailyPowerEntry,
  WeeklyPowerEntry,
  MonthlyPowerEntry,
} from '../api/miraie';
import { startOfMonth, endOfMonth, startOfWeek, subDays, subWeeks, subMonths, format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PowerDataPoint {
  label: string;
  value: number;
}

interface PowerContextValue {
  /** Map of YYYY-MM-DD → kWh */
  dailyMap: Record<string, number>;
  /** Map of YYYY-MM-DD (week start) → kWh */
  weeklyMap: Record<string, number>;
  /** Map of YYYY-MM → kWh */
  monthlyMap: Record<string, number>;

  /** Get power for a specific date (YYYY-MM-DD), returns 0 if absent */
  getPowerForDate: (dateStr: string) => number;
  /** Get power for a specific month (YYYY-MM), returns 0 if absent */
  getPowerForMonth: (monthStr: string) => number;

  /** Today's power */
  todayPower: number;
  /** This week's power (sum of daily for current week) */
  thisWeekPower: number;
  /** This month's power */
  thisMonthPower: number;

  /** Past 7 days data for chart */
  last7Days: PowerDataPoint[];
  /** Past 7 weeks data for chart */
  last7Weeks: PowerDataPoint[];
  /** Past 7 months data for chart */
  last7Months: PowerDataPoint[];

  /** Fetch daily data for a specific month (called when calendar month changes) */
  fetchMonthDailyData: (year: number, month: number) => void;

  loading: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const PowerContext = createContext<PowerContextValue | null>(null);

export function PowerProvider({ children }: { children: ReactNode }) {
  const [dailyMap, setDailyMap] = useState<Record<string, number>>({});
  const [weeklyMap, setWeeklyMap] = useState<Record<string, number>>({});
  const [monthlyMap, setMonthlyMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const fetchedMonths = useRef<Set<string>>(new Set());

  // ─── Fetch daily data for a specific month ─────────────────────────────────
  const fetchMonthDailyData = useCallback(async (year: number, month: number) => {
    const key = `${year}-${month}`;
    if (fetchedMonths.current.has(key)) return;
    fetchedMonths.current.add(key);

    try {
      const start = new Date(year, month - 1, 1);
      const end = endOfMonth(start);
      const entries = await fetchDailyPower(start, end);
      const newEntries: Record<string, number> = {};
      entries.forEach((e: DailyPowerEntry) => {
        const isoDate = ddmmyyyyToISO(e.day);
        newEntries[isoDate] = e.power;
      });
      setDailyMap((prev) => ({ ...prev, ...newEntries }));
    } catch (err) {
      console.error('Failed to fetch daily power for', key, err);
    }
  }, []);

  // ─── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const now = new Date();

      // Fetch monthly data (past 6 months — API limit)
      try {
        const monthStart = subMonths(now, 6);
        const monthlyEntries = await fetchMonthlyPower(monthStart, now);
        console.log('[Power] Monthly data:', monthlyEntries.length, 'entries');
        const mMap: Record<string, number> = {};
        monthlyEntries.forEach((e: MonthlyPowerEntry) => {
          const ym = mmyyyyToYYYYMM(e.month);
          mMap[ym] = e.power;
        });
        setMonthlyMap(mMap);
      } catch (err) {
        console.error('[Power] Monthly fetch failed:', err);
      }

      // Fetch weekly data (past ~10 weeks — API requires Sunday-aligned dates)
      try {
        const rawWeekStart = subWeeks(now, 9);
        const weekStartSunday = startOfWeek(rawWeekStart, { weekStartsOn: 0 });
        const weekEndSunday = startOfWeek(now, { weekStartsOn: 0 });
        const weeklyEntries = await fetchWeeklyPower(weekStartSunday, weekEndSunday);
        console.log('[Power] Weekly data:', weeklyEntries.length, 'entries');
        const wMap: Record<string, number> = {};
        weeklyEntries.forEach((e: WeeklyPowerEntry) => {
          const isoDate = ddmmyyyyToISO(e.week);
          wMap[isoDate] = e.power;
        });
        setWeeklyMap(wMap);
      } catch (err) {
        console.error('[Power] Weekly fetch failed:', err);
      }

      // Fetch daily data for current + previous month
      try {
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const dailyEntries = await fetchDailyPower(currentMonthStart, currentMonthEnd);
        console.log('[Power] Daily (current month):', dailyEntries.length, 'entries');
        const dMap: Record<string, number> = {};
        dailyEntries.forEach((e: DailyPowerEntry) => {
          const isoDate = ddmmyyyyToISO(e.day);
          dMap[isoDate] = e.power;
        });

        // Also fetch last month for "past 7 days" at month boundaries
        try {
          const prevMonthStart = startOfMonth(subMonths(now, 1));
          const prevMonthEnd = endOfMonth(prevMonthStart);
          const prevDailyEntries = await fetchDailyPower(prevMonthStart, prevMonthEnd);
          console.log('[Power] Daily (prev month):', prevDailyEntries.length, 'entries');
          prevDailyEntries.forEach((e: DailyPowerEntry) => {
            const isoDate = ddmmyyyyToISO(e.day);
            dMap[isoDate] = e.power;
          });
        } catch (err) {
          console.error('[Power] Previous month daily fetch failed:', err);
        }

        setDailyMap(dMap);
        fetchedMonths.current.add(`${now.getFullYear()}-${now.getMonth() + 1}`);
        const prevMonth = subMonths(now, 1);
        fetchedMonths.current.add(`${prevMonth.getFullYear()}-${prevMonth.getMonth() + 1}`);
      } catch (err) {
        console.error('[Power] Daily fetch failed:', err);
      }

      setLoading(false);
    };

    loadAll();
  }, []);

  // ─── Derived values ────────────────────────────────────────────────────────

  const getPowerForDate = useCallback(
    (dateStr: string) => dailyMap[dateStr] ?? 0,
    [dailyMap]
  );

  const getPowerForMonth = useCallback(
    (monthStr: string) => monthlyMap[monthStr] ?? 0,
    [monthlyMap]
  );

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const todayPower = dailyMap[todayStr] ?? 0;

  const thisMonthStr = format(now, 'yyyy-MM');
  const thisMonthPower = monthlyMap[thisMonthStr] ?? 0;

  // This week's power: sum daily values from Monday to today
  const getThisWeekPower = (): number => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    let sum = 0;
    for (let i = mondayOffset; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      sum += dailyMap[key] ?? 0;
    }
    return sum;
  };
  const thisWeekPower = getThisWeekPower();

  // Past 7 days chart data
  const last7Days: PowerDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const key = format(d, 'yyyy-MM-dd');
    last7Days.push({
      label: format(d, 'EEE'),
      value: dailyMap[key] ?? 0,
    });
  }

  // Past 7 weeks chart data
  const weekKeys = Object.keys(weeklyMap).sort();
  const recentWeeks = weekKeys.slice(-7);
  const last7Weeks: PowerDataPoint[] = recentWeeks.map((key) => {
    const parts = key.split('-');
    return {
      label: `${parts[2]}/${parts[1]}`,
      value: weeklyMap[key],
    };
  });

  // Past 7 months chart data
  const monthKeys = Object.keys(monthlyMap).sort();
  const recentMonths = monthKeys.slice(-7);
  const last7Months: PowerDataPoint[] = recentMonths.map((key) => {
    const [year, month] = key.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      label: monthNames[parseInt(month, 10) - 1],
      value: monthlyMap[key],
    };
  });

  return (
    <PowerContext.Provider
      value={{
        dailyMap,
        weeklyMap,
        monthlyMap,
        getPowerForDate,
        getPowerForMonth,
        todayPower,
        thisWeekPower,
        thisMonthPower,
        last7Days,
        last7Weeks,
        last7Months,
        fetchMonthDailyData,
        loading,
      }}
    >
      {children}
    </PowerContext.Provider>
  );
}

export function usePower() {
  const ctx = useContext(PowerContext);
  if (!ctx) throw new Error('usePower must be used inside PowerProvider');
  return ctx;
}

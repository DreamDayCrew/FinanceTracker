import { lastDayOfMonth, isWeekend, subDays, getDay } from "date-fns";

export function getLastWorkingDayOfMonth(year: number, month: number): Date {
  const lastDay = lastDayOfMonth(new Date(year, month - 1));
  let workingDay = lastDay;
  while (isWeekend(workingDay)) {
    workingDay = subDays(workingDay, 1);
  }
  return workingDay;
}

export function getPaydayForMonth(
  year: number,
  month: number,
  rule: string,
  fixedDay?: number | null,
  weekdayPreference?: number | null
): Date {
  switch (rule) {
    case "fixed_day":
      if (fixedDay) {
        const lastDay = lastDayOfMonth(new Date(year, month - 1)).getDate();
        const day = Math.min(fixedDay, lastDay);
        let payday = new Date(year, month - 1, day);
        while (isWeekend(payday)) {
          payday = subDays(payday, 1);
        }
        return payday;
      }
      return getLastWorkingDayOfMonth(year, month);

    case "nth_weekday":
      return getLastWorkingDayOfMonth(year, month);

    case "last_working_day":
    default:
      return getLastWorkingDayOfMonth(year, month);
  }
}

export function shouldPaymentOccurThisMonth(
  frequency: string,
  startMonth: number | null,
  currentMonth: number
): boolean {
  switch (frequency) {
    case "monthly":
      return true;
    case "quarterly":
      if (!startMonth) return currentMonth % 3 === 1;
      const quarterMonths = [startMonth, (startMonth + 2) % 12 + 1, (startMonth + 5) % 12 + 1];
      return quarterMonths.includes(currentMonth);
    case "half_yearly":
      if (!startMonth) return currentMonth === 1 || currentMonth === 7;
      return currentMonth === startMonth || currentMonth === ((startMonth + 5) % 12) + 1;
    case "yearly":
      if (!startMonth) return currentMonth === 1;
      return currentMonth === startMonth;
    case "one_time":
      return true;
    default:
      return true;
  }
}

export function getNextPaydays(
  rule: string,
  fixedDay: number | null,
  weekdayPreference: number | null,
  count: number = 6
): { month: number; year: number; date: Date }[] {
  const now = new Date();
  const results: { month: number; year: number; date: Date }[] = [];
  
  let currentMonth = now.getMonth() + 1;
  let currentYear = now.getFullYear();
  
  for (let i = 0; i < count; i++) {
    const payday = getPaydayForMonth(currentYear, currentMonth, rule, fixedDay, weekdayPreference);
    results.push({
      month: currentMonth,
      year: currentYear,
      date: payday,
    });
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
  
  return results;
}

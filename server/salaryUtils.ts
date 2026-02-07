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

export function getPastPaydays(
  rule: string,
  fixedDay: number | null,
  weekdayPreference: number | null,
  count: number = 3
): { month: number; year: number; date: Date }[] {
  const now = new Date();
  const results: { month: number; year: number; date: Date }[] = [];
  
  let currentMonth = now.getMonth(); // Start from last month (0-indexed)
  let currentYear = now.getFullYear();
  
  // Go back to previous month
  if (currentMonth === 0) {
    currentMonth = 12;
    currentYear--;
  }
  
  for (let i = 0; i < count; i++) {
    const payday = getPaydayForMonth(currentYear, currentMonth, rule, fixedDay, weekdayPreference);
    results.push({
      month: currentMonth,
      year: currentYear,
      date: payday,
    });
    currentMonth--;
    if (currentMonth === 0) {
      currentMonth = 12;
      currentYear--;
    }
  }
  
  return results;
}

/**
 * Calculate current month cycle dates based on salary profile settings
 * Returns { cycleStart, cycleEnd, cycleLabel }
 */
export function getCurrentCycleDates(
  salaryProfile: any,
  lastSalaryCycle: any | null,
  now: Date = new Date()
): { cycleStart: Date; cycleEnd: Date; cycleLabel: string } {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Default to calendar month if no salary profile or using fixed day
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const defaultLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  
  if (!salaryProfile || !salaryProfile.isActive) {
    return { cycleStart: defaultStart, cycleEnd: defaultEnd, cycleLabel: defaultLabel };
  }
  
  const monthCycleStartRule = salaryProfile.monthCycleStartRule || 'salary_day';
  
  if (monthCycleStartRule === 'fixed_day' && salaryProfile.monthCycleStartDay) {
    // Use fixed day for cycle calculation
    const fixedDay = salaryProfile.monthCycleStartDay;
    const currentDay = now.getDate();
    
    let cycleStart: Date;
    let cycleEnd: Date;
    
    if (currentDay >= fixedDay) {
      // Current cycle: fixedDay of this month to (fixedDay-1) of next month
      cycleStart = new Date(now.getFullYear(), now.getMonth(), fixedDay, 0, 0, 0);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, fixedDay);
      cycleEnd = new Date(nextMonth.getTime() - 1000); // One second before next cycle starts
    } else {
      // Current cycle: fixedDay of last month to (fixedDay-1) of this month
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, fixedDay, 0, 0, 0);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), fixedDay);
      cycleEnd = new Date(thisMonth.getTime() - 1000);
    }
    
    const startMonthName = monthNames[cycleStart.getMonth()];
    const endMonthName = monthNames[cycleEnd.getMonth()];
    const cycleLabel = cycleStart.getMonth() === cycleEnd.getMonth() 
      ? `${startMonthName} ${cycleStart.getFullYear()}`
      : `${startMonthName} ${cycleStart.getDate()} - ${endMonthName} ${cycleEnd.getDate()}`;
    
    return { cycleStart, cycleEnd, cycleLabel };
  }
  
  // Use salary day - need to find last and next salary dates
  if (monthCycleStartRule === 'salary_day') {
    // If we have actual salary cycle data, use that
    if (lastSalaryCycle && lastSalaryCycle.actualPayDate) {
      const lastPayDate = new Date(lastSalaryCycle.actualPayDate);
      
      // Calculate next expected pay date
      const nextPayDate = getPaydayForMonth(
        now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(),
        now.getMonth() === 11 ? 1 : now.getMonth() + 2, // next month (getMonth is 0-indexed)
        salaryProfile.paydayRule || 'last_working_day',
        salaryProfile.fixedDay,
        salaryProfile.weekdayPreference
      );
      
      // Check if we're still in the cycle of lastPayDate or already in the next one
      if (now >= lastPayDate && now < nextPayDate) {
        // We're in the cycle starting from lastPayDate
        const cycleStart = new Date(lastPayDate);
        cycleStart.setHours(0, 0, 0, 0);
        const cycleEnd = new Date(nextPayDate.getTime() - 1000); // One second before next salary
        
        const startMonthName = monthNames[cycleStart.getMonth()];
        const endMonthName = monthNames[cycleEnd.getMonth()];
        const cycleLabel = cycleStart.getMonth() === cycleEnd.getMonth()
          ? `${startMonthName} ${cycleStart.getFullYear()}`
          : `${startMonthName} ${cycleStart.getDate()} - ${endMonthName} ${cycleEnd.getDate()}`;
        
        return { cycleStart, cycleEnd, cycleLabel };
      }
      
      // Otherwise we might be in a cycle we haven't recorded yet
      // Calculate previous expected pay date
      const prevPayDate = getPaydayForMonth(
        lastPayDate.getMonth() === 0 ? lastPayDate.getFullYear() - 1 : lastPayDate.getFullYear(),
        lastPayDate.getMonth() === 0 ? 12 : lastPayDate.getMonth(),
        salaryProfile.paydayRule || 'last_working_day',
        salaryProfile.fixedDay,
        salaryProfile.weekdayPreference
      );
      
      if (now >= prevPayDate && now < lastPayDate) {
        const cycleStart = new Date(prevPayDate);
        cycleStart.setHours(0, 0, 0, 0);
        const cycleEnd = new Date(lastPayDate.getTime() - 1000);
        
        const startMonthName = monthNames[cycleStart.getMonth()];
        const endMonthName = monthNames[cycleEnd.getMonth()];
        const cycleLabel = cycleStart.getMonth() === cycleEnd.getMonth()
          ? `${startMonthName} ${cycleStart.getFullYear()}`
          : `${startMonthName} ${cycleStart.getDate()} - ${endMonthName} ${cycleEnd.getDate()}`;
        
        return { cycleStart, cycleEnd, cycleLabel };
      }
    }
    
    // Fallback: calculate based on current and previous expected pay dates
    const currentMonthPayday = getPaydayForMonth(
      now.getFullYear(),
      now.getMonth() + 1,
      salaryProfile.paydayRule || 'last_working_day',
      salaryProfile.fixedDay,
      salaryProfile.weekdayPreference
    );
    
    const prevMonthPayday = getPaydayForMonth(
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      now.getMonth() === 0 ? 12 : now.getMonth(),
      salaryProfile.paydayRule || 'last_working_day',
      salaryProfile.fixedDay,
      salaryProfile.weekdayPreference
    );
    
    const nextMonthPayday = getPaydayForMonth(
      now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(),
      now.getMonth() === 11 ? 1 : now.getMonth() + 2,
      salaryProfile.paydayRule || 'last_working_day',
      salaryProfile.fixedDay,
      salaryProfile.weekdayPreference
    );
    
    let cycleStart: Date;
    let cycleEnd: Date;
    
    if (now >= currentMonthPayday) {
      // We're after the current month's payday, cycle is currentMonth to nextMonth
      cycleStart = new Date(currentMonthPayday);
      cycleStart.setHours(0, 0, 0, 0);
      cycleEnd = new Date(nextMonthPayday.getTime() - 1000);
    } else {
      // We're before the current month's payday, cycle is prevMonth to currentMonth
      cycleStart = new Date(prevMonthPayday);
      cycleStart.setHours(0, 0, 0, 0);
      cycleEnd = new Date(currentMonthPayday.getTime() - 1000);
    }
    
    const startMonthName = monthNames[cycleStart.getMonth()];
    const endMonthName = monthNames[cycleEnd.getMonth()];
    const cycleLabel = cycleStart.getMonth() === cycleEnd.getMonth()
      ? `${startMonthName} ${cycleStart.getFullYear()}`
      : `${startMonthName} ${cycleStart.getDate()} - ${endMonthName} ${cycleEnd.getDate()}`;
    
    return { cycleStart, cycleEnd, cycleLabel };
  }
  
  // Default to calendar month
  return { cycleStart: defaultStart, cycleEnd: defaultEnd, cycleLabel: defaultLabel };
}

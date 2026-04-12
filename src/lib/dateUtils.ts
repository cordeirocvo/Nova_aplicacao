import { parse, parseISO, isValid, differenceInDays, startOfDay } from "date-fns";

export function parseUnknownDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  
  // Format YYYY-MM-DD
  if (dateStr.includes('-')) {
     const parsed = parseISO(dateStr);
     if (isValid(parsed)) return parsed;
  }
  // Format DD/MM/YYYY or similar
  if (dateStr.includes('/')) {
     const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
     if (isValid(parsed)) return parsed;
  }
  return null;
}

export function calcDaysLate(targetStr: string | null | undefined): number | null {
  const targetDate = parseUnknownDate(targetStr);
  if (!targetDate) return null;
  
  // Prev Instala - Hoje() = Difference
  // Ex: Prev 10/04, Hoje 12/04 -> 10 - 12 = -2
  return differenceInDays(startOfDay(targetDate), startOfDay(new Date()));
}

/**
 * Helper to append an action event to a PlanilhaInstalacao's history JSON array.
 * Stores action description and localized date/time.
 */
export function appendHistory(existingHistorico: any, actionDescription: string): any[] {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const formattedDate = formatter.format(new Date());
  
  let historyArray: any[] = [];
  
  if (Array.isArray(existingHistorico)) {
    historyArray = [...existingHistorico];
  } else if (typeof existingHistorico === "string") {
    try {
      const parsed = JSON.parse(existingHistorico);
      if (Array.isArray(parsed)) {
        historyArray = parsed;
      }
    } catch (e) {
      historyArray = [];
    }
  } else if (existingHistorico && typeof existingHistorico === "object") {
    // In case Prisma returned it as a JSON object wrapper
    try {
      const parsed = JSON.parse(JSON.stringify(existingHistorico));
      if (Array.isArray(parsed)) {
        historyArray = parsed;
      }
    } catch (e) {
      historyArray = [];
    }
  }

  historyArray.push({
    action: actionDescription,
    date: formattedDate
  });

  return historyArray;
}

export function formatDate(sqliteDate: string): string {
  // "YYYY-MM-DD HH:MM:SS" → "YYYY.MM.DD HH:MM"
  if (!sqliteDate) return "";
  const [date, time] = sqliteDate.split(" ");
  if (!date) return sqliteDate;
  const pretty = date.replaceAll("-", ".");
  return time ? `${pretty} ${time.slice(0, 5)}` : pretty;
}

export function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

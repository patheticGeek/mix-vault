const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(date: Date | string): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = (Date.now() - then.getTime()) / 1000;

  for (const [unit, unitSeconds] of UNITS) {
    if (seconds >= unitSeconds) {
      return relativeTimeFormat.format(-Math.floor(seconds / unitSeconds), unit);
    }
  }
  return relativeTimeFormat.format(0, "second");
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(wholeSeconds).padStart(2, "0")}`;
}

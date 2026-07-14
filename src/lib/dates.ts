/** Date helpers. All app dates are local-timezone ISO days: "YYYY-MM-DD". */
export type ISODate = string;

export function toISO(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Last n dates ending today, oldest first. */
export function lastNDates(n: number, endISO: ISODate = todayISO()): ISODate[] {
  const out: ISODate[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endISO, -i));
  return out;
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(iso: ISODate): number {
  return fromISO(iso).getDay();
}

/** ISO date of the Monday of the week containing `iso`. */
export function startOfWeek(iso: ISODate): ISODate {
  const wd = weekdayOf(iso);
  const diff = wd === 0 ? -6 : 1 - wd;
  return addDays(iso, diff);
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

export function isSameMonth(a: ISODate, b: ISODate): boolean {
  return monthKey(a) === monthKey(b);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);
}

const FMT = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const FMT_FULL = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const FMT_WD = new Intl.DateTimeFormat("en", { weekday: "short" });

/** "Jun 4" */
export function formatShort(iso: ISODate): string {
  return FMT.format(fromISO(iso));
}

/** "Friday, June 4" */
export function formatFull(iso: ISODate): string {
  return FMT_FULL.format(fromISO(iso));
}

/** "Mon" */
export function formatWeekday(iso: ISODate): string {
  return FMT_WD.format(fromISO(iso));
}

export function isToday(iso: ISODate): boolean {
  return iso === todayISO();
}

/** Greeting based on current hour. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

import { OfficeHour } from "./types";

/* ================= GET DAY NAME ================= */
export function getDayName(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

/* ================= FIND OFFICE HOURS ================= */
export function getOfficeHoursForDay(
  date: Date,
  officeHours: OfficeHour[],
) {
  const day = getDayName(date);

  return officeHours.find((o) => o.day === day);
}

/* ================= CHECK WORKING DAY ================= */
export function isWorkingDayOffice(
  date: Date,
  officeHours: OfficeHour[],
) {
  const office = getOfficeHoursForDay(date, officeHours);

  if (!office) return false;

  return office.isWorkingDay;
}

/* ================= PARSE TIME ================= */
export function parseTimeToDate(
  baseDate: Date,
  time: string,
) {
  const [h, m] = time.split(":").map(Number);

  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);

  return d;
}

/* ================= GET WORK WINDOW ================= */
export function getWorkWindow(
  date: Date,
  officeHours: OfficeHour[],
) {
  const office = getOfficeHoursForDay(date, officeHours);

  if (!office || !office.isWorkingDay) {
    return null;
  }

  const start = parseTimeToDate(date, office.timeIn);
  const end = parseTimeToDate(date, office.timeOut);

  return { start, end };
}
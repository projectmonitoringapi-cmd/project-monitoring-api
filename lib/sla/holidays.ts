import { Holiday } from "./types";

/* ================= CHECK HOLIDAY ================= */
export function getHoliday(date: Date, holidays: Holiday[]) {
  const key = date.toISOString().slice(0, 10);

  return holidays.find((h) => h.date === key);
}

/* ================= IS WORKING DAY ================= */
export function isWorkingDayHoliday(
  date: Date,
  holidays: Holiday[],
) {
  const holiday = getHoliday(date, holidays);

  if (!holiday) return true;

  return holiday.isWorkingDay === true;
}

/* ================= GET HOLIDAY WORK WINDOW ================= */
/* For future use (HALF / CUSTOM support) */
export function getHolidayWorkHours(
  holiday?: Holiday,
) {
  if (!holiday) return null;

  if (holiday.type === "FULL") {
    return null; // no working hours
  }

  if (
    (holiday.type === "HALF" || holiday.type === "CUSTOM") &&
    holiday.timeIn &&
    holiday.timeOut
  ) {
    return {
      timeIn: holiday.timeIn,
      timeOut: holiday.timeOut,
    };
  }

  return null;
}
/* eslint-disable @typescript-eslint/no-unused-vars */
type OfficeHour = {
  day: string;
  timeIn: string;
  timeOut: string;
  isWorkingDay: boolean;
};

type Holiday = {
  date: string;
  isWorkingDay: boolean;
};

type ProcessRule = {
  prescribeDays: number;
  hours: number;
};

function parseTime(base: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function getDayName(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function computeProcess({
  dateSubmitted,
  dateApproved,
  officeHours,
  holidays,
  processRule,
}: {
  dateSubmitted?: string;
  dateApproved?: string;
  officeHours: OfficeHour[];
  holidays: Holiday[];
  processRule?: ProcessRule;
}) {
  if (!dateSubmitted) {
    return { processTime: 0, processStatus: "PENDING" };
  }

  const start = new Date(dateSubmitted.replace(" ", "T"));
  const end = dateApproved
    ? new Date(dateApproved.replace(" ", "T"))
    : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { processTime: 0, processStatus: "PENDING" };
  }

  let totalMinutes = 0;
  const cursor = new Date(start);

  while (cursor < end) {
    const dayName = getDayName(cursor);

    const holiday = holidays.find(
      (h) => h.date === cursor.toISOString().slice(0, 10),
    );

    const office = officeHours.find((o) => o.day === dayName);

    const isWorkingDay =
      office?.isWorkingDay && (!holiday || holiday.isWorkingDay === true);

    if (!isWorkingDay || !office) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    const workStart = parseTime(cursor, office.timeIn);
    const workEnd = parseTime(cursor, office.timeOut);

    const rangeStart = cursor > workStart ? cursor : workStart;
    const rangeEnd = end < workEnd ? end : workEnd;

    if (rangeEnd > rangeStart) {
      totalMinutes += (rangeEnd.getTime() - rangeStart.getTime()) / 60000;
    }

    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  const totalHours = totalMinutes / 60;

  let processStatus: "PENDING" | "COMPLETED" | "OVERDUE" = "PENDING";

  /* ================= FINAL SLA LOGIC ================= */
  if (!dateApproved) {
    processStatus = "PENDING";
  } else if (processRule) {
    const allowedHours = processRule.hours || 0; // ✅ USE HOURS ONLY

    if (totalHours > allowedHours) {
      processStatus = "OVERDUE";
    } else {
      processStatus = "COMPLETED";
    }
  } else {
    processStatus = "COMPLETED";
  }

  return {
    processTime: Number(totalHours.toFixed(2)),
    processStatus,
  };
}
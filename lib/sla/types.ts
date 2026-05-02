export type OfficeHour = {
  day: string; // e.g. "Monday"
  timeIn: string; // "08:00"
  timeOut: string; // "17:00"
  isWorkingDay: boolean;
};

export type Holiday = {
  date: string; // "YYYY-MM-DD"
  name?: string;
  type?: "FULL" | "HALF" | "CUSTOM";
  timeIn?: string;
  timeOut?: string;
  isWorkingDay: boolean;
};

export type ProcessRule = {
  transaction: string;
  prescribeDays: number;
  hours: number;
};

export type SLAResult = {
  processTime: number;
  processStatus: "PENDING" | "COMPLETED" | "OVERDUE";
};
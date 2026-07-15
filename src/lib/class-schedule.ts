export const CIOS_TIME_ZONE = "Africa/Lagos";

export const COMPULSORY_CLASS_SCHEDULE = [
  { day: "Tuesday", isoDay: 2, start: "20:00", end: "22:00" },
  { day: "Wednesday", isoDay: 3, start: "20:00", end: "22:00" },
  { day: "Friday", isoDay: 5, start: "20:00", end: "22:00" },
] as const;

export const CLASS_ATTENDANCE_POLICY = {
  joinOpensMinutesBefore: 15,
  lateAfterMinutes: 0,
  joinClosesMinutesAfterStart: 15,
  signOutOpensMinutesBeforeEnd: 10,
  signOutClosesMinutesAfterEnd: 15,
  minimumPresentMinutes: 90,
} as const;

export function formatCompulsoryClassSchedule() {
  return "Tuesday, Wednesday, and Friday · 8:00–10:00 PM WAT";
}

export function isCompulsoryScheduleSlot(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CIOS_TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = value("weekday");
  const time = `${value("hour")}:${value("minute")}`;
  return COMPULSORY_CLASS_SCHEDULE.some(
    (slot) => slot.day === weekday && slot.start === time,
  );
}

export function getAttendanceWindow(scheduledAt: string, durationMinutes: number) {
  const startsAt = new Date(scheduledAt);
  const opensAt = new Date(
    startsAt.getTime() - CLASS_ATTENDANCE_POLICY.joinOpensMinutesBefore * 60_000,
  );
  const closesAt = new Date(
    startsAt.getTime() + Math.min(durationMinutes, CLASS_ATTENDANCE_POLICY.joinClosesMinutesAfterStart) * 60_000,
  );
  const lateAt = new Date(
    startsAt.getTime() + CLASS_ATTENDANCE_POLICY.lateAfterMinutes * 60_000,
  );
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const signOutOpensAt = new Date(endsAt.getTime() - CLASS_ATTENDANCE_POLICY.signOutOpensMinutesBeforeEnd * 60_000);
  const signOutClosesAt = new Date(endsAt.getTime() + CLASS_ATTENDANCE_POLICY.signOutClosesMinutesAfterEnd * 60_000);
  return { startsAt, endsAt, opensAt, closesAt, lateAt, signOutOpensAt, signOutClosesAt };
}

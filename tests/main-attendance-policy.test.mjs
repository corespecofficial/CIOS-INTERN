import assert from "node:assert/strict";
import test from "node:test";

import {
  getAttendanceWindow,
  isCompulsoryScheduleSlot,
} from "../src/lib/class-schedule.ts";

test("main programme runs only Tuesday, Wednesday, and Friday", () => {
  assert.equal(isCompulsoryScheduleSlot(new Date("2026-07-14T19:00:00.000Z")), true);
  assert.equal(isCompulsoryScheduleSlot(new Date("2026-07-15T19:00:00.000Z")), true);
  assert.equal(isCompulsoryScheduleSlot(new Date("2026-07-16T19:00:00.000Z")), false);
  assert.equal(isCompulsoryScheduleSlot(new Date("2026-07-17T19:00:00.000Z")), true);
});

test("Lagos attendance and sign-out windows match the programme policy", () => {
  const window = getAttendanceWindow("2026-07-14T19:00:00.000Z", 120);

  assert.equal(window.opensAt.toISOString(), "2026-07-14T18:45:00.000Z");
  assert.equal(window.lateAt.toISOString(), "2026-07-14T19:00:00.000Z");
  assert.equal(window.closesAt.toISOString(), "2026-07-14T19:15:00.000Z");
  assert.equal(window.signOutOpensAt.toISOString(), "2026-07-14T20:50:00.000Z");
  assert.equal(window.signOutClosesAt.toISOString(), "2026-07-14T21:15:00.000Z");
});

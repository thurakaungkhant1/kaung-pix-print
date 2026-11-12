import { describe, expect, test } from "bun:test";
import { eventStatus, fromYangonInput, toYangonInput, formatYangonDate, countdownTarget } from "./mlbbEvents";

const now = Date.parse("2026-11-11T03:00:00Z");

describe("MLBB event status", () => {
  test("upcoming before start", () => {
    expect(eventStatus({ starts_at: "2026-12-01T00:00:00Z", ends_at: "2026-12-05T00:00:00Z" }, now)).toBe("upcoming");
  });
  test("live between start and end", () => {
    expect(eventStatus({ starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-11-20T00:00:00Z" }, now)).toBe("live");
  });
  test("ended after end", () => {
    expect(eventStatus({ starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-10T00:00:00Z" }, now)).toBe("ended");
  });
  test("single-day event without an end lasts 24 hours", () => {
    expect(eventStatus({ starts_at: "2026-11-10T04:00:00Z", ends_at: null }, now)).toBe("live");
    expect(eventStatus({ starts_at: "2026-11-09T00:00:00Z", ends_at: null }, now)).toBe("ended");
  });
  test("countdown targets the start for upcoming events", () => {
    expect(countdownTarget({ starts_at: "2026-12-01T00:00:00Z", ends_at: null }, now)?.label).toBe("Starts in");
  });
});

describe("Asia/Yangon time", () => {
  test("admin input is read as Yangon time (UTC+06:30)", () => {
    expect(fromYangonInput("2027-01-14T00:00")).toBe("2027-01-13T17:30:00.000Z");
  });
  test("stored time shows back in Yangon time", () => {
    expect(toYangonInput("2027-01-13T17:30:00.000Z")).toBe("2027-01-14T00:00");
    expect(formatYangonDate("2027-01-13T17:30:00.000Z")).toBe("14 Jan 2027");
  });
});

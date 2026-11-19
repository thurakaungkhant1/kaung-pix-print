import { describe, expect, test } from "bun:test";
import { eventStatus, fromYangonInput, toYangonInput, formatYangonDate, countdownTarget, isPopupActive } from "./mlbbEvents";

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

describe("event popup window", () => {
  const base = { popup_enabled: true, review_status: "approved" as const, popup_starts_at: "2026-11-11T00:00:00Z", popup_ends_at: "2026-11-12T00:00:00Z" };
  test("shows inside the admin's window", () => {
    expect(isPopupActive(base, now)).toBe(true);
  });
  test("hidden before start and after end", () => {
    expect(isPopupActive(base, Date.parse("2026-11-10T23:59:00Z"))).toBe(false);
    expect(isPopupActive(base, Date.parse("2026-11-12T00:00:00Z"))).toBe(false);
  });
  test("hidden when switched off or not approved", () => {
    expect(isPopupActive({ ...base, popup_enabled: false }, now)).toBe(false);
    expect(isPopupActive({ ...base, review_status: "pending" }, now)).toBe(false);
  });
});

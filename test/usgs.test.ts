import { describe, expect, it } from "vitest";
import { MAX_READING_AGE_MS, parseGaugeReading } from "../src/usgs";

const NOW = new Date("2026-11-01T23:30:00.000Z");
const FRESH = "2026-11-01T15:00:00.000-08:00";

function series(code: string, value: string, dateTime: string, site = "14162500") {
  return {
    sourceInfo: { siteCode: [{ value: site, agencyCode: "USGS" }] },
    variable: { variableCode: [{ value: code }] },
    values: [{ value: [{ value, dateTime, qualifiers: ["P"] }] }],
  };
}

function payload(entries: ReturnType<typeof series>[]) {
  return { value: { timeSeries: entries } };
}

describe("parseGaugeReading", () => {
  it("reads fresh discharge and water temperature", () => {
    const reading = parseGaugeReading(
      payload([series("00060", "1860", FRESH), series("00010", "9.5", FRESH)]),
      "14162500",
      NOW,
    );
    expect(reading).toEqual({
      flowCfs: 1860,
      waterTempC: 9.5,
      observedAt: FRESH,
    });
  });

  it("uses the older timestamp when the two readings differ", () => {
    const later = "2026-11-01T15:15:00.000-08:00";
    const reading = parseGaugeReading(
      payload([series("00060", "1860", FRESH), series("00010", "9.5", later)]),
      "14162500",
      NOW,
    );
    expect(reading.observedAt).toBe(FRESH);
  });

  it("drops a stale parameter and keeps a fresh one", () => {
    const stale = new Date(NOW.getTime() - MAX_READING_AGE_MS - 60_000).toISOString();
    const reading = parseGaugeReading(
      payload([series("00060", "1860", stale), series("00010", "9.5", FRESH)]),
      "14162500",
      NOW,
    );
    expect(reading.flowCfs).toBeNull();
    expect(reading.waterTempC).toBe(9.5);
    expect(reading.observedAt).toBe(FRESH);
  });

  it("ignores non-numeric flags and other sites", () => {
    const reading = parseGaugeReading(
      payload([
        series("00060", "Ice", FRESH),
        series("00060", "50", FRESH, "99999999"),
        series("00010", "", FRESH),
      ]),
      "14162500",
      NOW,
    );
    expect(reading).toEqual({ flowCfs: null, waterTempC: null, observedAt: null });
  });

  it("returns no readings for an empty payload", () => {
    expect(parseGaugeReading({}, "14162500", NOW)).toEqual({
      flowCfs: null,
      waterTempC: null,
      observedAt: null,
    });
  });
});

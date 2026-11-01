import { PARAMETER } from "./gauge";

/** A reading older than this is not a "today" call. */
export const MAX_READING_AGE_MS = 6 * 60 * 60 * 1000;

const MAX_FUTURE_SKEW_MS = 15 * 60 * 1000;

const USGS_IV_URL = "https://waterservices.usgs.gov/nwis/iv/";

export interface GaugeReading {
  flowCfs: number | null;
  waterTempC: number | null;
  observedAt: string | null;
}

export function gaugeRequestUrl(siteId: string): string {
  const url = new URL(USGS_IV_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("sites", siteId);
  url.searchParams.set("parameterCd", `${PARAMETER.discharge},${PARAMETER.waterTemperature}`);
  return url.toString();
}

export async function fetchGaugeReading(siteId: string, now = new Date()): Promise<GaugeReading> {
  const response = await fetch(gaugeRequestUrl(siteId), {
    headers: {
      Accept: "application/json",
      "User-Agent": "10xfish/0.1 (public river conditions page)",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`USGS request failed with status ${response.status}`);
  }

  return parseGaugeReading(await response.json(), siteId, now);
}

/**
 * Pull the latest fresh discharge and water temperature for one site
 * out of an Instantaneous Values JSON payload. Non-numeric flags such
 * as "Ice" are ignored. Stale timestamps become a missing reading.
 */
export function parseGaugeReading(payload: unknown, siteId: string, now: Date): GaugeReading {
  const flow = latestParameter(payload, siteId, PARAMETER.discharge, now);
  const temp = latestParameter(payload, siteId, PARAMETER.waterTemperature, now);
  return {
    flowCfs: flow?.value ?? null,
    waterTempC: temp?.value ?? null,
    observedAt: earlierTimestamp(flow?.dateTime ?? null, temp?.dateTime ?? null),
  };
}

interface Sample {
  value: number;
  dateTime: string;
}

function latestParameter(
  payload: unknown,
  siteId: string,
  parameterCode: string,
  now: Date,
): Sample | null {
  const seriesList = timeSeries(payload);
  let best: { sample: Sample; time: number } | null = null;

  for (const series of seriesList) {
    if (seriesSite(series) !== siteId || seriesParameter(series) !== parameterCode) {
      continue;
    }
    for (const entry of seriesValues(series)) {
      const value = numericValue(entry.value);
      const time = typeof entry.dateTime === "string" ? Date.parse(entry.dateTime) : Number.NaN;
      if (value === null || !Number.isFinite(time) || !isFresh(time, now)) {
        continue;
      }
      if (!best || time > best.time) {
        best = { sample: { value, dateTime: entry.dateTime as string }, time };
      }
    }
  }

  return best?.sample ?? null;
}

function isFresh(time: number, now: Date): boolean {
  const age = now.getTime() - time;
  return age <= MAX_READING_AGE_MS && age >= -MAX_FUTURE_SKEW_MS;
}

function earlierTimestamp(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function timeSeries(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload);
  const value = asRecord(root?.value);
  const series = value?.timeSeries;
  if (!Array.isArray(series)) return [];
  return series.filter(isRecord);
}

function seriesSite(series: Record<string, unknown>): string | null {
  const source = asRecord(series.sourceInfo);
  const codes = source?.siteCode;
  if (!Array.isArray(codes)) return null;
  for (const code of codes) {
    const record = asRecord(code);
    if (typeof record?.value === "string") return record.value;
  }
  return null;
}

function seriesParameter(series: Record<string, unknown>): string | null {
  const variable = asRecord(series.variable);
  const codes = variable?.variableCode;
  if (!Array.isArray(codes)) return null;
  for (const code of codes) {
    const record = asRecord(code);
    if (typeof record?.value === "string") return record.value;
  }
  return null;
}

function seriesValues(series: Record<string, unknown>): Record<string, unknown>[] {
  const groups = series.values;
  if (!Array.isArray(groups)) return [];
  const entries: Record<string, unknown>[] = [];
  for (const group of groups) {
    const record = asRecord(group);
    const values = record?.value;
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (isRecord(value)) entries.push(value);
    }
  }
  return entries;
}

function numericValue(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

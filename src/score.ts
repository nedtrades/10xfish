/**
 * Starter heuristics for USGS 14162500 (McKenzie River near Vida).
 * These bands are a first pass for a go or no-go call. They are not a
 * forecast, a regulation, or a safety rating.
 *
 * Discharge, parameter 00060, cubic feet per second.
 * Daily means at this gauge from 2023 through 2025 stayed above about
 * 1,600 cfs, with an annual median near 3,000 cfs. Summer medians sit
 * near 2,200 cfs. Winter medians sit near 5,000 cfs, and the upper tenth
 * of days exceeds about 7,000 cfs.
 *
 *   Good: 1,500 <= flow <= 4,000
 *   Fair: 1,000 <= flow < 1,500, or 4,000 < flow <= 7,000
 *   Poor: flow < 1,000, or flow > 7,000
 *
 * Water temperature, parameter 00010, degrees Celsius.
 * Trout on this reach feed in cool water and stress as it warms past
 * about 18.5 C (65 F).
 *
 *   Good: 7 <= temp <= 16
 *   Fair: 4 <= temp < 7, or 16 < temp <= 18.5
 *   Poor: temp < 4, or temp > 18.5
 *
 * The call is the worse of the two bands. A missing or unusable reading
 * (not a finite number, negative flow, or a temperature outside -2 C to
 * 40 C) returns a no-data state instead of guessing a call.
 */

export type FishingCallName = "Good" | "Fair" | "Poor" | "No data";

export interface FishingInputs {
  flowCfs: number | null | undefined;
  waterTempC: number | null | undefined;
}

export interface FishingScore {
  call: FishingCallName;
  reason: string;
}

type Band = "good" | "fair" | "poor";
type Side = "low" | "high" | "mid";

interface Factor {
  band: Band;
  side: Side;
}

const FLOW_POOR_BELOW = 1000;
const FLOW_GOOD_FROM = 1500;
const FLOW_GOOD_THROUGH = 4000;
const FLOW_FAIR_THROUGH = 7000;

const TEMP_POOR_BELOW = 4;
const TEMP_GOOD_FROM = 7;
const TEMP_GOOD_THROUGH = 16;
const TEMP_FAIR_THROUGH = 18.5;

const TEMP_MIN_USABLE = -2;
const TEMP_MAX_USABLE = 40;

const BAND_RANK: Record<Band, number> = {
  good: 0,
  fair: 1,
  poor: 2,
};

export function scoreFishingCall(input: FishingInputs): FishingScore {
  const flow = usableFlow(input.flowCfs);
  const temp = usableTemp(input.waterTempC);

  if (flow === null || temp === null) {
    return { call: "No data", reason: missingReason(flow === null, temp === null) };
  }

  const flowFactor = classifyFlow(flow);
  const tempFactor = classifyTemp(temp);
  return {
    call: worseCall(flowFactor, tempFactor),
    reason: combinedReason(flowFactor, tempFactor),
  };
}

function usableFlow(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function usableTemp(value: number | null | undefined): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < TEMP_MIN_USABLE ||
    value > TEMP_MAX_USABLE
  ) {
    return null;
  }
  return value;
}

function classifyFlow(flow: number): Factor {
  if (flow < FLOW_POOR_BELOW) return { band: "poor", side: "low" };
  if (flow < FLOW_GOOD_FROM) return { band: "fair", side: "low" };
  if (flow <= FLOW_GOOD_THROUGH) return { band: "good", side: "mid" };
  if (flow <= FLOW_FAIR_THROUGH) return { band: "fair", side: "high" };
  return { band: "poor", side: "high" };
}

function classifyTemp(temp: number): Factor {
  if (temp < TEMP_POOR_BELOW) return { band: "poor", side: "low" };
  if (temp < TEMP_GOOD_FROM) return { band: "fair", side: "low" };
  if (temp <= TEMP_GOOD_THROUGH) return { band: "good", side: "mid" };
  if (temp <= TEMP_FAIR_THROUGH) return { band: "fair", side: "high" };
  return { band: "poor", side: "high" };
}

function worseCall(flow: Factor, temp: Factor): Exclude<FishingCallName, "No data"> {
  const rank = Math.max(BAND_RANK[flow.band], BAND_RANK[temp.band]);
  if (rank === 2) return "Poor";
  if (rank === 1) return "Fair";
  return "Good";
}

function missingReason(flowMissing: boolean, tempMissing: boolean): string {
  if (flowMissing && tempMissing) {
    return "Discharge and water temperature are unavailable, so there is no fishing call.";
  }
  if (flowMissing) {
    return "Discharge is unavailable, so there is no fishing call.";
  }
  return "Water temperature is unavailable, so there is no fishing call.";
}

function combinedReason(flow: Factor, temp: Factor): string {
  if (flow.band === "good" && temp.band === "good") {
    return "Flow and temperature are both in a comfortable band for trout on this reach.";
  }
  return `${flowSentence(flow)} ${tempSentence(temp)}`;
}

function flowSentence(flow: Factor): string {
  if (flow.band === "good") return "Flow is in a comfortable band.";
  if (flow.band === "fair" && flow.side === "low") return "The river is running low.";
  if (flow.band === "fair") return "The river is running high and pushy.";
  if (flow.side === "low") return "The river is too low for a normal day on this reach.";
  return "The river is high enough that fishing is a poor bet today.";
}

function tempSentence(temp: Factor): string {
  if (temp.band === "good") return "Water temperature is comfortable for trout.";
  if (temp.band === "fair" && temp.side === "low") {
    return "The water is cold and trout may be sluggish.";
  }
  if (temp.band === "fair") return "The water is warmer than the comfortable band.";
  if (temp.side === "low") return "The water is cold enough that trout are likely shut down.";
  return "The water is warm enough to stress trout.";
}

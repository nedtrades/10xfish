import type { FishingCallName } from "./score";

export interface RiverCall {
  call: FishingCallName;
  reason: string;
  site: {
    id: string;
    name: string;
  };
  flowCfs: number | null;
  waterTempC: number | null;
  observedAt: string | null;
  source: string;
  parameters: {
    discharge: "00060";
    waterTemperature: "00010";
  };
}

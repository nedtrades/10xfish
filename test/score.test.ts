import { describe, expect, it } from "vitest";
import { scoreFishingCall, type FishingCallName } from "../src/score";

const GOOD_FLOW = 2000;
const GOOD_TEMP = 10;

describe("scoreFishingCall flow bands", () => {
  const cases: Array<[number, FishingCallName]> = [
    [0, "Poor"],
    [999.9, "Poor"],
    [1000, "Fair"],
    [1499.9, "Fair"],
    [1500, "Good"],
    [2750, "Good"],
    [4000, "Good"],
    [4000.1, "Fair"],
    [7000, "Fair"],
    [7000.1, "Poor"],
    [12000, "Poor"],
  ];

  it.each(cases)("flow %s with a comfortable temperature is %s", (flowCfs, call) => {
    expect(scoreFishingCall({ flowCfs, waterTempC: GOOD_TEMP }).call).toBe(call);
  });
});

describe("scoreFishingCall temperature bands", () => {
  const cases: Array<[number, FishingCallName]> = [
    [-2, "Poor"],
    [3.9, "Poor"],
    [4, "Fair"],
    [6.9, "Fair"],
    [7, "Good"],
    [12, "Good"],
    [16, "Good"],
    [16.1, "Fair"],
    [18.5, "Fair"],
    [18.6, "Poor"],
    [25, "Poor"],
    [40, "Poor"],
  ];

  it.each(cases)("temperature %s with a comfortable flow is %s", (waterTempC, call) => {
    expect(scoreFishingCall({ flowCfs: GOOD_FLOW, waterTempC }).call).toBe(call);
  });
});

describe("scoreFishingCall combined bands", () => {
  it("returns Good only when both bands are good", () => {
    expect(scoreFishingCall({ flowCfs: 1860, waterTempC: 9.5 })).toEqual({
      call: "Good",
      reason: "Flow and temperature are both in a comfortable band for trout on this reach.",
    });
  });

  it("lets a fair flow limit a good temperature", () => {
    expect(scoreFishingCall({ flowCfs: 1200, waterTempC: GOOD_TEMP })).toEqual({
      call: "Fair",
      reason: "The river is running low. Water temperature is comfortable for trout.",
    });
  });

  it("lets a high fair flow limit a good temperature", () => {
    expect(scoreFishingCall({ flowCfs: 5500, waterTempC: GOOD_TEMP })).toEqual({
      call: "Fair",
      reason: "The river is running high and pushy. Water temperature is comfortable for trout.",
    });
  });

  it("lets a cold fair temperature limit a good flow", () => {
    expect(scoreFishingCall({ flowCfs: GOOD_FLOW, waterTempC: 5 })).toEqual({
      call: "Fair",
      reason: "Flow is in a comfortable band. The water is cold and trout may be sluggish.",
    });
  });

  it("lets a warm fair temperature limit a good flow", () => {
    expect(scoreFishingCall({ flowCfs: GOOD_FLOW, waterTempC: 17 })).toEqual({
      call: "Fair",
      reason: "Flow is in a comfortable band. The water is warmer than the comfortable band.",
    });
  });

  it("stays Fair when both factors are fair", () => {
    expect(scoreFishingCall({ flowCfs: 1200, waterTempC: 17 }).call).toBe("Fair");
  });

  it("lets a poor flow override a good temperature", () => {
    expect(scoreFishingCall({ flowCfs: 500, waterTempC: GOOD_TEMP })).toEqual({
      call: "Poor",
      reason:
        "The river is too low for a normal day on this reach. Water temperature is comfortable for trout.",
    });
  });

  it("lets a blown-out flow override a good temperature", () => {
    expect(scoreFishingCall({ flowCfs: 8000, waterTempC: GOOD_TEMP }).call).toBe("Poor");
    expect(scoreFishingCall({ flowCfs: 8000, waterTempC: GOOD_TEMP }).reason).toBe(
      "The river is high enough that fishing is a poor bet today. Water temperature is comfortable for trout.",
    );
  });

  it("lets a stressful temperature override a good flow", () => {
    expect(scoreFishingCall({ flowCfs: GOOD_FLOW, waterTempC: 20 })).toEqual({
      call: "Poor",
      reason: "Flow is in a comfortable band. The water is warm enough to stress trout.",
    });
  });

  it("lets a very cold temperature override a good flow", () => {
    expect(scoreFishingCall({ flowCfs: GOOD_FLOW, waterTempC: 1 }).call).toBe("Poor");
  });

  it("stays Poor when both factors are poor", () => {
    expect(scoreFishingCall({ flowCfs: 8000, waterTempC: 22 })).toEqual({
      call: "Poor",
      reason:
        "The river is high enough that fishing is a poor bet today. The water is warm enough to stress trout.",
    });
  });

  it("lets Poor win over Fair", () => {
    expect(scoreFishingCall({ flowCfs: 500, waterTempC: 17 }).call).toBe("Poor");
    expect(scoreFishingCall({ flowCfs: 5500, waterTempC: 22 }).call).toBe("Poor");
  });
});

describe("scoreFishingCall missing data", () => {
  it("returns no data when discharge is missing", () => {
    expect(scoreFishingCall({ flowCfs: null, waterTempC: GOOD_TEMP })).toEqual({
      call: "No data",
      reason: "Discharge is unavailable, so there is no fishing call.",
    });
  });

  it("returns no data when water temperature is missing", () => {
    expect(scoreFishingCall({ flowCfs: GOOD_FLOW, waterTempC: null })).toEqual({
      call: "No data",
      reason: "Water temperature is unavailable, so there is no fishing call.",
    });
  });

  it("returns no data when both readings are missing", () => {
    expect(scoreFishingCall({ flowCfs: null, waterTempC: undefined })).toEqual({
      call: "No data",
      reason: "Discharge and water temperature are unavailable, so there is no fishing call.",
    });
  });

  it.each([
    { flowCfs: Number.NaN, waterTempC: GOOD_TEMP },
    { flowCfs: Number.POSITIVE_INFINITY, waterTempC: GOOD_TEMP },
    { flowCfs: -1, waterTempC: GOOD_TEMP },
    { flowCfs: GOOD_FLOW, waterTempC: Number.NaN },
    { flowCfs: GOOD_FLOW, waterTempC: 40.1 },
    { flowCfs: GOOD_FLOW, waterTempC: -2.1 },
  ])("treats unusable readings as no data: %j", (input) => {
    expect(scoreFishingCall(input).call).toBe("No data");
  });
});

describe("scoreFishingCall copy", () => {
  it("keeps reasons free of dash punctuation used as an aside", () => {
    const samples = [
      scoreFishingCall({ flowCfs: 1860, waterTempC: 9.5 }),
      scoreFishingCall({ flowCfs: 1200, waterTempC: 5 }),
      scoreFishingCall({ flowCfs: 8000, waterTempC: 22 }),
      scoreFishingCall({ flowCfs: null, waterTempC: null }),
    ];
    for (const sample of samples) {
      expect(sample.reason).not.toMatch(/[—–]/);
    }
  });
});

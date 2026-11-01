/**
 * USGS 14162500, McKenzie River near Vida, Oregon.
 *
 * This is the mainstem gauge on the canyon reach people mean when they
 * say they are fishing the McKenzie. On 2026-11-01 the Instantaneous
 * Values Service had same-day readings for both discharge (00060) and
 * water temperature (00010). Nearby mainstem gauges also report both,
 * but Vida is the long-standing reference for this part of the river.
 */
export const GAUGE = {
  id: "14162500",
  name: "McKenzie River near Vida, OR",
} as const;

export const PARAMETER = {
  discharge: "00060",
  waterTemperature: "00010",
} as const;

export const DATA_SOURCE = "USGS Instantaneous Values Service";

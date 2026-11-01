import { DATA_SOURCE, GAUGE, PARAMETER } from "./gauge";
import { renderPage } from "./page";
import { scoreFishingCall } from "./score";
import type { RiverCall } from "./types";
import { fetchGaugeReading } from "./usgs";

const CACHE_CONTROL = "public, max-age=120";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;

    if (request.method !== "GET" && request.method !== "HEAD") {
      return textResponse("Method not allowed", 405, { Allow: "GET, HEAD" });
    }

    if (path === "/api/call") {
      const result = await loadCall();
      return Response.json(result.report, {
        status: result.httpStatus,
        headers: {
          "Cache-Control": CACHE_CONTROL,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (path === "/") {
      const result = await loadCall();
      return new Response(renderPage(result.report), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": CACHE_CONTROL,
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; form-action 'none'",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return textResponse("Not found", 404);
  },
} satisfies ExportedHandler;

async function loadCall(): Promise<{ report: RiverCall; httpStatus: number }> {
  try {
    const reading = await fetchGaugeReading(GAUGE.id);
    const scored = scoreFishingCall(reading);
    return {
      httpStatus: 200,
      report: toReport(scored.call, scored.reason, reading.flowCfs, reading.waterTempC, reading.observedAt),
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "usgs_request_failed",
        site: GAUGE.id,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return {
      httpStatus: 502,
      report: toReport(
        "No data",
        "The gauge could not be read just now, so there is no fishing call.",
        null,
        null,
        null,
      ),
    };
  }
}

function toReport(
  call: RiverCall["call"],
  reason: string,
  flowCfs: number | null,
  waterTempC: number | null,
  observedAt: string | null,
): RiverCall {
  return {
    call,
    reason,
    site: { id: GAUGE.id, name: GAUGE.name },
    flowCfs,
    waterTempC,
    observedAt,
    source: DATA_SOURCE,
    parameters: {
      discharge: PARAMETER.discharge,
      waterTemperature: PARAMETER.waterTemperature,
    },
  };
}

function textResponse(body: string, status: number, extra: HeadersInit = {}): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

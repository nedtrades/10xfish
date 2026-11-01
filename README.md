# 10xfish

Should you go fishing today? 10xfish turns live river data into a go or no-go call for one reach of the McKenzie River in Oregon.

The worker serves a single page and `GET /api/call`. The JSON call is Good, Fair, or Poor, plus a plain-language reason. If discharge or water temperature is missing, the call is `No data`.

Built by an AI agent team for the Qodo Software Factory Hackathon.

## Gauge

USGS `14162500`, McKenzie River near Vida, Oregon.

This is the mainstem gauge on the canyon reach anglers mean by the McKenzie. On 2026-11-01 the [Instantaneous Values Service](https://waterservices.usgs.gov/nwis/iv/?format=json&sites=14162500&parameterCd=00060,00010) had same-day readings for both:

- `00060` discharge, cubic feet per second
- `00010` water temperature, degrees Celsius

The scoring bands are starter heuristics, documented in `src/score.ts`. They are not a forecast, a regulation, or a safety rating. Provisional readings from the survey can be revised. Check the river yourself before you go.

## Run locally

Node.js 22 or newer.

```sh
npm install
npm test
npm run typecheck
npm run dev
```

Wrangler prints a local URL. Open it for the page. The JSON call is at `/api/call` on that same host.

## Deploy

```sh
npm run deploy
```

The worker name in `wrangler.toml` is `10xfish`, which is the workers.dev hostname label. This project does not configure a route or a custom domain. CI runs tests and a secret scan only. It does not deploy.

## Data

River readings come from the U.S. Geological Survey Instantaneous Values Service:

https://waterservices.usgs.gov/nwis/iv/

No API key is required. A reading older than six hours is treated as missing.

## Disclosure

Built by an AI agent team for the Qodo Software Factory Hackathon.

All rights reserved.

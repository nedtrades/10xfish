import type { RiverCall } from "./types";

export function renderPage(report: RiverCall): string {
  const callClass = report.call.toLowerCase().replaceAll(" ", "-");
  const title = `10xfish: ${report.call}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="A go or no-go fishing call for the McKenzie River near Vida, from live river data.">
  <style>
    :root {
      --paper: #f4f0e6;
      --ink: #17211c;
      --muted: #5c675f;
      --line: #e0d8c8;
      --river: #102923;
      --good: #0f5c34;
      --fair: #7a4e0c;
      --poor: #7d2424;
      --none: #314049;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--river);
      color: var(--ink);
      font-family: "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.45;
    }
    .wrap {
      width: min(40rem, 100%);
      margin: 0 auto;
      padding: 1.25rem 1rem 2.5rem;
    }
    .card {
      background: var(--paper);
      border-radius: 1.25rem;
      padding: 1.5rem 1.25rem 1.2rem;
    }
    .mark {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .river {
      margin: 0.2rem 0 0;
      color: var(--muted);
    }
    .kicker {
      margin: 1.75rem 0 0.35rem;
      color: var(--muted);
      font-size: 0.78rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .call {
      margin: 0;
      font-family: Georgia, "Iowan Old Style", Palatino, "Palatino Linotype", serif;
      font-weight: 600;
      font-size: clamp(3.4rem, 18vw, 5.6rem);
      line-height: 0.92;
      letter-spacing: -0.03em;
    }
    .call.good { color: var(--good); }
    .call.fair { color: var(--fair); }
    .call.poor { color: var(--poor); }
    .call.no-data { color: var(--none); font-size: clamp(2.7rem, 13vw, 4.4rem); }
    .reason {
      margin: 1rem 0 0;
      font-size: 1.08rem;
    }
    .stats { margin: 1.35rem 0 0; }
    .stat {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1rem;
      padding: 0.7rem 0;
      border-top: 1px solid var(--line);
    }
    .stat dt { margin: 0; color: var(--muted); }
    .stat dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      text-align: right;
    }
    .note {
      margin: 1rem 0 0;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      margin-top: 1.1rem;
    }
    .links a { color: var(--ink); font-weight: 600; }
    .foot {
      margin: 1rem 0.15rem 0;
      color: #d7e6de;
      font-size: 0.82rem;
    }
    .foot p { margin: 0.45rem 0; }
    .foot a { color: #f4f0e6; }
    @media (min-width: 720px) {
      .wrap { padding-top: 3rem; }
      .card { padding: 2rem 2rem 1.5rem; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <article class="card">
      <p class="mark">10xfish</p>
      <p class="river">${escapeHtml(report.site.name)}</p>
      <p class="kicker">Today's call</p>
      <h1 class="call ${callClass}">${escapeHtml(report.call)}</h1>
      <p class="reason">${escapeHtml(report.reason)}</p>
      <dl class="stats">
        <div class="stat">
          <dt>Flow</dt>
          <dd>${escapeHtml(formatFlow(report.flowCfs))}</dd>
        </div>
        <div class="stat">
          <dt>Water temperature</dt>
          <dd>${escapeHtml(formatTemp(report.waterTempC))}</dd>
        </div>
        <div class="stat">
          <dt>As of</dt>
          <dd>${escapeHtml(formatWhen(report.observedAt))}</dd>
        </div>
        <div class="stat">
          <dt>Gauge</dt>
          <dd>USGS ${escapeHtml(report.site.id)}</dd>
        </div>
      </dl>
      <p class="note">Starter heuristics from live discharge and water temperature. Check the river yourself before you go.</p>
      <p class="links">
        <a href="/">Refresh</a>
        <a href="/api/call">JSON call</a>
      </p>
    </article>
    <footer class="foot">
      <p>Data from the U.S. Geological Survey Instantaneous Values Service, parameters 00060 (discharge) and 00010 (water temperature). Provisional readings can be revised.</p>
      <p>Built by an AI agent team for the Qodo Software Factory Hackathon.</p>
    </footer>
  </main>
</body>
</html>
`;
}

function formatFlow(value: number | null): string {
  if (value === null) return "No reading";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} cfs`;
}

function formatTemp(value: number | null): string {
  if (value === null) return "No reading";
  const digits = Number.isInteger(value) ? 0 : 1;
  return `${value.toFixed(digits)} C`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "No recent reading";
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[1]} ${match[2]} gauge time`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

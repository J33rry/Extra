const express = require("express");

const app = express();
app.use(express.json());

// In-memory state (no database). Resets whenever the server restarts.
let totalScans = 0;
const scans = []; // newest first, capped at MAX_SCANS
const MAX_SCANS = 50;

// The ESP32 POSTs here every time a card is scanned.
app.post("/scan", (req, res) => {
  const { uid, device } = req.body || {};
  if (!uid) return res.status(400).json({ ok: false, error: "uid is required" });

  totalScans++;
  const time = new Date().toISOString();
  scans.unshift({ n: totalScans, uid, device: device || "unknown", time });
  if (scans.length > MAX_SCANS) scans.pop();

  console.log(`[${time}] Card scanned #${totalScans}: ${uid} (from ${device || "unknown"})`);
  res.json({ ok: true, uid, count: totalScans, receivedAt: time });
});

// JSON the page polls for live updates.
app.get("/stats", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ total: totalScans, scans });
});

// The single page: live counter + list of scans.
app.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.type("html").send(PAGE);
});

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RFID Scan Counter</title>
<style>
  :root { --bg:#f6f7f9; --card:#fff; --text:#16181d; --muted:#6b7280; --line:#e5e7eb; --accent:#2563eb; --flash:#dbeafe; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0f1115; --card:#181b21; --text:#eef0f3; --muted:#9aa1ad; --line:#272b33; --accent:#60a5fa; --flash:#1e3a5f; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 640px; margin: 0 auto; padding: 32px 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .status { color: var(--muted); font-size: 14px; margin-bottom: 24px; }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e; margin-right:6px; vertical-align:middle; }
  .dot.off { background:#ef4444; }
  .counter { background:var(--card); border:1px solid var(--line); border-radius:16px;
             padding: 28px; text-align:center; margin-bottom: 24px; transition: background .4s; }
  .counter.flash { background: var(--flash); }
  .count { font-size: 72px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; color: var(--accent); }
  .label { color: var(--muted); margin-top: 8px; }
  .last { margin-top: 12px; font-size: 14px; color: var(--muted); }
  h2 { font-size: 16px; margin: 0 0 8px; }
  table { width:100%; border-collapse: collapse; background:var(--card); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  th, td { text-align:left; padding: 10px 12px; border-bottom:1px solid var(--line); font-size:14px; }
  th { color: var(--muted); font-weight: 500; }
  tr:last-child td { border-bottom: none; }
  td.uid { font-family: ui-monospace, Menlo, monospace; }
  .empty { color: var(--muted); text-align:center; padding: 24px; }
</style>
</head>
<body>
<main>
  <h1>RFID Scan Counter</h1>
  <div class="status"><span id="dot" class="dot"></span><span id="status">Connecting…</span></div>

  <div id="counter" class="counter">
    <div id="count" class="count">0</div>
    <div class="label">total scans</div>
    <div id="last" class="last">No scans yet</div>
  </div>

  <h2>Scans</h2>
  <table>
    <thead><tr><th>#</th><th>Card UID</th><th>Time</th></tr></thead>
    <tbody id="rows"><tr><td colspan="3" class="empty">Waiting for a card…</td></tr></tbody>
  </table>
</main>
<script>
  let lastTotal = null;
  const $ = (id) => document.getElementById(id);
  const fmt = (iso) => new Date(iso).toLocaleTimeString();

  async function refresh() {
    try {
      const r = await fetch("/stats", { cache: "no-store" });
      const { total, scans } = await r.json();

      $("count").textContent = total;
      if (lastTotal !== null && total > lastTotal) {
        $("counter").classList.add("flash");
        setTimeout(() => $("counter").classList.remove("flash"), 600);
      }
      lastTotal = total;

      $("last").textContent = scans.length
        ? "Last: " + scans[0].uid + " at " + fmt(scans[0].time)
        : "No scans yet";

      $("rows").innerHTML = scans.length
        ? scans.map(s => "<tr><td>" + s.n + "</td><td class='uid'>" + s.uid.replace(/[<>&]/g, "") +
                          "</td><td>" + fmt(s.time) + "</td></tr>").join("")
        : "<tr><td colspan='3' class='empty'>Waiting for a card…</td></tr>";

      $("dot").className = "dot";
      $("status").textContent = "Live · updates every second";
    } catch {
      $("dot").className = "dot off";
      $("status").textContent = "Can't reach server, retrying…";
    }
  }
  refresh();
  setInterval(refresh, 1000);
</script>
</body>
</html>`;

// Vercel imports the app; locally (`npm start`) we listen on a port.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RFID backend on http://localhost:${PORT}  (POST /scan, GET /stats)`);
  });
}

module.exports = app;

const express = require("express");

const app = express();
app.use(express.json());

const PORT = 3000;

// The one route: the ESP32 POSTs here every time a card is scanned.
app.post("/scan", (req, res) => {
  const { uid, device } = req.body || {};
  if (!uid) return res.status(400).json({ ok: false, error: "uid is required" });

  const time = new Date().toLocaleString();
  console.log(`[${time}] Card scanned: ${uid} (from ${device || "unknown"})`);

  res.json({ ok: true, uid, receivedAt: time });
});

// 0.0.0.0 so other devices on the network (the ESP32) can reach it.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`RFID backend listening on http://0.0.0.0:${PORT}/scan`);
});

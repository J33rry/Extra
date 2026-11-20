const express = require("express");

const app = express();
app.use(express.json());

// The one route: the ESP32 POSTs here every time a card is scanned.
app.post("/scan", (req, res) => {
  const { uid, device } = req.body || {};
  if (!uid) return res.status(400).json({ ok: false, error: "uid is required" });

  const time = new Date().toISOString();
  console.log(`[${time}] Card scanned: ${uid} (from ${device || "unknown"})`);

  res.json({ ok: true, uid, receivedAt: time });
});

// Vercel imports the app; locally (`npm start`) we listen on a port.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RFID backend listening on http://0.0.0.0:${PORT}/scan`);
  });
}

module.exports = app;

import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import mongoose from "mongoose";
import Prediction from "./models/Prediction.js";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const bestOf = (results) =>
  results.reduce((a, b) => (b.confidence > a.confidence ? b : a));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/predict", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const form = new FormData();
    form.append(
      "file",
      new Blob([req.file.buffer], { type: req.file.mimetype }),
      req.file.originalname
    );

    const mlRes = await fetch(`${process.env.ML_URL}/predict`, {
      method: "POST",
      body: form,
    });
    if (!mlRes.ok) throw new Error("ML service error");
    const result = await mlRes.json();

    const saved = await Prediction.create({
      filename: req.file.originalname,
      ...result,
    });
    res.json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Prediction failed" });
  }
});

app.get("/api/history", async (_req, res) => {
  try {
    const items = await Prediction.find({ results: { $exists: true, $ne: [] } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load history" });
  }
});

app.delete("/api/history", async (_req, res) => {
  await Prediction.deleteMany({});
  res.json({ ok: true });
});

app.get("/api/stats", async (_req, res) => {
  try {
    const docs = await Prediction.find({ results: { $exists: true, $ne: [] } })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const classCounts = { ewaste: 0, metal: 0, organic: 0, plastic: 0 };
    const confSum = {};
    const confN = {};
    const days = {};
    let agree = 0;

    for (const d of docs) {
      const final = bestOf(d.results);
      classCounts[final.label] = (classCounts[final.label] || 0) + 1;
      if (d.agree) agree++;
      for (const m of d.results) {
        confSum[m.model] = (confSum[m.model] || 0) + m.confidence;
        confN[m.model] = (confN[m.model] || 0) + 1;
      }
      const day = new Date(d.createdAt).toISOString().slice(0, 10);
      days[day] = (days[day] || 0) + 1;
    }

    const avgConf = {};
    for (const k in confSum) avgConf[k] = confSum[k] / confN[k];

    const timeline = Object.keys(days)
      .sort()
      .slice(-7)
      .map((date) => ({ date: date.slice(5), count: days[date] }));

    res.json({
      total: docs.length,
      agreeRate: docs.length ? agree / docs.length : 0,
      classCounts,
      avgConf,
      timeline,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load stats" });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT, () =>
      console.log("API running on port", process.env.PORT)
    );
  })
  .catch((e) => console.error("MongoDB connection failed:", e.message));
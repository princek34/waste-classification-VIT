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

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

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
    const items = await Prediction.find().sort({ createdAt: -1 }).limit(20);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load history" });
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
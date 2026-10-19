import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    filename: String,
    results: [mongoose.Schema.Types.Mixed],
    agree: Boolean,
  },
  { timestamps: true }
);

export default mongoose.model("Prediction", schema);
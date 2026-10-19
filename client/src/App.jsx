import { useState, useEffect } from "react";

const API = "http://localhost:5000/api";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    try {
      const r = await fetch(`${API}/history`);
      setHistory(await r.json());
    } catch {
      /* backend off */
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setData(null);
    setError("");
  };

  const classify = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const r = await fetch(`${API}/predict`, { method: "POST", body: form });
      if (!r.ok) throw new Error();
      setData(await r.json());
      loadHistory();
    } catch {
      setError("Something went wrong. Are all servers running?");
    }
    setLoading(false);
  };

  const names = { resnet50: "ResNet50", vit: "ViT" };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif", padding: 16 }}>
      <h1>♻️ Waste Classifier</h1>
      <input type="file" accept="image/*" onChange={onSelect} />
      {preview && (
        <img src={preview} alt="preview" style={{ display: "block", width: 280, margin: "16px 0" }} />
      )}
      <button onClick={classify} disabled={!file || loading}>
        {loading ? "Classifying..." : "Classify"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontWeight: "bold", color: data.agree ? "#2e7d32" : "#e65100" }}>
            {data.agree ? "✅ Dono models ek hi result par agree hain" : "⚠️ Models ke result alag hain"}
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {data.results.map((m) => (
              <div key={m.model} style={{ flex: 1, minWidth: 280, border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
                <h3 style={{ margin: 0 }}>{names[m.model] || m.model}</h3>
                <p style={{ fontSize: 12, color: "#666", margin: "4px 0 12px" }}>
                  Model test accuracy: {(m.test_accuracy * 100).toFixed(2)}% | Macro F1: {m.test_macro_f1}
                </p>
                <h2 style={{ margin: "0 0 8px" }}>
                  {m.label.toUpperCase()} ({(m.confidence * 100).toFixed(1)}%)
                </h2>
                {m.confidence < 0.6 && <p>⚠️ Low confidence</p>}
                {Object.entries(m.probabilities).map(([k, v]) => (
                  <div key={k} style={{ margin: "6px 0", fontSize: 14 }}>
                    {k} ({(v * 100).toFixed(1)}%)
                    <div style={{ background: "#eee", height: 12 }}>
                      <div style={{ width: `${v * 100}%`, background: "#2e7d32", height: 12 }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 40 }}>Recent predictions</h3>
      <ul>
        {history.map((h) => (
          <li key={h._id}>
            {h.filename}:{" "}
            {h.results
              ? h.results.map((m) => `${names[m.model] || m.model}: ${m.label} (${(m.confidence * 100).toFixed(0)}%)`).join(" | ")
              : `${h.label} (${(h.confidence * 100).toFixed(0)}%)`}
          </li>
        ))}
      </ul>
    </div>
  );
}
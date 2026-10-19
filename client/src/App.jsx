import { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  ScanLine, LayoutDashboard, History, Cpu, ImagePlus, Trash2, Recycle, Sparkles,
  CheckCircle2, AlertTriangle, Activity, Layers, Trophy, Target, Wand2,
} from "lucide-react";

const API = "http://localhost:5000/api";
const CLASSES = ["ewaste", "metal", "organic", "plastic"];
const COLORS = { ewaste: "#7a5c99", metal: "#38bdf8", organic: "#4f7d3a", plastic: "#fbbf24" };
const NAMES = { resnet50: "ResNet50", vit: "ViT" };
const MC = { resnet50: "#1f6b45", vit: "#8a4b2a" };
const TIPS = {
  ewaste: "Do not throw it in household trash. Hand it over to an authorized e-waste center or a take-back program, and remove the battery first.",
  metal: "Rinse and dry it, then place it in the dry/metal recycling bin. You can also give it to a scrap dealer.",
  organic: "Put it in the wet waste bin or compost it. Do not wrap it in a plastic bag, as that spoils the compost..",
  plastic: "Clean and dry it, then place it in the dry recycling bin. Check the recycling code (1-7) and keep heavily soiled plastic separate.",
};
const BENCH = {
  resnet50: { acc: 95.99, f1: 0.9611, pc: [0.9779, 0.9568, 0.9661, 0.9436] },
  vit: { acc: 95.18, f1: 0.9531, pc: [0.9755, 0.9415, 0.9631, 0.9321] },
};
const tip = { background: "#fffdf8", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#1d1d1b" };
const bestOf = (r) => r.reduce((a, b) => (b.confidence > a.confidence ? b : a));
const pct = (v, d = 1) => (v * 100).toFixed(d) + "%";

function Count({ to, suffix = "", dec = 0 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s = null, id;
    const f = (t) => {
      if (!s) s = t;
      const p = Math.min((t - s) / 900, 1);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) id = requestAnimationFrame(f);
    };
    id = requestAnimationFrame(f);
    return () => cancelAnimationFrame(id);
  }, [to]);
  return <>{v.toFixed(dec)}{suffix}</>;
}

function Ring({ value, color }) {
  const [p, setP] = useState(0);
  useEffect(() => { const t = setTimeout(() => setP(value), 80); return () => clearTimeout(t); }, [value]);
  const C = 2 * Math.PI * 62;
  return (
    <div className="ring">
      <svg width="150" height="150">
        <circle cx="75" cy="75" r="62" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="11" />
        <circle className="arc" cx="75" cy="75" r="62" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - p)} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div className="num"><div><Count to={value * 100} suffix="%" /><small>CONFIDENCE</small></div></div>
    </div>
  );
}

const Kpi = ({ icon: I, color, label, children, hint }) => (
  <div className="card kpi">
    <div className="ic" style={{ background: color + "22", color }}><I size={22} /></div>
    <div className="lb">{label}</div><div className="v">{children}</div><div className="h">{hint}</div>
  </div>
);

export default function App() {
  const [tab, setTab] = useState("classify");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [filter, setFilter] = useState("all");
  const [online, setOnline] = useState(true);
  const inp = useRef();

  const refresh = async () => {
    try {
      const [h, s] = await Promise.all([fetch(`${API}/history`), fetch(`${API}/stats`)]);
      setHistory(await h.json()); setStats(await s.json()); setOnline(true);
    } catch { setOnline(false); }
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const m = (e) => {
      const c = e.target.closest?.(".card");
      if (c) { const r = c.getBoundingClientRect(); c.style.setProperty("--x", e.clientX - r.left + "px"); c.style.setProperty("--y", e.clientY - r.top + "px"); }
    };
    document.addEventListener("mousemove", m);
    return () => document.removeEventListener("mousemove", m);
  }, []);

  const pick = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f); setPreview(URL.createObjectURL(f)); setData(null); setError("");
  };
  const classify = async () => {
    if (!file) return;
    setLoading(true); setError("");
    try {
      const form = new FormData(); form.append("image", file);
      const r = await fetch(`${API}/predict`, { method: "POST", body: form });
      if (!r.ok) throw new Error();
      setData(await r.json()); refresh();
    } catch { setError("Something went wrong. Are all three servers (ML, Node, React) running?"); }
    setLoading(false);
  };
  const clearHistory = async () => {
    if (!window.confirm("Delete all history?")) return;
    await fetch(`${API}/history`, { method: "DELETE" }); refresh();
  };

  const final = data ? bestOf(data.results) : null;
  const find = (m, k) => data.results.find((x) => x.model === m)?.probabilities[k] * 100 || 0;
  const cmp = data ? CLASSES.map((c) => ({ name: c, ResNet50: +find("resnet50", c).toFixed(1), ViT: +find("vit", c).toFixed(1) })) : [];
  const topClass = stats?.total ? Object.entries(stats.classCounts).sort((a, b) => b[1] - a[1])[0][0] : "-";

  const nav = [["classify", "Classify", ScanLine], ["dashboard", "Dashboard", LayoutDashboard], ["history", "History", History], ["models", "Models", Cpu]];
  const head = {
    classify: ["AI Waste Scanner", "Upload an image and both models will return a result instantly"],
    dashboard: ["Analytics Dashboard", "Live overview of all predictions so far"],
    history: ["Prediction History", "Filter, compare and manage your predictions"],
    models: ["Model Lab", "Benchmark and details of ResNet50 vs ViT"],
  }[tab];

  return (
    <>
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      <div className="app">
        <aside className="side">
          <div className="logo"><i><Recycle size={22} /></i><div><b>Waste_classifier</b><span>Dual-model classifier</span></div></div>
          {nav.map(([k, l, I]) => (
            <button key={k} className={`nav ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}><I size={19} />{l}</button>
          ))}
          <div className="foot"><span className={`dot ${online ? "" : "off"}`} />{online ? "Backend online" : "Backend offline"}</div>
        </aside>

        <main className="main">
          <div className="top"><div><h2>{head[0]}</h2><p>{head[1]}</p></div></div>

          <div className="page" key={tab}>
            {tab === "classify" && (
              <>
                <div className="card">
                  <input ref={inp} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} />
                  {!preview ? (
                    <div className={`drop ${over ? "over" : ""}`} onClick={() => inp.current.click()}
                      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}>
                      <div className="ico"><ImagePlus size={34} /></div>
                      <b>Drag and drop an image here, or click to browse</b><p>JPG / PNG, max 5 MB</p>
                    </div>
                  ) : (
                    <div className="pvwrap">
                      <div className="pv"><img src={preview} alt="preview" />{loading && <div className="scan" />}</div>
                      <div>
                        <h3 style={{ marginBottom: 6 }}>{file.name}</h3>
                        <p className="sub">{(file.size / 1024).toFixed(0)} KB, ready to scan</p>
                        <button className="btn" onClick={classify} disabled={loading}>
                          {loading ? <span className="spin" /> : <Wand2 size={18} />}{loading ? "Analyzing..." : "Classify now"}
                        </button>{" "}
                        <button className="btn ghost" onClick={() => { setPreview(null); setFile(null); setData(null); }}>Change image</button>
                      </div>
                    </div>
                  )}
                  {error && <p className="err">{error}</p>}
                </div>

                {data && final && (
                  <>
                    <div className="card verdict rise">
                      <Ring value={final.confidence} color={COLORS[final.label]} />
                      <div style={{ flex: 1, minWidth: 250 }}>
                        <div className="sub" style={{ margin: 0 }}>FINAL VERDICT</div>
                        <div className="vl" style={{ color: COLORS[final.label], textShadow: `0 0 30px ${COLORS[final.label]}66` }}>{final.label}</div>
                        <span className={`badge ${data.agree ? "ok" : "warn"}`}>
                          {data.agree ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                          {data.agree ? "Dono models agree" : `${NAMES[final.model]} has higher confidence`}
                        </span>
                        {final.confidence < 0.6 && <span className="badge warn"><AlertTriangle size={14} />Low confidence</span>}
                        <div className="tip"><b>What to do:  </b>{TIPS[final.label]}</div>
                      </div>
                    </div>

                    <div className="grid stag">
                      {data.results.map((m) => (
                        <div className="card" key={m.model}>
                          <h3>{NAMES[m.model]}<span className="pill">Test acc {(m.test_accuracy * 100).toFixed(2)}%</span></h3>
                          <p className="sub">Macro F1 {m.test_macro_f1}</p>
                          <div className="ml" style={{ color: COLORS[m.label] }}>{m.label} · {pct(m.confidence)}</div>
                          {CLASSES.map((c) => (
                            <div className="bar" key={c}>
                              <div className="t"><span>{c}</span><span>{pct(m.probabilities[c])}</span></div>
                              <div className="track"><div className="fill" style={{ width: `${m.probabilities[c] * 100}%`, background: COLORS[c] }} /></div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="card" style={{ marginTop: 18 }}>
                      <h3>Model comparison</h3><p className="sub">Class-wise probability for this image (%)</p>
                      <div style={{ height: 270 }}>
                        <ResponsiveContainer>
                          <BarChart data={cmp}>
                            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                            <XAxis dataKey="name" stroke="#6b675c" /><YAxis stroke="#8793b3" unit="%" />
                            <Tooltip contentStyle={tip} cursor={{ fill: "rgba(255,255,255,.05)" }} /><Legend />
                            <Bar dataKey="ResNet50" fill={MC.resnet50} radius={[8, 8, 0, 0]} />
                            <Bar dataKey="ViT" fill={MC.vit} radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {tab === "dashboard" && (
              <>
                <div className="kpis stag">
                  <Kpi icon={Activity} color="#34d399" label="Total predictions" hint="saved in MongoDB"><Count to={stats?.total || 0} /></Kpi>
                  <Kpi icon={Target} color="#3d6f8e" label="Models agree" hint="ResNet50 = ViT"><Count to={(stats?.agreeRate || 0) * 100} suffix="%" /></Kpi>
                  <Kpi icon={Trophy} color="#b8862b" label="Best model" hint={`${BENCH.resnet50.acc}% test accuracy`}>ResNet50</Kpi>
                  <Kpi icon={Layers} color={COLORS[topClass] || "#7a5c99"} label="Top class" hint="most frequently detected"><span style={{ textTransform: "capitalize" }}>{topClass}</span></Kpi>
                </div>
                <div className="grid">
                  <div className="card"><h3>Class distribution</h3><p className="sub">Based on the final verdict</p>
                    <div style={{ height: 270 }}><ResponsiveContainer><PieChart>
                      <Pie data={CLASSES.map((c) => ({ name: c, value: stats?.classCounts?.[c] || 0 }))} dataKey="value" innerRadius={65} outerRadius={100} paddingAngle={4} stroke="none">
                        {CLASSES.map((c) => <Cell key={c} fill={COLORS[c]} />)}
                      </Pie><Tooltip contentStyle={tip} /><Legend /></PieChart></ResponsiveContainer></div></div>
                  <div className="card"><h3>Average confidence</h3><p className="sub">Average confidence of each model so far</p>
                    <div style={{ height: 270 }}><ResponsiveContainer>
                      <BarChart data={Object.keys(NAMES).map((k) => ({ name: NAMES[k], value: +((stats?.avgConf?.[k] || 0) * 100).toFixed(1) }))}>
                        <CartesianGrid stroke="rgba(0,0,0,.08)" vertical={false} />
                        <XAxis dataKey="name" stroke="#8793b3" /><YAxis stroke="#8793b3" domain={[0, 100]} unit="%" />
                        <Tooltip contentStyle={tip} cursor={{ fill: "rgba(0,0,0,.05)" }} />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]}>{Object.keys(NAMES).map((k) => <Cell key={k} fill={MC[k]} />)}</Bar>
                      </BarChart></ResponsiveContainer></div></div>
                  <div className="card"><h3>Activity, last 7 days</h3><p className="sub">Predictions made per day</p>
                    <div style={{ height: 270 }}><ResponsiveContainer>
                      <AreaChart data={stats?.timeline || []}>
                        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.6} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                        <XAxis dataKey="date" stroke="#8793b3" /><YAxis stroke="#8793b3" allowDecimals={false} />
                        <Tooltip contentStyle={tip} />
                        <Area type="monotone" dataKey="count" stroke="#34d399" strokeWidth={3} fill="url(#g)" />
                      </AreaChart></ResponsiveContainer></div></div>
                  <div className="card"><h3>Per-class F1 radar</h3><p className="sub">Results on 1,473 test images</p>
                    <div style={{ height: 270 }}><ResponsiveContainer>
                      <RadarChart data={CLASSES.map((c, i) => ({ c, ResNet50: BENCH.resnet50.pc[i], ViT: BENCH.vit.pc[i] }))}>
                        <PolarGrid stroke="rgba(0,0,0,.15)" /><PolarAngleAxis dataKey="c" stroke="#8793b3" />
                        <Radar dataKey="ResNet50" stroke={MC.resnet50} fill={MC.resnet50} fillOpacity={0.3} />
                        <Radar dataKey="ViT" stroke={MC.vit} fill={MC.vit} fillOpacity={0.25} />
                        <Legend /><Tooltip contentStyle={tip} /></RadarChart></ResponsiveContainer></div></div>
                </div>
              </>
            )}

            {tab === "history" && (
              <div className="card">
                <div className="filters">
                  {["all", ...CLASSES].map((f) => <button key={f} className={`f ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}
                  <span style={{ flex: 1 }} />
                  <button className="btn ghost" onClick={clearHistory}><Trash2 size={16} />Clear</button>
                </div>
                <div className="scroll"><table>
                  <thead><tr><th>File</th><th>Final</th><th>Confidence</th><th>ResNet50</th><th>ViT</th><th>Agree</th><th>Time</th></tr></thead>
                  <tbody>
                    {history.filter((h) => filter === "all" || bestOf(h.results).label === filter).map((h, i) => {
                      const f = bestOf(h.results);
                      const r = h.results.find((m) => m.model === "resnet50");
                      const v = h.results.find((m) => m.model === "vit");
                      return (
                        <tr key={h._id} style={{ animationDelay: `${i * 35}ms` }}>
                          <td>{h.filename}</td>
                          <td><span className="chip" style={{ background: COLORS[f.label] }}>{f.label}</span></td>
                          <td>{pct(f.confidence, 0)}</td>
                          <td>{r ? `${r.label} ${pct(r.confidence, 0)}` : "-"}</td>
                          <td>{v ? `${v.label} ${pct(v.confidence, 0)}` : "-"}</td>
                          <td>{h.agree ? "✅" : "⚠️"}</td>
                          <td style={{ color: "#8793b3" }}>{new Date(h.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody></table>
                  {history.length === 0 && <div className="empty">No predictions yet. Upload an image from the Classify tab.</div>}
                </div>
              </div>
            )}

            {tab === "models" && (
              <div className="grid stag">
                {Object.keys(NAMES).map((k) => (
                  <div className="card" key={k}>
                    <h3>{NAMES[k]}<span className="pill">{k === "vit" ? "Transformer" : "CNN"}</span></h3>
                    <p className="sub">{k === "vit" ? "ViT-Base, patch 16, 224x224" : "ResNet50, ImageNet pretrained, 224x224"}</p>
                    <div className="mrow"><i style={{ background: MC[k] + "22", color: MC[k] }}><Trophy size={18} /></i><div><b><Count to={BENCH[k].acc} dec={2} suffix="%" /></b><span>Test accuracy</span></div></div>
                    <div className="mrow"><i style={{ background: MC[k] + "22", color: MC[k] }}><Sparkles size={18} /></i><div><b>{BENCH[k].f1}</b><span>Macro F1</span></div></div>
                    {CLASSES.map((c, i) => (
                      <div className="bar" key={c}>
                        <div className="t"><span>{c} F1</span><span>{BENCH[k].pc[i]}</span></div>
                        <div className="track"><div className="fill" style={{ width: `${BENCH[k].pc[i] * 100}%`, background: COLORS[c] }} /></div>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="card" style={{ gridColumn: "1 / -1" }}>
                  <h3>How is the final verdict decided?</h3>
                  <p className="sub">Both models predict independently, and the one with higher confidence becomes the final result. If both agree, the result is more reliable.</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
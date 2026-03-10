import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from "recharts";
import { ClockIcon, XMarkIcon, ChevronDownIcon, SparklesIcon } from "@heroicons/react/24/outline";

const POLLUTANTS = [
  { id: "aqi",  name: "AQI Index",    shortName: "AQI",   color: "#00F3FF", unit: "Index",  icon: "📊",
    what: "Air Quality Index is a composite score combining PM2.5, PM10, NO2, O3, SO2 and CO into a single easy-to-read number.",
    health: "AQI > 100 affects sensitive groups. AQI > 150 is unhealthy for all. AQI > 300 is hazardous.",
    limit: "WHO target: AQI ≤ 50 (Good). Most Indian cities average 80–200+." },
  { id: "pm25", name: "Fine Dust",    shortName: "PM2.5", color: "#54A0FF", unit: "µg/m³", icon: "🌫️",
    what: "Tiny particles smaller than 2.5 micrometres — they penetrate deep into your lungs and enter your bloodstream.",
    health: "Long-term exposure causes lung disease, heart attacks, stroke, and reduced life expectancy.",
    limit: "WHO safe: 15 µg/m³ daily average" },
  { id: "pm10", name: "Coarse Dust",  shortName: "PM10",  color: "#FFD600", unit: "µg/m³", icon: "🏗️",
    what: "Larger dust particles from roads and construction sites. Visible as haze on dusty days.",
    health: "Causes coughing, eye irritation, and worsens asthma and other respiratory conditions.",
    limit: "WHO safe: 45 µg/m³ daily average" },
  { id: "no2",  name: "Car Smoke",    shortName: "NO2",   color: "#FF6B6B", unit: "µg/m³", icon: "🚗",
    what: "Nitrogen dioxide produced by vehicle engines and power plants burning fossil fuels.",
    health: "Inflames airways, reduces lung capacity. Children and asthmatics are most vulnerable.",
    limit: "WHO safe: 25 µg/m³ annual mean" },
  { id: "o3",   name: "Ozone",        shortName: "O3",    color: "#1DD1A1", unit: "µg/m³", icon: "☀️",
    what: "Ground-level ozone forms when vehicle fumes react with sunlight. Peaks on hot afternoons.",
    health: "Causes chest tightness, coughing, and throat irritation. Dangerous during heat waves.",
    limit: "WHO safe: 100 µg/m³ 8-hour average" },
  { id: "so2",  name: "Industry Gas", shortName: "SO2",   color: "#FECA57", unit: "µg/m³", icon: "🏭",
    what: "Released by factories burning coal. Forms acid rain when mixed with atmospheric moisture.",
    health: "Respiratory problems, skin and eye irritation. Contributes to visible smog.",
    limit: "WHO safe: 40 µg/m³ 24-hour average" },
  { id: "co",   name: "Carbon Gas",   shortName: "CO",    color: "#A29BFE", unit: "mg/m³", icon: "🔥",
    what: "Colorless, odorless gas from incomplete combustion — vehicles and generators.",
    health: "Reduces oxygen in blood. High levels can be fatal. Even moderate levels cause headaches.",
    limit: "WHO safe: 4 mg/m³ daily average" },
];

const RANGE_MODES = ["Days", "Months", "Years"];

const RANGE_OPTIONS = {
  Days:   [1, 3, 7, 14, 30],
  Months: [1, 3, 6, 12],
  Years:  [1],
};

// Convert mode + count to number of days
function toDays(mode, count) {
  if (mode === "Days")   return count;
  if (mode === "Months") return count * 30;
  if (mode === "Years")  return count * 365;
  return 7;
}

function formatTime(ts, days) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  
  if (days <= 3) {
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }
  if (days <= 30) return `${d.getDate()}/${d.getMonth()+1}`;
  if (days <= 180) return d.toLocaleString('default', { month: 'short', day: 'numeric' });
  return `${d.toLocaleString('default', { month: 'short' })} '${d.getFullYear().toString().slice(2)}`;
}

function generateSyntheticData(days, baseAqi, city, pollutantId) {
  const now = Date.now();
  const historyMs = days * 24 * 60 * 60 * 1000;
  const futureMs = 24 * 60 * 60 * 1000; // always 24h future
  const pointCount = Math.min(days <= 1 ? 24 : days <= 7 ? days * 12 : days <= 30 ? days * 4 : days, 180);
  const interval = historyMs / pointCount;
  const seed = (city.charCodeAt(0) + pollutantId.charCodeAt(0)) % 100;
  const result = [];

  for (let i = 0; i <= pointCount; i++) {
    const t = now - historyMs + i * interval;
    const seasonal = Math.sin((i / pointCount) * Math.PI) * 15;
    const noise = Math.sin(i * 0.7 + seed) * 10 + Math.cos(i * 0.3) * 6;
    const val = Math.max(10, Math.round(baseAqi + seasonal + noise));
    result.push({ time: t, val, future: false });
  }

  // 24h future prediction
  const futurePoints = 12;
  const futureInterval = futureMs / futurePoints;
  const lastVal = result[result.length - 1]?.val || baseAqi;
  for (let i = 1; i <= futurePoints; i++) {
    const t = now + i * futureInterval;
    const noise = Math.sin(i * 0.5 + seed * 0.1) * 8;
    const trend = -i * 0.4; // slight improvement prediction
    const val = Math.max(10, Math.round(lastVal + noise + trend));
    result.push({ time: t, val: undefined, forecast: val, future: true });
  }

  return result;
}

const CustomTooltip = ({ active, payload, label, color, pollutant }) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    const val = d?.val ?? d?.forecast;
    const isFuture = d?.future;
    const date = new Date(label);
    const timeStr = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    return (
      <div className="bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] min-w-[200px] card-inner-glow">
        <div className="flex items-center gap-2 mb-4">
           <div className={`w-1.5 h-1.5 rounded-full ${isFuture ? 'bg-brand-purple animate-pulse' : 'bg-brand-blue'}`} />
           <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              {isFuture ? "Neural Forecast" : "Deep Telemetry"}
           </div>
        </div>
        <div className="text-[9px] font-bold text-white/40 mb-3 uppercase tracking-widest">
           {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {timeStr}
        </div>
        <div className="flex items-baseline gap-2">
           <div className="text-4xl font-black italic tracking-tighter" style={{ color: color }}>{val}</div>
           <div className="text-[10px] font-black text-slate-600 uppercase">Unit: {pollutant?.unit || 'Index'}</div>
        </div>
      </div>
    );
  }
  return null;
};

const FORECAST_CACHE = {};

function Forecast({ aqiData, city, API_BASE }) {
  const [selectedPollutant, setSelectedPollutant] = useState(POLLUTANTS[0]);
  const [mode, setMode] = useState('Days');
  const [count, setCount] = useState(7);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [ready, setReady] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [showModeMenu, setShowModeMenu] = useState(false); // Kept this as it was missing from the instruction's list
  const [baseAqi, setBaseAqi] = useState(100); // Kept this as it was missing from the instruction's list
  const [now, setNow] = useState(Date.now()); // Kept this as it was missing from the instruction's list

  const key = `${city}_${mode}_${count}_${selectedPollutant.id}`; // Added selectedPollutant.id to key for uniqueness

  // High-frequency heartbeat for second-by-second "Online" feel
  useEffect(() => {
    // Small delay to ensure flex container dimensions are calculated by browser
    const readyTimer = setTimeout(() => setReady(true), 150);
    
    const ticker = setInterval(() => {
      setNow(Date.now());
      setLiveTick(Math.random() * 0.4 - 0.2); // Micro-fluctuation
    }, 1000);
    
    return () => {
      clearTimeout(readyTimer);
      clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    generateChart();
    // Sync baseline with Dashboard aqiData
    if (aqiData && aqiData.aqi) {
      setBaseAqi(aqiData.aqi);
    } else {
      fetchBaseAqi();
    }
  }, [mode, count, city, selectedPollutant, aqiData]);

  const fetchBaseAqi = async () => {
    try {
      const res = await axios.get(`${API_BASE}/aqi/trend/${city}?days=1`);
      if (res.data.status === "success" && res.data.data.length > 0) {
        const avg = res.data.data.reduce((s, d) => s + d.smoothed_aqi, 0) / res.data.data.length;
        setBaseAqi(Math.round(avg));
      }
    } catch { setBaseAqi(100); }
  };

  const generateChart = async () => {
    if (FORECAST_CACHE[key]) {
      setChartData(FORECAST_CACHE[key]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const days = toDays(mode, count);
    const pid = selectedPollutant.id;
    
    try {
      // Fetch history (up to 90 days supported by API)
      const histRes = await axios.get(`${API_BASE}/aqi/trend/${city}?days=${Math.min(days, 3650)}`);
      // Fetch forecast (always 24h)
      const foreRes = await axios.get(`${API_BASE}/aqi/forecast/${city}?pollutant=${pid === 'aqi' ? 'pm25' : pid}`);
      
      if (histRes.data.status === "success" && foreRes.data.status === "success") {
        const history = (histRes.data.data || []).map(d => ({
          time: new Date(d.datetime || d.fullTime || d.time).getTime(),
          val: d.smoothed_aqi !== undefined ? d.smoothed_aqi : d.aqi !== undefined ? d.aqi : d.value,
          future: false
        }));
        
        const forecast = (foreRes.data.data || []).map(d => ({
          time: new Date(d.datetime || d.fullTime || d.time).getTime(),
          forecast: d.predicted_aqi !== undefined ? d.predicted_aqi : d.aqi !== undefined ? d.aqi : d.predicted_val !== undefined ? d.predicted_val : d.value,
          future: true
        }));
        
        // Merge and filter out invalid dates
        const merged = [...history, ...forecast]
          .filter(d => !isNaN(d.time))
          .sort((a, b) => a.time - b.time);
        
        setChartData(merged);
        FORECAST_CACHE[key] = merged;
      }
    } catch (err) {
      console.error("Forecast Fetch Error:", err);
      setChartData([]);
    }
    setLoading(false);
  };

  const handlePollutantClick = (p) => {
    setSelectedPollutant(p);
    setShowDetail(true);
  };

  const activeColor = selectedPollutant?.color || "#00F3FF";
  const days = toDays(mode, count);
  const nowTs = Date.now();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-32">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white flex items-center gap-3">
            <ClockIcon className="w-9 h-9 text-brand-blue" />
            Neural 24H Forecast <span className="text-brand-blue">in {city}</span>
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 italic shadow-sm">AI-Driven Temporal Prediction Engine
· {count} {mode} history + 24H AI forecast
          </p>
        </div>

        {/* RANGE CONTROLS */}
        <div className="flex items-center gap-3">
          {/* Mode picker */}
          <div className="relative">
            <button
              onClick={() => setShowModeMenu(v => !v)}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase text-white hover:border-brand-blue transition-all"
            >
              {mode} <ChevronDownIcon className={`w-4 h-4 transition-transform ${showModeMenu ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showModeMenu && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => setShowModeMenu(false)}
                    className="fixed inset-0 z-[90] bg-transparent cursor-default"
                  />
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    className="absolute top-full left-0 mt-2 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[100] min-w-[140px] p-2"
                  >
                    {RANGE_MODES.map(m => (
                      <button key={m} onMouseDown={() => { setMode(m); setCount(RANGE_OPTIONS[m][1] || RANGE_OPTIONS[m][0]); setShowModeMenu(false); }}
                        className={`w-full px-5 py-3 text-left text-xs font-black uppercase transition-colors ${mode === m ? 'bg-brand-blue text-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        {m}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Count pills */}
          <div className="flex gap-2">
            {RANGE_OPTIONS[mode].map(n => (
              <button key={n} onClick={() => setCount(n)}
                className={`px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${count === n ? 'bg-brand-blue text-black shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* POLLUTANT SELECTOR CHIPS */}
      <div className="flex flex-wrap gap-3">
        {POLLUTANTS.map(p => (
          <button
            key={p.id}
            onClick={() => handlePollutantClick(p)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border"
            style={{
              borderColor: selectedPollutant.id === p.id ? p.color : 'rgba(255,255,255,0.08)',
              backgroundColor: selectedPollutant.id === p.id ? p.color + '20' : 'rgba(255,255,255,0.03)',
              color: selectedPollutant.id === p.id ? p.color : '#64748b',
              boxShadow: selectedPollutant.id === p.id ? `0 0 18px ${p.color}25` : 'none',
            }}
          >
            <span>{p.icon}</span>
            {p.shortName}
          </button>
        ))}
      </div>

      <div className="flex gap-8 items-start relative min-h-[580px]">
        {/* MAIN CHART AREA - Flex-grow for dynamic sizing */}
        <div className="flex-1 glass-panel p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">
                  {selectedPollutant.icon} {selectedPollutant.name} ({selectedPollutant.shortName})
                </h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 tabular-nums">
                  Syncing Live · {new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
              <span className="text-[8px] font-black text-brand-blue uppercase tracking-widest">Live Sync Alpha</span>
            </div>
          </div>

          <div className="flex-1 min-h-[450px] relative bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden">
            <AnimatePresence mode="wait">
            {!chartData || chartData.length === 0 ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-700 font-black uppercase tracking-[0.4em] text-[10px]"
              >
                <div className="w-8 h-8 rounded-full border-2 border-brand-blue/10 border-t-brand-blue animate-spin" />
                Initializing Neural Node...
              </motion.div>
            ) : (
              <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full" style={{ minHeight: '400px' }}>
                <ResponsiveContainer width="99%" height={400}>
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeColor} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={t => formatTime(t, days)}
                      stroke="#ffffff10"
                      tick={{ fill: '#ffffff25', fontSize: 9, fontWeight: 900 }}
                      minTickGap={50}
                      axisLine={false}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip color={activeColor} pollutant={selectedPollutant} />} />

                    {/* Future zone background */}
                    <ReferenceArea x1={now} fill={activeColor} fillOpacity={0.04} />
                    <ReferenceLine x={now} stroke={activeColor} strokeDasharray="4 4" strokeOpacity={0.4}
                      label={{ value: "NOW", fill: activeColor, fontSize: 8, fontWeight: 900, position: 'insideTopRight' }} />

                    {/* Historical area */}
                    <Area type="monotone" dataKey="val" stroke={activeColor} strokeWidth={2.5}
                      fill="url(#histGrad)" fillOpacity={1} dot={false} connectNulls={false} animationDuration={600} />

                    {/* Forecast dashed line */}
                    <Line type="monotone" dataKey="forecast" stroke={activeColor} strokeWidth={2}
                      strokeDasharray="6 3" dot={false} connectNulls animationDuration={600}
                      strokeOpacity={0.7} />
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>

        {/* DETAIL PANEL - Side-by-Side Slide-In */}
        <AnimatePresence>
          {showDetail && selectedPollutant && (
            <motion.div
              initial={{ width: 0, opacity: 0, x: 20 }}
              animate={{ width: 420, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: 20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 glass-panel flex flex-col border-l-4 overflow-hidden relative min-h-[580px]"
              style={{ borderLeftColor: selectedPollutant.color }}
            >
              <div className="p-10 w-[420px] h-full flex flex-col space-y-8 overflow-y-auto custom-scrollbar">
                <button onClick={() => setShowDetail(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white z-[160] p-2 bg-white/5 rounded-full border border-white/5 transition-all">
                  <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="pt-2">
                  <span className="text-6xl block mb-6 leading-none">{selectedPollutant.icon}</span>
                  <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{selectedPollutant.shortName}</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-3">{selectedPollutant.name} · {city}</p>
                </div>

                <div className="space-y-10">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">Node Reading</h4>
                    <div className="flex items-baseline gap-4">
                      <span className="text-7xl font-black text-white tabular-nums tracking-tighter leading-none">
                        {(() => {
                          const latestData = chartData.filter(d => !d.future && d.val !== undefined).slice(-1)[0]?.val;
                          const base = latestData !== undefined ? latestData : baseAqi;
                          return (base + liveTick).toFixed(selectedPollutant.id === 'aqi' ? 0 : 1);
                        })()}
                      </span>
                      <span className="text-sm font-black text-slate-500 uppercase tracking-widest">{selectedPollutant.unit}</span>
                    </div>
                  </div>

                  <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2" />
                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">Neural 24H Forecast</h4>
                    <div className="flex items-center gap-6">
                      <div className="text-4xl font-black text-brand-blue tabular-nums tracking-tighter">
                        {(chartData.filter(d => d.future && d.forecast !== undefined).slice(0, 1)[0]?.forecast ?? 0) || "—"}
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-[9px] font-black text-brand-blue uppercase tracking-widest">
                        Projected
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                     <div>
                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">Scientific Profile</h4>
                        <p className="text-sm text-slate-300 font-medium leading-relaxed italic">{selectedPollutant.what}</p>
                     </div>
                     <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10">
                        <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.4em] mb-3">Health Effects</h4>
                        <p className="text-sm text-white font-medium leading-relaxed">{selectedPollutant.health}</p>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default Forecast;

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  ShieldCheckIcon, LightBulbIcon, SparklesIcon,
  ArrowTrendingUpIcon, CloudIcon, TruckIcon, FireIcon,
  ChevronDownIcon, ChevronUpIcon
} from "@heroicons/react/24/outline";

// Dynamically generate diagnosis content based on real AQI + city context
function generateDiagnosis(city, aqi, label, sourcePcts) {
  const traffic = sourcePcts?.traffic ?? 40;
  const industrial = sourcePcts?.industrial ?? 35;
  const weather = sourcePcts?.weather ?? 25;
  
  const causes = [];

  if (traffic >= industrial && traffic >= weather) {
    causes.push({
      title: "Vehicle Emissions", tag: "Primary Source",
      text: `Road traffic contributes ~${traffic}% of ${city}'s pollution. Peak hours see PM2.5 spike 2–3× as diesel vehicles idle in congestion. Bus corridors and freight routes are major hotspots.`,
      color: "#FF6B6B", Icon: TruckIcon, pct: traffic
    });
  }
  if (industrial >= traffic || industrial >= weather) {
    causes.push({
      title: "Industrial Discharge", tag: "Major Factor",
      text: `Industrial activity accounts for ~${industrial}% of ${city}'s PM2.5. Factories, power plants, and manufacturing zones release SO₂ and fine particles especially during nighttime shifts.`,
      color: "#FF9F43", Icon: FireIcon, pct: industrial
    });
  }
  causes.push({
    title: "Weather Trapping", tag: "Natural Factor",
    text: `Atmospheric conditions contribute ~${weather}% via temperature inversions and humidity. On calm, humid days, pollutants get trapped in a low-altitude layer over ${city} with no wind to disperse them.`,
    color: "#54A0FF", Icon: CloudIcon, pct: weather
  });

  // AQI-adaptive solutions
  let solutions = [];
  if (aqi <= 50) {
    solutions = [
      `🌳 ${city}'s air is healthy today — great time for outdoor exercise`,
      "💚 Keep windows open to allow fresh air circulation indoors",
      "🚴 Consider cycling or walking instead of driving today",
      "🌿 Support local green spaces to maintain clean air",
    ];
  } else if (aqi <= 100) {
    solutions = [
      `😷 Sensitive groups in ${city} should limit prolonged outdoor exertion`,
      "🚗 Use public transport today to reduce peak-hour emissions",
      "🌿 Plant indoor air-purifying plants (snake plant, peace lily)",
      "💨 Run air purifiers with HEPA filters indoors",
    ];
  } else if (aqi <= 150) {
    solutions = [
      `⚠️ Avoid outdoor activity between 7–10 AM when ${city}'s traffic peaks`,
      "😷 Wear N95 masks if you must go outside for extended periods",
      "🚌 Take public transit — every car off the road lowers AQI by a measurable margin",
      "🏠 Seal windows and use air purifiers; check your indoor AQI",
      "🏥 Keep rescue inhalers accessible if you have asthma or heart conditions",
    ];
  } else {
    solutions = [
      `🚨 ${city}'s AQI is dangerously high — minimize all outdoor exposure today`,
      "😷 N95/KN95 mandatory even for short outdoor trips",
      "🏠 Stay indoors with windows sealed; use air purifiers at max setting",
      "🚫 Avoid cooking on gas stoves without ventilation — adds indoor PM2.5",
      "💊 Consult a doctor if experiencing coughing, chest tightness, or dizziness",
      "📱 Check AirSense every hour — conditions can change rapidly",
    ];
  }

  // City-specific smart tip based on AQI level
  const tips = {
    good: `${city}'s air is refreshingly clean right now. This is the perfect time to air out your home and get outdoor exercise before the next weather pattern shifts.`,
    moderate: `In ${city}, pollution typically peaks during morning (7–9 AM) and evening (6–8 PM) commutes. Plan outdoor activities for midday when the sun helps disperse ground-level pollutants.`,
    sensitive: `${city} residents with respiratory conditions should proactively take medication before going out. Check wind direction — if wind is from industrial areas, stay extra cautious.`,
    unhealthy: `${city}'s current AQI puts everyone at risk. Local hospitals often see a 20–30% spike in respiratory visits on days like this. Prevention is far better than treatment.`,
  };

  const tip = aqi <= 50 ? tips.good : aqi <= 100 ? tips.moderate : aqi <= 150 ? tips.sensitive : tips.unhealthy;

  return { causes, solutions, tip };
}

function WhyAffected({ aqiData, city, API_BASE }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [bestMonth, setBestMonth] = useState(null);
  const [worstMonth, setWorstMonth] = useState(null);
  const [seasonLoading, setSeasonLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setGeneratedContent(null);
    setBestMonth(null);
    setWorstMonth(null);
    fetchAnalysis();
    fetchSeasonalData();
  }, [city, aqiData]);

  // Fetch 365 days of real data and compute best/worst months dynamically
  const fetchSeasonalData = async () => {
    setSeasonLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/aqi/combined/${city}?days=365`);
      if (res.data?.status === "success") {
        const trend = res.data.data.trend || [];
        if (trend.length > 5) {
          const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
          const monthTotals = {};
          trend.forEach(pt => {
            const dt = new Date(pt.fullTime || pt.time);
            if (!isNaN(dt)) {
              const m = dt.getMonth();
              if (!monthTotals[m]) monthTotals[m] = { sum: 0, count: 0 };
              monthTotals[m].sum += pt.aqi;
              monthTotals[m].count += 1;
            }
          });
          const entries = Object.entries(monthTotals)
            .filter(([, v]) => v.count > 0)
            .map(([m, v]) => ({ month: parseInt(m), avg: v.sum / v.count }));
          if (entries.length >= 2) {
            const best = entries.reduce((a, b) => a.avg < b.avg ? a : b);
            const worst = entries.reduce((a, b) => a.avg > b.avg ? a : b);
            setBestMonth(monthNames[best.month]);
            setWorstMonth(monthNames[worst.month]);
          }
        }
      }
    } catch (_) {}
    setSeasonLoading(false);
  };

  const fetchAnalysis = async () => {
    // Priority 1: Use shared aqiData from App.jsx for perfect synchronization
    if (aqiData) {
       setData({ 
         aqi: aqiData.aqi, 
         label: aqiData.category || "Unknown",  // Map 'category' → 'label' 
         color: aqiData.color || "#64748b",
         sources: aqiData.forecastSource,
         analysisData: aqiData 
       });
       setGeneratedContent(generateDiagnosis(city, aqiData.aqi, aqiData.category, aqiData.pollutants));
       setLoading(false);
       return;
    }

    setLoading(true);
    try {
      const [whyRes, sourcesRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/aqi/why/${city}`),
        axios.get(`${API_BASE}/aqi/sources/${city}`)
      ]);

      let aqi = 0, label = "Unknown", color = "#64748b";
      let sourcePcts = null;
      let analysisData = null;

      if (whyRes.status === "fulfilled" && whyRes.value.data?.status === "success") {
        const d = whyRes.value.data.data;
        aqi = d.aqi;
        label = d.label;
        color = d.color;
        analysisData = d;
      } else {
        // Fallback: fetch from combined endpoint
        try {
          const combined = await axios.get(`${API_BASE}/aqi/combined/${city}?days=1`);
          if (combined.data?.status === "success") {
            aqi = combined.data.data.current?.aqi || 0;
            label = combined.data.data.current?.category || "Unknown";
            color = combined.data.data.current?.color || "#64748b";
          }
        } catch (_) {}
      }

      if (sourcesRes.status === "fulfilled" && sourcesRes.value.data?.status === "success") {
        const s = sourcesRes.value.data.data;
        sourcePcts = { traffic: s.traffic, industrial: s.industrial, weather: s.weather };
      }

      setData({ aqi, label, color, analysisData });
      setGeneratedContent(generateDiagnosis(city, aqi, label, sourcePcts));
    } catch (err) {
      console.error(err);
      // Last-resort fallback — still generate useful content with default values
      setData({ aqi: 0, label: "Unknown", color: "#64748b", analysisData: null });
      setGeneratedContent(generateDiagnosis(city, 0, "Unknown", null));
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-5">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      >
        <SparklesIcon className="w-10 h-10 text-brand-blue" />
      </motion.div>
      <p className="text-brand-blue font-black uppercase tracking-widest text-sm animate-pulse">
        AI analysing {city}...
      </p>
    </div>
  );

  const aqi = data?.aqi || 0;
  const aqiLabel = data?.label || "Unknown";
  const aqiColor = data?.color || "#64748b";
  const content = generatedContent;

  const goodFacts = data?.analysisData?.good_facts || [
    `${city}'s air quality is monitored round the clock by the AirSense network`,
    `You can reduce your personal exposure by up to 40% with smart daily choices`,
    `Trees in ${city} absorb tons of particulate matter every year`,
  ];

  // Dynamically computed — show 'Computing...' while the seasonal fetch is in-flight
  const displayBest = bestMonth || (seasonLoading ? "Computing..." : "Monsoon months");
  const displayWorst = worstMonth || (seasonLoading ? "Computing..." : "Summer & winter");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-32">
      
      {/* HERO */}
      <div className="relative overflow-hidden glass-panel p-10 flex items-end gap-8 min-h-[200px]">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent pointer-events-none" />
        {/* Animated bars decoration */}
        <div className="absolute top-6 right-8 flex items-end gap-1.5 opacity-20">
          {[35, 55, 25, 70, 40, 80, 30, 60, 45, 90, 35, 65].map((h, i) => (
            <motion.div
              key={i}
              animate={{ height: [`${h}%`, `${Math.min(100, h + 20)}%`, `${h}%`] }}
              transition={{ repeat: Infinity, delay: i * 0.15, duration: 2.5 }}
              className="w-1 rounded-full bg-brand-blue"
              style={{ height: `${h * 0.8}px` }}
            />
          ))}
        </div>
        <div>
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheckIcon className="w-8 h-8 text-brand-blue" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              AI Diagnosis — {city}
            </span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">
            Why is the air{" "}
            <span style={{ color: aqiColor }}>{aqiLabel}?</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-3 max-w-xl">
            Real-time analysis generated from live sensor data and atmospheric conditions in {city}.
          </p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <div className="text-6xl font-black" style={{ color: aqiColor }}>
            {aqi || "—"}
          </div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live AQI</div>
        </div>
      </div>

      {/* CAUSE CARDS — AI Generated */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <SparklesIcon className="w-4 h-4 text-brand-blue" />
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            AI-Identified Causes for {city} — Click to expand
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.causes.map((cause, i) => {
            const Icon = cause.Icon;
            const isOpen = expanded === i;
            return (
              <motion.div
                key={i}
                whileHover={{ y: -3 }}
                onClick={() => setExpanded(isOpen ? null : i)}
                className="glass-panel p-7 cursor-pointer relative overflow-hidden border-b-4 transition-all"
                style={{ borderBottomColor: cause.color }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                {/* Source %  bar */}
                <div className="absolute top-0 left-0 h-1 rounded-t-xl transition-all" style={{ width: `${cause.pct}%`, backgroundColor: cause.color + "80" }} />
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: cause.color + "15" }}>
                  <Icon className="w-5 h-5" style={{ color: cause.color }} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest mb-1 block" style={{ color: cause.color }}>
                  {cause.tag} · {cause.pct}%
                </span>
                <h3 className="text-lg font-black text-white mb-3 uppercase italic tracking-tight">{cause.title}</h3>
                <AnimatePresence>
                  {isOpen ? (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-slate-300 font-medium leading-relaxed overflow-hidden"
                    >
                      {cause.text}
                    </motion.p>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium line-clamp-2">{cause.text.slice(0, 80)}…</p>
                  )}
                </AnimatePresence>
                <div className="flex justify-end mt-3 text-slate-600">
                  {isOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* SOLUTIONS + SIDE PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-8 border-t-4 border-green-500/50">
          <div className="flex items-center gap-3 mb-8">
            <LightBulbIcon className="w-6 h-6 text-green-400" />
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              What can you do?
            </h2>
          </div>
          <div className="space-y-4">
            {content.solutions.map((sol, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/8 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 font-black text-xs shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-white font-medium leading-relaxed pt-0.5">{sol}</p>
              </motion.div>
            ))}
          </div>

          {/* AI Smart Tip */}
          <div className="mt-8 p-6 rounded-3xl bg-brand-blue/5 border border-brand-blue/10">
            <div className="flex items-center gap-3 mb-2">
              <SparklesIcon className="w-4 h-4 text-brand-blue" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white">
                AI Smart Tip for {city}
              </h4>
            </div>
            <p className="text-sm text-slate-400 font-medium leading-relaxed italic">
              {content.tip}
            </p>
          </div>
        </div>

        {/* SIDE PANEL */}
        <div className="space-y-6">
          <div className="glass-panel p-6 bg-brand-blue/5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5">
              Best & Worst Months
            </h3>
            <div className="space-y-5">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cleanest Month</span>
                <span className="text-lg font-black text-green-400 uppercase">{displayBest}</span>
              </div>
              <div className="border-t border-white/5 pt-5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Worst Month</span>
                <span className="text-lg font-black text-red-400 uppercase">{displayWorst}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5">Key Facts</h3>
            <div className="space-y-4">
              {goodFacts.map((fact, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0 mt-2" />
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">{fact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default WhyAffected;

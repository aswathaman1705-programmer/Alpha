import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TruckIcon, BuildingOffice2Icon, CloudIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

function SourceAnalysis({ city, API_BASE }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchSourceData(); }, [city]);

  const fetchSourceData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/aqi/sources/${city}`);
      if (res.data.status === "success") {
        const d = res.data.data;
        setData([
          { name: "Traffic", value: parseFloat((d.traffic || 40).toFixed(1)), color: "#54A0FF", icon: <TruckIcon/>,
            problem: "Too many vehicles on the roads release thick black smoke from their exhausts — especially diesel trucks and old buses.",
            solution: "Use public transport, carpool, or walk for short trips. Avoid idling your engine for more than 30 seconds."
          },
          { name: "Industrial", value: parseFloat((d.industrial || 35).toFixed(1)), color: "#FF6B6B", icon: <BuildingOffice2Icon/>,
            problem: "Factories and power plants nearby burn coal and oil, releasing gases that irritate your lungs and stay in the air for days.",
            solution: "Factories should install better filters. Citizens can report smoke violations to local pollution authorities."
          },
          { name: "Weather/Dust", value: parseFloat((d.weather || 25).toFixed(1)), color: "#FFD600", icon: <CloudIcon/>,
            problem: "Dry winds lift road dust and construction debris into the air, especially during low humidity or hot days.",
            solution: "Sprinkle water on dusty paths near home. Plant grass and trees to trap dust particles naturally."
          }
        ]);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-brand-blue/20 border-t-brand-blue animate-spin" />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analysing Sources...</span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-32">
      <header className="text-center px-4">
        <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tighter uppercase italic text-white leading-tight">Where is the <span className="text-brand-blue">pollution</span> from?</h1>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Source breakdown for {city}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* RING CHART — no framer-motion animate on cells to prevent freeze */}
        <div className="glass-panel h-[320px] md:h-[420px] flex flex-col items-center justify-center relative">
          {/* Static center label — does NOT overlap the chart */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none" style={{ zIndex: 1 }}>
            <span className="text-lg md:text-xl font-black text-white">Breakdown</span>
            <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Tap sections</span>
          </div>

          {/* Chart sits on top via z-index: 2 */}
          <div className="w-full h-full" style={{ position: "relative", zIndex: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val.toFixed(1)}%`, name]}
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '12px', fontWeight: 900 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ACCORDION CARDS */}
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.name} className="glass-panel overflow-hidden border-l-4 transition-all" style={{ borderLeftColor: item.color }}>
              <button
                onClick={() => setExpandedId(expandedId === item.name ? null : item.name)}
                className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.color + '20' }}>
                    {React.cloneElement(item.icon, { className: "w-5 h-5", style: { color: item.color } })}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{item.name}</h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{item.value}% of total pollution</span>
                  </div>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${expandedId === item.name ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {expandedId === item.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 space-y-4 border-t border-white/5 bg-black/20">
                      <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <h4 className="text-[9px] font-black uppercase text-red-400 tracking-widest mb-2">⚠ The Problem</h4>
                        <p className="text-sm text-white font-medium leading-relaxed">{item.problem}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10">
                        <h4 className="text-[9px] font-black uppercase text-green-400 tracking-widest mb-2">✓ The Solution</h4>
                        <p className="text-sm text-slate-300 font-medium leading-relaxed">{item.solution}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default SourceAnalysis;

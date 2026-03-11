import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { 
  HeartIcon, 
  ShieldCheckIcon, 
  HandThumbUpIcon, 
  PlusIcon,
  MinusIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";

function Accordion({ title, children, color }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="glass-panel overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className={`text-sm font-black uppercase tracking-widest ${color}`}>{title}</span>
        {isOpen ? <MinusIcon className="w-5 h-5 text-slate-500" /> : <PlusIcon className="w-5 h-5 text-slate-500" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }} 
            animate={{ height: "auto" }} 
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 text-slate-400 text-sm font-medium leading-relaxed border-t border-white/5 bg-white/[0.02]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HealthRisks({ aqiData, city, API_BASE }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isThinking, setIsThinking] = useState(true);

  useEffect(() => {
    fetchHealthData();
  }, [city]);

  const fetchHealthData = async () => {
    setIsThinking(true);
    setLoading(true);

    let healthData = null;
    if (aqiData) {
       const val = aqiData.aqi;
       const riskStatus = val <= 50 ? "Minimal Risk" : val <= 100 ? "Caution Advised" : val <= 150 ? "Unhealthy for Sensitive Groups" : val <= 200 ? "Health Warning" : "Hazardous Stagnation";
       
       healthData = {
         aqi: val,
         risk_status: riskStatus,
         effects: {
            short_term: val > 150 ? "Immediate cough and lung irritation." : "Normal atmospheric conditions for most people.",
            long_term: "Prolonged exposure may impact respiratory health."
         },
         risks: {
            respiratory: val > 100 ? ["Increased asthma risk", "Lining inflammation"] : ["No known risks"],
            cardiac: val > 150 ? ["Tightness in chest", "Increased BP"] : ["No known risks"]
         },
         recommendations: ["Use AirSense filtration", "Monitor trend indices"]
       };
    } else {
      try {
        const res = await axios.get(`${API_BASE}/aqi/health/${city}`);
        if (res.data.status === "success") {
          healthData = res.data.data;
        }
      } catch (err) { console.error(err); }
    }

    if (healthData) {
      setData(healthData);
      setLoading(false);
      // Simulate "Thinking" / Neural Analysis
      setTimeout(() => {
        setIsThinking(false);
      }, 1500); 
    } else {
      setLoading(false);
      setIsThinking(false);
    }
  };

  if (loading || isThinking) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-brand-red/10 border-t-brand-red animate-spin" />
        <HeartIcon className="absolute inset-0 m-auto w-6 h-6 text-brand-red animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-brand-red font-black uppercase tracking-[0.4em] text-xs">Neural Health Analysis</p>
        <p className="text-slate-600 font-bold uppercase tracking-widest text-[9px] mt-2 italic">Scanning atmospheric bio-impact for {city}...</p>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-32">
      <header className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 text-center md:text-left">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center border border-brand-red/20 shadow-[0_0_20px_#FF6B6B20]">
           <HeartIcon className="w-7 h-7 md:w-8 md:h-8 text-brand-red" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase italic">Health <span className="text-brand-red">Safety</span></h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Simple Health Advice for {city}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
           <div className="glass-panel p-8 border-l-8 border-brand-red">
               <div className="flex items-center gap-3 mb-4">
                  <ExclamationCircleIcon className="w-5 h-5 text-brand-red" />
                  <span className="text-[10px] font-black uppercase text-brand-red tracking-widest">Current Warning</span>
               </div>
               <h2 className="text-2xl font-black text-white italic uppercase mb-2">{data.risk_status}</h2>
               <p className="text-md text-slate-400 font-bold leading-relaxed">{data.effects.short_term}</p>
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Click to learn more</h3>
              
              <Accordion title="Breathing Effects" color="text-brand-blue">
                 <ul className="space-y-3 list-disc list-inside">
                    {data.risks.respiratory.map((r, i) => <li key={i}>{r}</li>)}
                 </ul>
              </Accordion>

              <Accordion title="Heart Effects" color="text-brand-yellow">
                 <ul className="space-y-3 list-disc list-inside">
                    {data.risks.cardiac.map((r, i) => <li key={i}>{r}</li>)}
                 </ul>
              </Accordion>

              <Accordion title="Long Term Health" color="text-brand-red">
                 <p>{data.effects.long_term}</p>
              </Accordion>
           </div>
        </div>

        {/* DYNAMIC AI RECOMMENDATIONS */}
        <div className="glass-panel p-6 md:p-8 bg-brand-blue/5 border-2 border-brand-blue/10">
            <div className="flex items-center gap-3 mb-8">
               <ShieldCheckIcon className="w-6 h-6 text-brand-blue" />
               <h2 className="text-lg md:text-xl font-black text-white italic uppercase tracking-tighter">Safe Mode for {city}</h2>
            </div>
            
            <div className="space-y-8">
               {(() => {
                  const aqi = data.aqi;
                  const recs = aqi <= 50 ? [
                    { t: "Open Windows", d: `Conditions in ${city} are perfect. Allow high-purity air to circulate throughout your home to naturally detoxify indoor spaces.` },
                    { t: "Maximum Exertion", d: "Great time for cardio or outdoor sports. Your lungs can process oxygen at peak efficiency with zero particulate resistance." },
                    { t: "Deep Breathing", d: "Practice pranayama or deep breathing outdoors. The atmospheric count is at its safest level today." }
                  ] : aqi <= 100 ? [
                    { t: "Selective Outing", d: `Air is moderate. Enjoy ${city}'s parks but stay away from main roads where vehicle exhaust might pool in the heat.` },
                    { t: "Dust Shield", d: "Wipe down indoor surfaces. Small amounts of dust are starting to settle; keep your living area clean to maintain indoor purity." },
                    { t: "Hydration Lock", d: "Drink more fluids. Keeping your throat moist helps your body's natural filters trap the moderate particulates." }
                  ] : aqi <= 150 ? [
                    { t: "Sensitive Guard", d: `Sensitive groups in ${city} should cut outdoor time. If you feel a scratchy throat, return to a filtered environment immediately.` },
                    { t: "N95 Recommended", d: "Standard masks aren't enough. Use a fitting N95 if you need to be outside for more than 30 minutes in these conditions." },
                    { t: "HEPA Activation", d: "Run your air purifiers on medium-high. Seal any cracks in windows to prevent the hazy air from leaking inside." }
                  ] : [
                    { t: "Hazard Warning", d: `Dangerous air levels for all ${city} residents. Stay indoors and avoid all physical activity that increases breathing rate.` },
                    { t: "Respirator Mandatory", d: "Do not step outside without a sealed KN95/N95 respirator. The fine particles are now at levels that can enter the bloodstream." },
                    { t: "Clean Room Protocol", d: "Designate one room with an air purifier on 'Turbo' as a clean zone. Keep the door closed to maintain a breathable micro-climate." }
                  ];

                  return recs.map((r, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center shrink-0 text-brand-blue font-black">{i + 1}</div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white mb-2">{r.t}</h4>
                        <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{r.d}</p>
                      </div>
                    </div>
                  ));
               })()}
            </div>
        </div>
      </div>
    </motion.div>
  );
}

export default HealthRisks;

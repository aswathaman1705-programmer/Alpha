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

  useEffect(() => {
    fetchHealthData();
  }, [city]);

  const fetchHealthData = async () => {
    if (aqiData) {
       // Shared source of truth eliminates mismatch — map to correct risk level
       const val = aqiData.aqi;
       const riskStatus = val <= 50 ? "Minimal Risk" : val <= 100 ? "Caution Advised" : val <= 150 ? "Unhealthy for Sensitive Groups" : val <= 200 ? "Health Warning" : "Hazardous Stagnation";
       
       setData({
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
       });
       setLoading(false);
       return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/aqi/health/${city}`);
      if (res.data.status === "success") {
        setData(res.data.data);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="h-96 flex items-center justify-center text-brand-red font-black uppercase tracking-widest animate-pulse">Checking health risks...</div>;

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

        {/* SUPREME PROTECTION simplified */}
        <div className="glass-panel p-6 md:p-8 bg-brand-blue/5 border-2 border-brand-blue/10">
            <div className="flex items-center gap-3 mb-8">
               <ShieldCheckIcon className="w-6 h-6 text-brand-blue" />
               <h2 className="text-lg md:text-xl font-black text-white italic uppercase tracking-tighter">Safe Mode: Recommendations</h2>
            </div>
            
            <div className="space-y-8">
               <div className="flex gap-6">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center shrink-0 text-brand-blue font-black">1</div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-2">Eat Healthy</h4>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed">Eat fruits like oranges and lemons. They help your body fight the effects of bad air.</p>
                  </div>
               </div>
               <div className="flex gap-6">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center shrink-0 text-brand-blue font-black">2</div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-2">Close Windows</h4>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed">Keep windows closed during early morning (4 AM to 8 AM) when the air is dirtiest.</p>
                  </div>
               </div>
               <div className="flex gap-6">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center shrink-0 text-brand-blue font-black">3</div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-2">Breathe Right</h4>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed">Try to breathe through your nose. Your nose helps filter the dust better than your mouth.</p>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
}

export default HealthRisks;

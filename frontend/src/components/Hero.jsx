import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShieldCheckIcon, GlobeAmericasIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

export default function Hero() {
  return (
    <div className="relative min-h-[70vh] md:min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] md:w-[800px] md:h-[800px] border border-white/5 rounded-full absolute"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] md:w-[1200px] md:h-[1200px] border border-white/[0.02] rounded-full absolute border-dashed"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center max-w-4xl"
      >
        <div className="w-20 h-20 mb-8 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 relative group overflow-hidden shadow-[0_0_50px_rgba(0,243,255,0.15)]">
          <div className="absolute inset-0 bg-brand-blue/30 blur-2xl group-hover:bg-brand-blue/50 transition-colors duration-700" />
          <ShieldCheckIcon className="w-10 h-10 text-brand-blue relative z-10" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-brand-blue/30 bg-brand-blue/[0.03] backdrop-blur-md mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-blue">V1.1_ALPHA System Online</span>
          </div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase italic tracking-tighter text-white leading-[0.9] mb-6 md:mb-10"
        >
          Urban Air Quality <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-white to-brand-blue bg-[length:200%_auto] animate-shimmer">
            Analysis Engine
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="text-slate-400 text-lg md:text-xl font-light max-w-2xl leading-relaxed mb-12 tracking-wide"
        >
          An advanced diagnostic platform for real-time pollution tracking, source attribution, and predictive atmospheric modeling across a global sensor network.
        </motion.p>

        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.8 }}
           className="flex flex-col sm:flex-row items-center gap-6 mb-16 md:mb-24"
        >
          <Link to="/dashboard" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue to-blue-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-500 group-hover:duration-200" />
            <button className="relative px-10 py-5 bg-slate-950 border border-white/10 rounded-2xl flex items-center gap-4 hover:border-brand-blue/50 transition-all text-white">
              <span className="font-black text-sm uppercase tracking-[0.2em]">Initialize Dashboard</span>
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          
          <Link to="/map" className="group">
            <button className="px-10 py-5 bg-transparent border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/5 hover:border-white/20 transition-all text-white">
              <GlobeAmericasIcon className="w-5 h-5 text-slate-400 group-hover:text-brand-blue transition-colors" />
              <span className="font-black text-sm uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">Global Network</span>
            </button>
          </Link>
        </motion.div>
      </motion.div>

      {/* FLOATING DATA POINTS */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 2, delay: 1 }}
        className="flex flex-row flex-wrap justify-center md:justify-start gap-10 md:gap-20 border-t border-white/10 pt-10 mt-8 mb-12 relative z-10 w-full max-w-3xl px-6"
      >
        <div className="flex flex-col items-center md:items-start">
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Live Nodes</div>
          <div className="text-3xl text-white font-light tracking-tighter">194+</div>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Latency</div>
          <div className="text-3xl text-brand-blue font-light tracking-tighter">12ms</div>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Algorithm</div>
          <div className="text-3xl text-white font-light tracking-tighter">ML_v2</div>
        </div>
      </motion.div>

    </div>
  );
}

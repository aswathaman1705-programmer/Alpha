import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPinIcon, ShieldCheckIcon, ChartBarIcon, BeakerIcon, ClockIcon, Squares2X2Icon, PresentationChartLineIcon, AdjustmentsHorizontalIcon, XMarkIcon, HomeIcon, Bars3Icon } from "@heroicons/react/24/outline";
import axios from "axios";

// Standard Components
import Dashboard from "./components/Dashboard";
import HealthRisks from "./components/HealthRisks";
import SourceAnalysis from "./components/SourceAnalysis";
import Forecast from "./components/Forecast";
import WhyAffected from "./components/WhyAffected";
import HistoricalTrends from "./components/HistoricalTrends";
import MapExplorer from "./components/MapExplorer";
import Hero from "./components/Hero";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function Sidebar({ currentCity, setCurrentCity, cities, citiesWithAqi, mobileMenuOpen, setMobileMenuOpen }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [aqiFilter, setAqiFilter] = useState("all");
  const scrollRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    
    // Global ESC key listener to close search
    const handleEsc = (e) => {
      if (e.key === "Escape") {
         setShowSearch(false);
         setSearchTerm("");
         setAqiFilter("all");
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [aqiFilter, searchTerm]);

  const filteredCities = cities.filter(c => {
    const matchesSearch = c.toLowerCase().includes(searchTerm.toLowerCase());
    const cityAqi = citiesWithAqi?.[c]?.aqi;
    if (aqiFilter === 'all' || cityAqi === undefined) return matchesSearch;
    let matchesFilter = false;
    if (aqiFilter === 'good') matchesFilter = cityAqi <= 50;
    else if (aqiFilter === 'moderate') matchesFilter = cityAqi > 50 && cityAqi <= 100;
    else if (aqiFilter === 'bad') matchesFilter = cityAqi > 100;
    return matchesSearch && matchesFilter;
  });

  const hiddenMatches = searchTerm ? cities.filter(c => 
    c.toLowerCase().includes(searchTerm.toLowerCase()) && 
    !filteredCities.includes(c)
  ).length : 0;

  const highlightMatch = (text, query) => {
    if (!query || !query.trim()) return text;
    const cleanQuery = query.trim();
    const parts = text.split(new RegExp(`(${cleanQuery})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === cleanQuery.toLowerCase() 
            ? <span key={i} className="text-brand-blue font-bold">{part}</span> 
            : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

  const navItems = [
    { name: "Home", path: "/", icon: <HomeIcon className="w-5 h-5" /> },
    { name: "Dashboard", path: "/dashboard", icon: <Squares2X2Icon className="w-5 h-5" /> },
    { name: "Network", path: "/map", icon: <MapPinIcon className="w-5 h-5" /> },
    { name: "Diagnosis", path: "/why", icon: <AdjustmentsHorizontalIcon className="w-5 h-5" /> },
    { name: "Health", path: "/health", icon: <BeakerIcon className="w-5 h-5" /> },
    { name: "Trends", path: "/yearly", icon: <PresentationChartLineIcon className="w-5 h-5" /> },
    { name: "Sources", path: "/sources", icon: <ChartBarIcon className="w-5 h-5" /> },
    { name: "Forecast", path: "/forecast", icon: <ClockIcon className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-[990] backdrop-blur-sm" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}
      <aside className={`fixed md:sticky top-0 left-0 h-[100dvh] w-[85%] max-w-[320px] md:w-80 z-[1000] border-r border-white/5 flex flex-col glass-panel !rounded-none !bg-slate-950/95 md:!bg-slate-950/40 shrink-0 transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        {/* BRANDING SECTION */}
        <Link to="/" onClick={() => setMobileMenuOpen(false)} className="p-6 md:p-8 border-b border-white/5 block hover:bg-white/[0.02] transition-colors cursor-pointer relative group">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 relative group-hover:border-brand-blue/30 overflow-hidden transition-colors">
            <div className="absolute inset-0 bg-brand-blue/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <ShieldCheckIcon className="w-7 h-7 text-brand-blue relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase text-white tracking-tighter leading-none group-hover:text-brand-blue transition-colors">ALPHA</h1>
            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-2 whitespace-pre-line leading-relaxed group-hover:text-slate-400 transition-colors">
              Urban Air Quality Pattern &<br/>Pollution Source Analysis
            </p>
          </div>
        </div>
      </Link>

      {/* NAVIGATION SECTION */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        <div className="px-4 mb-4">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Menu</span>
        </div>
        {navItems.map(item => (
          <Link key={item.path} to={item.path} 
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full px-4 md:px-6 py-3 md:py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-4 border ${
              location.pathname === item.path 
              ? "bg-white/10 text-brand-blue border-white/10 shadow-[0_10px_30px_rgba(0,243,255,0.05)]" 
              : "text-slate-500 hover:text-white border-transparent hover:bg-white/5"
            }`}>
            <div className={`${location.pathname === item.path ? "text-brand-blue" : "text-slate-600"}`}>
              {item.icon}
            </div>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* FOOTER / CITY SELECTOR */}
      <div className="p-6 border-t border-white/5 space-y-4 bg-white/[0.01]">
        <div className="px-4">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Active Node</span>
        </div>
        <div 
          onClick={() => setShowSearch(true)}
          className="glass-panel py-4 px-6 flex items-center justify-between border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <MapPinIcon className="w-4 h-4 text-brand-blue" />
            <span className="text-white font-black text-[11px] uppercase tracking-widest">{currentCity}</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse group-hover:scale-125 transition-transform" />
        </div>

        <div className="flex items-center justify-between px-4 mt-6">
           <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]" />
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-nowrap">Core Online</span>
           </div>
           <span className="text-[8px] font-black text-slate-800 tracking-widest">V1.1_ALPHA</span>
        </div>
      </div>

      {/* GLOBAL SEARCH — COMMAND PALETTE (portaled to body for full-screen) */}
      {createPortal(<AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex flex-col"
            style={{ background: "rgba(3,7,18,0.92)", backdropFilter: "blur(24px)" }}
            onClick={() => { setShowSearch(false); setSearchTerm(""); setAqiFilter("all"); }}
          >
            {/* ── HEADER ── */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.22 }}
              className="shrink-0 px-4 pt-8 md:px-12 md:pt-14 pb-6 md:pb-8 mt-12 md:mt-0"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-[10px] font-black text-brand-blue uppercase tracking-[0.5em] mb-3">Alpha Node Directory</p>
              <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-8">
                Select City
              </h2>

              {/* Search input */}
              <div className="relative flex items-center group">
                <MapPinIcon className="absolute left-5 w-6 h-6 text-brand-blue pointer-events-none z-10" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search any city..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-14 pr-14 py-5 text-white text-lg font-bold placeholder:text-slate-600 focus:outline-none focus:border-brand-blue/60 focus:bg-white/[0.07] transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-5 text-slate-500 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* AQI Filter pills */}
              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mr-2">Filter:</span>
                {[
                  { key: "all",      label: "All",       color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.2)" },
                  { key: "good",     label: "Good",      color: "#00e400", bg: "rgba(0,228,0,0.08)",    border: "rgba(0,228,0,0.25)" },
                  { key: "moderate", label: "Moderate",  color: "#FFFF00", bg: "rgba(255,255,0,0.06)",  border: "rgba(255,255,0,0.2)" },
                  { key: "bad",      label: "Bad",       color: "#FF4444", bg: "rgba(255,68,68,0.08)",  border: "rgba(255,68,68,0.25)" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setAqiFilter(f.key)}
                    className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border"
                    style={aqiFilter === f.key
                      ? { backgroundColor: f.bg, borderColor: f.color, color: f.color, boxShadow: `0 0 16px ${f.color}30` }
                      : { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#475569" }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* ── CITY GRID ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 pb-4 md:px-12 md:pb-12 custom-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              {filteredCities.length > 0 ? (
                <>
                  <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] mb-5">
                    {filteredCities.length} node{filteredCities.length !== 1 ? "s" : ""} found
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredCities.map((c, i) => {
                      const aqiInfo = citiesWithAqi?.[c];
                      const aqi = aqiInfo?.aqi;
                      const color = aqiInfo?.color || "#475569";
                      const isActive = c === currentCity;
                      return (
                        <motion.div
                          key={c}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.015, 0.3), duration: 0.2 }}
                          onClick={() => { setCurrentCity(c); setSearchTerm(""); setShowSearch(false); setAqiFilter("all"); }}
                          className="relative flex flex-col justify-between p-4 rounded-2xl cursor-pointer border transition-all duration-200 group overflow-hidden"
                          style={isActive
                            ? { background: "rgba(0,243,255,0.08)", borderColor: "rgba(0,243,255,0.35)", boxShadow: "0 0 24px rgba(0,243,255,0.1)" }
                            : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
                          onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}}
                          onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}}
                        >
                          {/* glow blob */}
                          {aqi !== undefined && (
                            <div className="absolute top-0 right-0 w-16 h-16 blur-2xl opacity-20 pointer-events-none rounded-full" style={{ backgroundColor: color, transform: "translate(30%, -30%)" }} />
                          )}
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-wider leading-tight mb-3">
                              {highlightMatch(c, searchTerm)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            {aqi !== undefined ? (
                              <>
                                <span
                                  className="text-lg font-black tabular-nums leading-none"
                                  style={{ color }}
                                >
                                  {aqi}
                                </span>
                                <span
                                  className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                  style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
                                >
                                  {aqiInfo?.category?.split(" ")[0] || "AQI"}
                                </span>
                              </>
                            ) : (
                              <span className="text-[9px] text-slate-700 font-black uppercase tracking-wider">— AQI</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center">
                  <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center mb-6 bg-white/[0.02]">
                    <MapPinIcon className="w-8 h-8 text-slate-700" />
                  </div>
                  <p className="text-white font-black text-xl uppercase tracking-tighter mb-2">
                    {cities.length === 0 ? "Connecting to network..." : "No matches found"}
                  </p>
                  <p className="text-slate-600 text-sm font-medium mb-6">
                    {cities.length === 0
                      ? "Fetching global node directory from backend"
                      : `No ${aqiFilter !== "all" ? aqiFilter + " " : ""}cities match "${searchTerm}"`}
                  </p>
                  {hiddenMatches > 0 && (
                    <button
                      onClick={() => setAqiFilter("all")}
                      className="px-8 py-3 bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-brand-blue hover:text-slate-900 transition-all"
                    >
                      Show all {hiddenMatches + filteredCities.length} results
                    </button>
                  )}
                </div>
              )}
            </motion.div>

            {/* ── FOOTER ── */}
            <div className="shrink-0 px-4 py-4 md:px-12 md:py-5 border-t border-white/5 flex items-center justify-between mt-auto">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em]">
                {cities.length} cities in network
              </span>
              <button
                onClick={() => { setShowSearch(false); setSearchTerm(""); setAqiFilter("all"); }}
                className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] hover:text-white transition-colors"
              >
                <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[8px]">ESC</span>
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
      </aside>
    </>
  );
}

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [city, setCity] = useState("Chennai");
  const [cities, setCities] = useState([]);
  const [citiesWithAqi, setCitiesWithAqi] = useState(null);
  const [aqiData, setAqiData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [forecastSource, setForecastSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("24 Hours");

  useEffect(() => {
    fetchCities();
    fetchCitiesWithAqi(); // Initial fetch for AQI status
  }, []);

  useEffect(() => {
    if (city) {
      fetchDashboard(city, range);
      fetchCitiesWithAqi(); // Also fetch AQI status when city/range changes

      // Automatic 5-minute Atmospheric Heartbeat
      const heartTicker = setInterval(() => {
        fetchDashboard(city, range);
        fetchCitiesWithAqi();
      }, 300000);

      return () => clearInterval(heartTicker);
    }
  }, [city, range]);

  const fetchCities = async () => {
    try {
      const res = await axios.get(`${API_BASE}/cities`);
      setCities(res.data.sort());
    } catch (err) { console.error("Cities fetch error:", err); }
  };

  const fetchCitiesWithAqi = async () => {
    try {
      const res = await axios.get(`${API_BASE}/aqi/status-bulk`);
      if (res.data.status === "success") {
        const bulkMap = {};
        res.data.data.forEach(d => { bulkMap[d.city] = d; });
        
        setCitiesWithAqi(prev => {
          if (!prev) return bulkMap;
          // Keep the high-fidelity dashboard reading for the current city
          // so the search results don't "flicker" to a stale bulk value.
          return { ...bulkMap, ...prev }; 
        });
      }
    } catch (err) { console.error("AQI sync error:", err); }
  };

  const fetchDashboard = async (targetCity, targetRange) => {
    const daysMap = { "24 Hours": 1, "30 Days": 30, "90 Days": 90 };
    const days = daysMap[targetRange || range] || 1;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/aqi/combined/${targetCity}?days=${days}`);
      if (res.data.status === "success") {
        const d = res.data.data;
        const currentData = { ...d.current, city: targetCity, forecast24h: d.forecast };
        setAqiData(currentData);
        setTrendData(d.trend);
        setForecastSource(d.sources);

        // SYNC SEARCH RESULTS: Update the local bulk cache with this high-fidelity reading
        setCitiesWithAqi(prev => {
          if (!prev) return { [targetCity]: currentData };
          return { ...prev, [targetCity]: currentData };
        });
      }
    } catch (err) { console.error("Dashboard fetch error:", err); }
    setLoading(false);
  };

  const aqiColor = aqiData?.color || "#00f3ff";

  return (
    <Router>
      <div className="min-h-[100dvh] bg-[#030712] flex flex-col md:flex-row w-full overflow-x-hidden">
        {/* MOBILE HEADER */}
        <div className="md:hidden sticky top-0 z-[900] flex items-center justify-between p-4 glass-panel !rounded-none !bg-slate-950/80 border-b border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
               <ShieldCheckIcon className="w-5 h-5 text-brand-blue" />
             </div>
             <h1 className="text-xl font-black italic uppercase text-white tracking-tighter">ALPHA</h1>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Bars3Icon className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* HIGH-END ATMOSPHERIC BACKGROUND SYSTEM */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #030712 100%)' }} />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] blur-[160px] pointer-events-none transition-colors duration-[2000ms]" 
            style={{ 
              background: `radial-gradient(circle at 30% 20%, ${aqiColor}88 0%, transparent 40%), radial-gradient(circle at 80% 80%, ${aqiColor}44 0%, transparent 40%)` 
            }} 
          />
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(0, 243, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        </div>
        
        <Sidebar currentCity={city} setCurrentCity={setCity} cities={cities} citiesWithAqi={citiesWithAqi} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

        <main className="flex-1 relative z-10 px-4 py-6 md:px-10 md:py-16 scroll-smooth w-full">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Hero />} />
              <Route path="/dashboard" element={<Dashboard aqiData={aqiData} trendData={trendData} forecastSource={forecastSource} onRangeChange={setRange} currentRange={range} API_BASE={API_BASE} city={city} loading={loading} />} />
              <Route path="/map" element={<MapExplorer aqiData={aqiData} citiesWithAqi={citiesWithAqi} API_BASE={API_BASE} onCitySelect={setCity} currentCity={city} />} />
              <Route path="/health" element={<HealthRisks aqiData={aqiData} city={city} API_BASE={API_BASE} />} />
              <Route path="/why" element={<WhyAffected aqiData={aqiData} city={city} API_BASE={API_BASE} />} />
              <Route path="/yearly" element={<HistoricalTrends city={city} API_BASE={API_BASE} />} />
              <Route path="/sources" element={<SourceAnalysis city={city} API_BASE={API_BASE} />} />
              <Route path="/forecast" element={<Forecast aqiData={aqiData} city={city} API_BASE={API_BASE} />} />
            </Routes>
          </AnimatePresence>
        </main>

        {/* PHYSICAL STATUS BAR - Stable Bottom Right (formerly watermark) */}
        <div className="fixed bottom-0 right-0 z-50 p-4 md:p-6 pointer-events-auto hidden sm:block">
          <div className="glass-panel px-4 py-3 md:px-6 md:py-4 border border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] flex flex-col items-end gap-1.5 bg-slate-950/80 backdrop-blur-3xl rounded-tl-3xl">
             <div className="flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-brand-blue">
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand-blue animate-pulse shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
                Satellite Sync Active
                <div className="hidden md:block w-12 h-px bg-brand-blue/30" />
             </div>
             <div className="text-[8px] md:text-[10px] font-black text-slate-500 flex gap-2 md:gap-4 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                <span className="text-brand-blue/60 italic">STATION_ALPHA</span>
                <span className="hidden md:inline">// LAT: 20.5° N</span>
                <span className="hidden md:inline">LON: 78.9° E</span>
             </div>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;

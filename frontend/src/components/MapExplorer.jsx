import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { XMarkIcon, ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

// Use a lightweight, optimized world topo — cached after first load
const WORLD_GEO = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const getAQIColor = (aqi) => {
  if (!aqi || aqi <= 0) return "#64748b";
  if (aqi <= 50)  return "#00E400";
  if (aqi <= 100) return "#FFFF00";
  if (aqi <= 150) return "#FF7E00";
  if (aqi <= 200) return "#FF0000";
  if (aqi <= 300) return "#8F3F97";
  return "#7E0023";
};

const getAQILabel = (aqi) => {
  if (!aqi || aqi <= 0) return "No Data";
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (Sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

// Memoized Geography renderer — prevents re-render on every zoom/pan
const MemoGeographies = memo(({ geo }) => (
  <Geography
    geography={geo}
    fill="#0f172a"
    stroke="#1e293b"
    strokeWidth={0.4}
    style={{
      default: { outline: "none" },
      hover: { fill: "#1a2744", stroke: "#334155", outline: "none" },
      pressed: { outline: "none" }
    }}
  />
));

// Memoized single marker — only re-renders when its own data changes
const CityMarker = memo(({ node, aqi, isActive, zoom, onClick }) => {
  const color = getAQIColor(aqi);
  
  // High-precision vector scaling to keep elements sharp and consistent at any zoom (up to 30x)
  const baseR = isActive ? 6 : 4;
  const r = baseR / zoom; 
  const strokeW = 1.2 / zoom;
  
  // Progressive Level of Detail (LOD)
  // 1. Dots only at low zoom
  // 2. Name appears at mid-zoom or if active
  // 3. AQI value appears at high-zoom only
  const showLabel = isActive || zoom >= 3.5;
  const showAqiNum = isActive || zoom >= 6;
  
  const fontSize = (isActive ? 12 : 9) / zoom;
  const aqiFontSize = 8 / zoom;
  const labelY = -(r + 4 / zoom);

  return (
    <Marker coordinates={[node.lon, node.lat]} onClick={onClick}>
      {/* Pulse ring for active */}
      {isActive && (
        <circle
          r={r * 2.5}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray={`${2/zoom} ${2/zoom}`}
          opacity={0.4}
        >
          <animate attributeName="r" values={`${r*2};${r*3};${r*2}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Main dot */}
      <circle
        r={r}
        fill={color}
        stroke={isActive ? "#fff" : "rgba(255,255,255,0.15)"}
        strokeWidth={strokeW}
        style={{ cursor: "pointer", filter: `drop-shadow(0 0 ${isActive ? 4 : 2}px ${color}aa)` }}
      />
      {/* City name label */}
      {showLabel && (
        <text
          textAnchor="middle"
          y={labelY}
          style={{
            fontSize: `${fontSize}px`,
            fill: isActive ? "#fff" : "rgba(255,255,255,0.75)",
            fontWeight: 900,
            fontFamily: "Inter, system-ui, sans-serif",
            pointerEvents: "none",
            textTransform: "uppercase",
            letterSpacing: `${0.2/zoom}px`,
            paintOrder: "stroke",
            stroke: "#030712",
            strokeWidth: `${2.5/zoom}px`,
          }}
        >
          {node.city}
        </text>
      )}
      {/* AQI number under the label at higher zoom */}
      {showAqiNum && (
        <text
          textAnchor="middle"
          y={labelY + aqiFontSize + 1/zoom}
          style={{
            fontSize: `${aqiFontSize}px`,
            fill: color,
            fontWeight: 950,
            fontFamily: "Inter, system-ui, sans-serif",
            pointerEvents: "none",
            paintOrder: "stroke",
            stroke: "#030712",
            strokeWidth: `${2/zoom}px`,
          }}
        >
          AQI {aqi}
        </text>
      )}
    </Marker>
  );
});

function MapExplorer({ aqiData, citiesWithAqi, API_BASE, onCitySelect, currentCity }) {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState(null);
  const [search, setSearch] = useState("");
  const [aqiFilter, setAqiFilter] = useState("all");
  const scrollRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState([20, 10]);
  const [cityNodes, setCityNodes] = useState([]);

  // Loading resolves instantly when citiesWithAqi data arrives from parent
  const isLoading = !citiesWithAqi || Object.keys(citiesWithAqi).length === 0;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [aqiFilter, search]);

  useEffect(() => {
    fetchNodes();
  }, []);

  useEffect(() => {
    if (currentCity && cityNodes.length > 0) {
      const node = cityNodes.find(n => n.city.toLowerCase() === currentCity.toLowerCase());
      if (node) handleNodeClick(node);
    }
  }, [currentCity, cityNodes]);

  const fetchNodes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/maps`);
      if (res.data.status === "success") {
        setCityNodes(res.data.data);
      }
    } catch (err) { console.error("Map nodes fetch error:", err); }
  };

  const handleNodeClick = useCallback((node) => {
    // Immediately update global app state so all tabs sync
    if (onCitySelect) {
      onCitySelect(node.city);
    }
    
    // Smooth transition to the node
    setCenter([node.lon, node.lat]);
    setZoom(prev => Math.max(prev, 6));
    setSelectedNode(node);
  }, [onCitySelect]);

  const handleLoadAnalysis = () => {
    if (selectedNode) {
      onCitySelect(selectedNode.city);
      navigate("/why");
    }
  };

  const { filteredNodes, hiddenMatches } = useMemo(() => {
    const q = search.toLowerCase();
    const matches = cityNodes.filter(n => n.city.toLowerCase().includes(q));
    
    const filtered = matches.filter(n => {
      const cityAqi = citiesWithAqi?.[n.city]?.aqi;
      if (aqiFilter === 'all' || cityAqi === undefined) return true;
      
      if (aqiFilter === 'good') return cityAqi <= 50;
      if (aqiFilter === 'moderate') return cityAqi > 50 && cityAqi <= 100;
      if (aqiFilter === 'bad') return cityAqi > 100;
      return true;
    });

    return {
      filteredNodes: filtered.slice(0, (search || aqiFilter !== 'all' ? 20 : 0)),
      hiddenMatches: matches.length - filtered.length
    };
  }, [search, aqiFilter, cityNodes, citiesWithAqi]);

  const activeAqi = useMemo(() => {
    if (!selectedNode) return 0;
    // Start with the bulk cache value (always available instantly for any city)
    const bulkAqi = citiesWithAqi?.[selectedNode.city]?.aqi || 0;
    // Override with high-fidelity dashboard data ONLY when it actually matches
    if (selectedNode.city.toLowerCase() === currentCity.toLowerCase() && aqiData?.aqi && aqiData?.category) {
       return aqiData.aqi;
    }
    return bulkAqi;
  }, [selectedNode, currentCity, aqiData, citiesWithAqi]);

  const activeColor = getAQIColor(activeAqi);

  // Stable click handlers — one per city, never recreated
  const nodeClickHandlers = useMemo(() => {
    const map = {};
    cityNodes.forEach(node => { map[node.city] = () => handleNodeClick(node); });
    return map;
  }, [cityNodes, handleNodeClick]);

  const markers = useMemo(() => {
    return cityNodes.map(node => (
      <CityMarker 
        key={node.city} 
        node={node} 
        aqi={citiesWithAqi?.[node.city]?.aqi || 0} 
        isActive={selectedNode?.city === node.city}
        zoom={zoom}
        onClick={nodeClickHandlers[node.city]} 
      />
    ));
  }, [cityNodes, citiesWithAqi, zoom, selectedNode, nodeClickHandlers]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-[calc(100vh-140px)] overflow-hidden flex gap-0 rounded-3xl bg-slate-950">

      {/* LEFT INFO PANEL */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 28 }}
            className="w-80 shrink-0 bg-[#0a0f1e]/95 backdrop-blur-3xl border-r border-white/5 flex flex-col z-[100] relative shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
          >
            <button onClick={() => setSelectedNode(null)} className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all">
              <XMarkIcon className="w-5 h-5" />
            </button>

            <div className="p-10 flex-1 space-y-10 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit bg-brand-blue/10 border border-brand-blue/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-blue">Global Sensor Active</span>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{selectedNode.country}</p>
                    <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">{selectedNode.city}</h2>
                 </div>
              </div>

              <div className="space-y-8">
                <div className="p-8 rounded-[2rem] text-center relative overflow-hidden bg-white/[0.02] border border-white/5">
                   <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent pointer-events-none" />
                   <div className="relative z-10">
                      <div className="text-7xl font-black mb-1 drop-shadow-2xl" style={{ color: activeColor }}>{activeAqi || "—"}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">AQI Index</div>
                      <div className="inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase" style={{ backgroundColor: activeColor + "20", color: activeColor }}>
                        {getAQILabel(activeAqi)}
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">LAT</p>
                      <p className="text-xs font-black text-white">{selectedNode.lat}</p>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">LON</p>
                      <p className="text-xs font-black text-white">{selectedNode.lon}</p>
                   </div>
                </div>
              </div>

              <button
                onClick={handleLoadAnalysis}
                className="group w-full py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:brightness-110 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] active:scale-95"
                style={{ background: activeColor, color: activeAqi > 100 ? '#fff' : '#000' }}
              >
                Launch Analysis <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAP ENGINE */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-[150] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
               <div className="w-12 h-12 rounded-full border-4 border-brand-blue/10 border-t-brand-blue animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-blue animate-pulse">Syncing International Nodes</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filter Engine */}
        <div className="absolute top-8 right-8 z-[100] w-80 space-y-3">
          {/* Filters */}
          <div className="flex gap-2 justify-end">
             {['all', 'good', 'moderate', 'bad'].map(f => (
               <button 
                key={f}
                onClick={() => setAqiFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${
                  aqiFilter === f 
                  ? "bg-brand-blue border-brand-blue text-slate-900" 
                  : "bg-[#0a0f1e]/80 border-white/10 text-slate-500 hover:text-white"
                }`}
               >
                 {f}
               </button>
             ))}
          </div>

          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-brand-blue transition-colors" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="System Search..."
              className="w-full bg-[#0a0f1e]/90 border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-xs text-white font-bold focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 placeholder-slate-600 backdrop-blur-3xl transition-all shadow-2xl"
            />
          </div>
          {filteredNodes.length > 0 ? (
            <div ref={scrollRef} className="mt-2 bg-[#0a0f1e] border border-white/10 rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-3xl max-h-64 overflow-y-auto custom-scrollbar">
              {filteredNodes.map(n => (
                <button key={n.city} onClick={() => { handleNodeClick(n); setSearch(""); setAqiFilter("all"); }} className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white uppercase italic tracking-widest">{n.city}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">{n.country}</span>
                  </div>
                  {citiesWithAqi?.[n.city] && (
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black" style={{ color: getAQIColor(citiesWithAqi[n.city].aqi) }}>{citiesWithAqi[n.city].aqi}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (search || aqiFilter !== 'all') && (
            <div className="mt-2 bg-[#0a0f1e]/90 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-3xl">
               <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">
                  No {aqiFilter !== 'all' ? aqiFilter : ''} nodes found
               </div>
               {hiddenMatches > 0 && (
                 <button onClick={() => setAqiFilter('all')} className="text-brand-blue text-[8px] font-black uppercase tracking-widest hover:underline">
                    Clear filters to show {hiddenMatches} hidden nodes
                 </button>
               )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-8 right-8 z-[100] glass-panel bg-[#0a0f1e]/80 backdrop-blur-3xl px-6 py-4 flex items-center gap-6 rounded-[2rem] border border-white/5 shadow-2xl">
          {[["#00E400","Good"],["#FFFF00","Mod"],["#FF7E00","Sens"],["#FF0000","Bad"],["#7E0023","Haz"]].map(([c,l]) => (
            <div key={c} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}` }} />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{l}</span>
            </div>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-8 left-8 z-[100] flex gap-2">
          <button onClick={() => setZoom(z => Math.min(z * 1.5, 30))} className="w-10 h-10 glass-panel bg-slate-900/40 hover:bg-brand-blue hover:text-black font-black text-white transition-all text-sm rounded-xl border border-white/5">+</button>
          <button onClick={() => setZoom(z => Math.max(z / 1.5, 1))} className="w-10 h-10 glass-panel bg-slate-900/40 hover:bg-brand-blue hover:text-black font-black text-white transition-all text-sm rounded-xl border border-white/5">−</button>
          <button onClick={() => { setZoom(1); setCenter([20, 10]); setSelectedNode(null); }} className="px-4 h-10 glass-panel bg-slate-900/40 hover:bg-brand-blue hover:text-black font-black text-white transition-all text-[9px] uppercase tracking-wider rounded-xl border border-white/5">Reset</button>
        </div>



        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 180 }}
          style={{ width: "100%", height: "100%", background: "#030712" }}
        >
          <ZoomableGroup
            center={center}
            zoom={zoom}
            onMoveEnd={({ zoom: z, coordinates }) => { setZoom(z); setCenter(coordinates); }}
            maxZoom={30}
            minZoom={1}
          >
            <Geographies geography={WORLD_GEO}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <MemoGeographies key={geo.rsmKey} geo={geo} />
                ))
              }
            </Geographies>

            {markers}
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </motion.div>
  );
}

export default MapExplorer;

"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  Compass, MapPin, Layers, Maximize2, RotateCcw, 
  Zap, Fuel, ShieldAlert, CheckCircle2, AlertTriangle,
  Move, Radio, Eye
} from "lucide-react";

export interface StationGeoItem {
  id_estacao?: string;
  id?: string;
  nome: string;
  latitude: number;
  longitude: number;
  potencia_kw: number;
  status: string;
  operador?: string;
  conectores?: string[];
  endereco?: string;
  distancia_km?: number;
  distancia_rota_km?: number;
  origem?: 'MANUAL_PLUGSHARE' | 'GOOGLE_PLACES' | 'OPENSTREETMAP';
  isCalibrated?: boolean;
}

export interface EVStationMapProps {
  targetLat: number;
  targetLon: number;
  targetAddress?: string;
  targetName?: string;
  stations?: StationGeoItem[];
  radiusKM?: number;
  isDraggable?: boolean;
  onLocationChange?: (coords: { lat: number; lon: number; address?: string }) => void;
  onStationLocationChange?: (stationId: string, coords: { lat: number; lon: number }) => void;
  className?: string;
}

export default function EVStationMap({
  targetLat,
  targetLon,
  targetAddress = "Ponto Selecionado",
  targetName = "Ponto Proposto Cordeiro Energia",
  stations = [],
  radiusKM = 15,
  isDraggable = true,
  onLocationChange,
  onStationLocationChange,
  className = "h-[450px] w-full"
}: EVStationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const bufferCirclesRef = useRef<L.LayerGroup | null>(null);
  const competitorMarkersRef = useRef<L.LayerGroup | null>(null);

  const [mapTheme, setMapTheme] = useState<'dark' | 'streets'>('streets');
  const [showBuffers, setShowBuffers] = useState<boolean>(true);
  const [isDraggingTarget, setIsDraggingTarget] = useState<boolean>(false);
  const [lastMovedCoords, setLastMovedCoords] = useState<{ lat: number; lon: number } | null>(null);

  // ─── 1. INICIALIZAÇÃO DO MAPA LEAFLET ─────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [targetLat, targetLon],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    bufferCirclesRef.current = L.layerGroup().addTo(map);
    competitorMarkersRef.current = L.layerGroup().addTo(map);

    // Garantir renderização correta das dimensões do container Leaflet
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (_) {}
    }, 250);

    // Clique no mapa para mover o ponto proposto
    if (isDraggable) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setLastMovedCoords({ lat, lon: lng });
        if (onLocationChange) {
          onLocationChange({ lat: Number(lat.toFixed(6)), lon: Number(lng.toFixed(6)) });
        }
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ─── 2. ATUALIZAÇÃO DA CAMADA DE TILES (DARK VS STREETS) ───────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove tile layers antigas
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapTheme === 'dark') {
      // Esri World Dark Gray Canvas (100% livre de API key, sem marca d'água "API KEY REQUIRED")
      const baseDark = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        maxNativeZoom: 16,
        attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      });
      const labelsDark = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        maxNativeZoom: 16,
        attribution: '',
      });
      baseDark.addTo(map);
      labelsDark.addTo(map);
    } else {
      // OpenStreetMap Standard (Livre, detalhado em nível predial e viário com nomes de ruas)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
    }
  }, [mapTheme]);

  // ─── 3. MARCADOR DO PONTO PROPOSTO (CORDEIRO ENERGIA - DRAGGABLE) ──────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (targetMarkerRef.current) {
      map.removeLayer(targetMarkerRef.current);
      targetMarkerRef.current = null;
    }

    // Se o ponto mudou em relação ao centro atual da câmera (> 50m), recentralizar suavemente a visão do mapa
    try {
      map.invalidateSize();
      const currentCenter = map.getCenter();
      const distMeters = currentCenter.distanceTo(L.latLng(targetLat, targetLon));
      if (distMeters > 50) {
        map.setView([targetLat, targetLon], map.getZoom() || 14, { animate: true });
      }
    } catch (_) {}

    // Ícone Pulsante Customizado em Laranja Cordeiro (#E45318)
    const targetIcon = L.divIcon({
      className: 'cordeiro-target-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(228, 83, 24, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(228, 83, 24, 0.45); animation: pulse 2s ease-in-out infinite;"></div>
          <div style="position: relative; z-index: 10; width: 22px; height: 22px; border-radius: 50%; background: #E45318; border: 3px solid #FFFFFF; box-shadow: 0 4px 12px rgba(228,83,24,0.6); display: flex; align-items: center; justify-content: center;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });

    const marker = L.marker([targetLat, targetLon], {
      icon: targetIcon,
      draggable: isDraggable,
      zIndexOffset: 1000
    }).addTo(map);

    const popupHtml = `
      <div style="font-family: Montserrat, sans-serif; padding: 4px; min-width: 220px; color: #0A192F;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="background: #E45318; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 999px; text-transform: uppercase;">
            Novo Ponto Proposto
          </span>
          <span style="font-size: 10px; color: #64748B; font-weight: bold;">Cordeiro Energia</span>
        </div>
        <strong style="font-size: 13px; color: #0A192F; display: block; margin-bottom: 4px; line-height: 1.2;">
          ${targetName}
        </strong>
        <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0; line-height: 1.3;">
          ${targetAddress}
        </p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 6px; border-radius: 8px; font-size: 10px; color: #334155;">
          <strong>Coordenadas:</strong> ${targetLat.toFixed(4)}, ${targetLon.toFixed(4)}<br/>
          <em style="color: #E45318;">💡 Dica: Arraste o pino para ajustar a posição física da estação.</em>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);

    if (isDraggable) {
      marker.on('dragstart', () => setIsDraggingTarget(true));
      marker.on('dragend', (e) => {
        setIsDraggingTarget(false);
        const { lat, lng } = e.target.getLatLng();
        setLastMovedCoords({ lat, lon: lng });
        if (onLocationChange) {
          onLocationChange({ lat: Number(lat.toFixed(5)), lon: Number(lng.toFixed(5)) });
        }
      });
    }

    targetMarkerRef.current = marker;

    // ─── CÍRCULOS DE BUFFER DE CONCORRÊNCIA (1km, 3km, 5km) ─────────────────
    if (bufferCirclesRef.current) {
      bufferCirclesRef.current.clearLayers();

      if (showBuffers) {
        // 1 km - Zona Imediata
        L.circle([targetLat, targetLon], {
          radius: 1000,
          color: '#E45318',
          weight: 1.5,
          opacity: 0.8,
          fillColor: '#E45318',
          fillOpacity: 0.08,
          dashArray: '4, 4'
        }).addTo(bufferCirclesRef.current);

        // Badge textual permanente no anel de 1 km (topo do círculo)
        const lat1km = targetLat + (1000 / 111320);
        L.marker([lat1km, targetLon], {
          icon: L.divIcon({
            className: 'buffer-badge-1km',
            html: `<div style="background: rgba(228,83,24,0.92); color: white; font-family: Montserrat, sans-serif; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 999px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.8); pointer-events: none;">Zona Hiperlocal: 1 km</div>`,
            iconAnchor: [55, 12]
          }),
          interactive: false
        }).addTo(bufferCirclesRef.current);

        // 3 km - Concorrência Direta
        L.circle([targetLat, targetLon], {
          radius: 3000,
          color: '#F59E0B',
          weight: 1.5,
          opacity: 0.8,
          fillColor: '#F59E0B',
          fillOpacity: 0.05,
          dashArray: '6, 6'
        }).addTo(bufferCirclesRef.current);

        // Badge textual permanente no anel de 3 km (topo do círculo)
        const lat3km = targetLat + (3000 / 111320);
        L.marker([lat3km, targetLon], {
          icon: L.divIcon({
            className: 'buffer-badge-3km',
            html: `<div style="background: rgba(245,158,11,0.95); color: #0A192F; font-family: Montserrat, sans-serif; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 999px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.8); pointer-events: none;">Concorrência Direta: 3 km</div>`,
            iconAnchor: [65, 12]
          }),
          interactive: false
        }).addTo(bufferCirclesRef.current);

        // Raio de Varredura Selecionado (ex: 20 km)
        if (radiusKM > 3) {
          L.circle([targetLat, targetLon], {
            radius: radiusKM * 1000,
            color: '#3B82F6',
            weight: 1.5,
            opacity: 0.6,
            fillColor: '#3B82F6',
            fillOpacity: 0.02,
            dashArray: '8, 8'
          }).addTo(bufferCirclesRef.current);

          const latMax = targetLat + ((radiusKM * 1000) / 111320);
          L.marker([latMax, targetLon], {
            icon: L.divIcon({
              className: 'buffer-badge-max',
              html: `<div style="background: rgba(59,130,246,0.92); color: white; font-family: Montserrat, sans-serif; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 999px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.8); pointer-events: none;">Limite de Varredura: ${radiusKM} km</div>`,
              iconAnchor: [70, 12]
            }),
            interactive: false
          }).addTo(bufferCirclesRef.current);
        }
      }
    }

  }, [targetLat, targetLon, targetAddress, targetName, isDraggable, showBuffers, radiusKM]);

  // ─── 4. PLOTAGEM DOS ELETROPOSTOS CONCORRENTES ────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const competitorLayer = competitorMarkersRef.current;
    if (!map || !competitorLayer) return;

    competitorLayer.clearLayers();

    stations.forEach(st => {
      // Ignora se for idêntico ao ponto alvo (d <= 50m)
      const isTargetCoords = Math.abs(st.latitude - targetLat) < 0.0005 && Math.abs(st.longitude - targetLon) < 0.0005;
      if (isTargetCoords) return;

      const isManual = st.origem === 'MANUAL_PLUGSHARE';
      const isAvailable = st.status === 'Disponível';
      const isOccupied = st.status === 'Ocupado';
      const color = isManual ? '#A855F7' : isAvailable ? '#00B356' : isOccupied ? '#F59E0B' : '#EF4444';
      const statusLabel = isManual ? 'PlugShare / Manual' : isAvailable ? 'Disponível' : isOccupied ? 'Ocupado' : 'Manutenção';

      const compIcon = L.divIcon({
        className: 'competitor-station-marker',
        html: `
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #0A192F; border: 2.5px solid ${color}; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; cursor: ${isManual ? 'grab' : 'pointer'};">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });

      const m = L.marker([st.latitude, st.longitude], { 
        icon: compIcon,
        draggable: isManual 
      });

      if (isManual) {
        m.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng();
          const stationId = st.id || st.id_estacao || '';
          if (stationId && onStationLocationChange) {
            onStationLocationChange(stationId, {
              lat: Number(lat.toFixed(7)),
              lon: Number(lng.toFixed(7))
            });
          }
        });
      }

      const conectoresStr = st.conectores && st.conectores.length > 0
        ? st.conectores.map(c => `<span style="background: #F1F5F9; color: #334155; font-size: 9px; font-weight: bold; padding: 2px 5px; border-radius: 4px; border: 1px solid #CBD5E1;">${c}</span>`).join(' ')
        : `<span style="background: #F1F5F9; color: #334155; font-size: 9px; font-weight: bold; padding: 2px 5px; border-radius: 4px;">CCS2 / Tipo 2</span>`;

      const distHaversine = st.distancia_km !== undefined ? `${st.distancia_km.toFixed(2)} km` : '-';
      const distRota = st.distancia_rota_km !== undefined 
        ? `${st.distancia_rota_km.toFixed(2)} km` 
        : (st.distancia_km ? `${(st.distancia_km * 1.28).toFixed(2)} km` : '-');

      const popHtml = `
        <div style="font-family: Montserrat, sans-serif; padding: 4px; min-width: 250px; color: #0A192F;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="background: ${color}20; color: ${color}; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 999px; text-transform: uppercase;">
              ${statusLabel}
            </span>
            <span style="font-size: 11px; font-weight: 900; color: #0A192F;">
              ⚡ ${st.potencia_kw} kW
            </span>
          </div>
          <strong style="font-size: 13px; color: #0A192F; display: block; margin-bottom: 2px; line-height: 1.2;">
            ${st.nome}
          </strong>
          <span style="font-size: 10px; color: #64748B; display: block; margin-bottom: 6px;">
            Rede: <strong>${st.operador || 'Concorrente'}</strong>
          </span>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 6px; border-radius: 8px; font-size: 10px; color: #334155; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>📏 <strong>Linha Reta (Haversine):</strong></span>
              <span style="color: #A855F7; font-weight: bold;">${distHaversine}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>🚗 <strong>Trajeto Veicular Estimado:</strong></span>
              <span style="color: #0A192F; font-weight: bold;">~${distRota}</span>
            </div>
            <div style="color: #64748B; font-size: 9px; border-top: 1px dashed #CBD5E1; padding-top: 2px; margin-top: 2px;">
              GPS: ${st.latitude.toFixed(6)}, ${st.longitude.toFixed(6)}
            </div>
          </div>

          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;">
            ${conectoresStr}
          </div>
          ${st.endereco ? `<p style="font-size: 10px; color: #64748B; margin: 0 0 6px 0; line-height: 1.2;">📍 ${st.endereco}</p>` : ''}
          ${isManual ? `
            <div style="background: #FAF5FF; border: 1px solid #E9D5FF; padding: 5px; border-radius: 6px; font-size: 9px; color: #7E22CE; font-weight: bold; line-height: 1.3;">
              🎯 <strong>Pino Calibrável:</strong> Arraste este pino no mapa para ajustar a posição no lote exato.
            </div>
          ` : ''}
        </div>
      `;

      m.bindPopup(popHtml);
      m.addTo(competitorLayer);
    });

  }, [stations, targetLat, targetLon, onStationLocationChange]);

  // Centralizar no Ponto Proposto (Zoom de Bairro - 3 km)
  const handleRecenterNeighborhood = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([targetLat, targetLon], 14, { animate: true });
    }
  };

  // Enquadrar o Raio de Varredura Completo (ex: 20 km)
  const handleFitCatchment = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLng(targetLat, targetLon).toBounds(radiusKM * 1000 * 2);
    mapInstanceRef.current.fitBounds(bounds, { padding: [25, 25], animate: true });
  };

  // Enquadrar todos os pontos (Ponto Proposto + Concorrentes Mapeados)
  const handleFitAllPoints = () => {
    if (!mapInstanceRef.current) return;
    const points: [number, number][] = [[targetLat, targetLon]];
    stations.forEach(s => points.push([s.latitude, s.longitude]));
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else {
      handleRecenterNeighborhood();
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-lg bg-[#0A192F]">
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className={className} style={{ zIndex: 1 }} />

      {/* Barra de Controles Flutuantes Superiores */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
        {/* Badge do Ponto Alvo */}
        <div className="bg-[#0A192F]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-white flex items-center gap-2 pointer-events-auto shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E45318] animate-pulse" />
          <div className="text-left">
            <span className="text-[9px] font-black uppercase text-orange-400 block tracking-wider">
              {isDraggingTarget ? "Posicionando Carregador..." : "Ponto de Instalação Proposto"}
            </span>
            <span className="text-xs font-bold text-slate-100 truncate max-w-[200px] sm:max-w-xs block">
              {targetAddress}
            </span>
          </div>
        </div>

        {/* Botões de Ação do Mapa */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#0A192F]/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md">
          {/* Alternador de Tema */}
          <button
            type="button"
            onClick={() => setMapTheme(t => t === 'dark' ? 'streets' : 'dark')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
              mapTheme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-200'
            }`}
            title="Alternar entre Tema Dark e Ruas"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px]">{mapTheme === 'dark' ? 'Dark' : 'Ruas'}</span>
          </button>

          {/* Alternar Círculos de Buffer */}
          <button
            type="button"
            onClick={() => setShowBuffers(b => !b)}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
              showBuffers ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}
            title="Exibir/Ocultar Círculos de Concorrência"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px]">Anéis</span>
          </button>

          {/* Zoom Bairro (3 km) */}
          <button
            type="button"
            onClick={handleRecenterNeighborhood}
            className="px-2 py-1 rounded-lg text-[10px] font-bold text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 transition-colors flex items-center gap-1"
            title="Enquadrar visão no bairro (raio de 3 km)"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">3 km (Bairro)</span>
          </button>

          {/* Zoom Varredura Total (ex: 20 km) */}
          <button
            type="button"
            onClick={handleFitCatchment}
            className="px-2 py-1 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-500/10 border border-blue-500/30 transition-colors flex items-center gap-1"
            title={`Enquadrar toda a área de varredura (${radiusKM} km)`}
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">{radiusKM} km (Total)</span>
          </button>

          {/* Enquadrar Todos os Pontos */}
          <button
            type="button"
            onClick={handleFitAllPoints}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Enquadrar todas as estações mapeadas"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Legenda Flutuante Inferior */}
      <div className="absolute bottom-3 left-3 z-[400] bg-[#0A192F]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 text-white shadow-md flex items-center gap-3 text-[10px] flex-wrap max-w-[90%]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E45318]" />
          <span className="font-bold text-slate-200">Cordeiro (Proposto)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
          <span className="text-purple-300 font-bold">PlugShare / Manual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00B356]" />
          <span className="text-slate-300">Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <span className="text-slate-300">Ocupado</span>
        </div>
        <span className="hidden lg:inline text-slate-400 border-l border-slate-700 pl-2">
          Anéis: 1 km (Hiperlocal) | 3 km (Direta) | Varredura: {radiusKM} km ({stations.length} estações)
        </span>
      </div>

      {/* Dica de Arrastar Flutuante */}
      {isDraggable && (
        <div className="absolute bottom-3 right-3 z-[400] hidden sm:flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 border border-slate-700/60 shadow">
          <Move className="w-3 h-3 text-orange-400 shrink-0" />
          <span>Arraste o pino laranja ou os pinos roxos (PlugShare) para calibrar no lote exato</span>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, MapPin, Loader2, CheckCircle2, AlertTriangle, 
  Navigation, Crosshair, ExternalLink, X, Compass, Check
} from "lucide-react";
import { GeocodeSuggestion, MatchRank } from "@/app/api/ev/geocode/route";
import { extractDirectCoordinates } from "@/lib/ev/addressParserBR";

export interface AddressResolvedLocation {
  address: string;
  lat: number;
  lon: number;
  matchRank?: MatchRank;
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectLocation?: (location: AddressResolvedLocation) => void;
  currentLat?: number;
  currentLon?: number;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocompleteInput({
  value,
  onChange,
  onSelectLocation,
  currentLat,
  currentLon,
  placeholder = "Ex: Rua Carlos Antônio Giordani, 1580 - Bairro Henrique Nery, Sete Lagoas - MG",
  className = ""
}: AddressAutocompleteInputProps) {
  const [inputValue, setInputValue] = useState<string>(value || "");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeRank, setActiveRank] = useState<MatchRank | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza valor recebido de fora
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "");
    }
  }, [value]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Busca sugestões de autocompletar com debounce de 350ms
  const handleInputChange = (text: string) => {
    setInputValue(text);
    onChange(text);
    setStatusMessage(null);

    // Checagem imediata se o usuário colou coordenadas numéricas diretas
    const direct = extractDirectCoordinates(text);
    if (direct) {
      setActiveRank('rooftop');
      setStatusMessage("Coordenadas numéricas detectadas");
      if (onSelectLocation) {
        onSelectLocation({
          address: text,
          lat: direct.lat,
          lon: direct.lon,
          matchRank: 'rooftop'
        });
      }
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ev/geocode?autocomplete=true&q=${encodeURIComponent(text.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.success && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            setIsOpen(true);
          } else {
            setSuggestions([]);
          }
        }
      } catch (err) {
        console.error("Erro no autocompletar de endereços:", err);
      } finally {
        setIsLoading(false);
      }
    }, 350);
  };

  // Disparo manual ao clicar em "Buscar no Mapa"
  const handleManualSearch = async () => {
    if (!inputValue || inputValue.trim().length < 3) return;
    setIsLoading(true);
    setStatusMessage("Buscando no OpenStreetMap / CNEFE...");

    try {
      const res = await fetch(`/api/ev/geocode?address=${encodeURIComponent(inputValue.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success && typeof data.lat === 'number' && typeof data.lon === 'number') {
          setActiveRank(data.precision || 'street');
          setStatusMessage(`Localizado (${data.precision === 'rooftop' ? 'Lote exato' : 'Eixo da via'})`);
          if (onSelectLocation) {
            onSelectLocation({
              address: data.formattedAddress || inputValue,
              lat: data.lat,
              lon: data.lon,
              matchRank: data.precision
            });
          }
          setIsOpen(false);
        } else {
          setStatusMessage("Endereço não localizado pelo número predial. Ajuste no mapa.");
        }
      }
    } catch (_) {
      setStatusMessage("Erro de conexão com o geocodificador.");
    } finally {
      setIsLoading(false);
    }
  };

  // Ao selecionar uma sugestão do dropdown
  const handleSelectSuggestion = (sug: GeocodeSuggestion) => {
    setInputValue(sug.fullAddress);
    onChange(sug.fullAddress);
    setActiveRank(sug.matchRank);
    setStatusMessage(`Ponto sincronizado (${sug.matchRank === 'rooftop' ? 'Lote' : 'Via'})`);
    setIsOpen(false);

    if (onSelectLocation) {
      onSelectLocation({
        address: sug.fullAddress,
        lat: sug.lat,
        lon: sug.lon,
        matchRank: sug.matchRank
      });
    }
  };

  const getRankBadge = (rank: MatchRank) => {
    switch (rank) {
      case 'rooftop':
        return <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-300">LOTE EXATO</span>;
      case 'street':
        return <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-300">VIA / RUA</span>;
      case 'neighborhood':
        return <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-300">BAIRRO / CEP</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-300">CIDADE</span>;
    }
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleManualSearch();
              }
            }}
            placeholder={placeholder}
            className="w-full bg-white border border-slate-300 focus:border-[#E45318] focus:ring-2 focus:ring-[#E45318]/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 font-medium transition-all pr-9 shadow-sm"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue("");
                onChange("");
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Limpar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleManualSearch}
          disabled={isLoading || !inputValue}
          className="bg-[#0A192F] hover:bg-[#132847] disabled:opacity-50 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
          title="Buscar endereço e centralizar o mapa"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E45318]" />
          ) : (
            <Search className="w-3.5 h-3.5 text-[#E45318]" />
          )}
          <span className="hidden sm:inline">Buscar no Mapa</span>
        </button>
      </div>

      {/* ─── DROPDOWN DE SUGESTÕES DO GEOCODER ─── */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Sugestões CNEFE / OpenStreetMap Brasil</span>
            <span>{suggestions.length} resultados</span>
          </div>
          {suggestions.map((sug, idx) => (
            <button
              key={`${sug.lat}-${sug.lon}-${idx}`}
              type="button"
              onClick={() => handleSelectSuggestion(sug)}
              className="w-full text-left p-3 hover:bg-orange-50/60 transition-all cursor-pointer flex items-start gap-2.5 group"
            >
              <MapPin className="w-4 h-4 text-[#E45318] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-xs text-slate-800 font-bold truncate block group-hover:text-[#E45318]">
                    {sug.title}
                  </strong>
                  {getRankBadge(sug.matchRank)}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {sug.subtitle}
                </p>
                <div className="flex items-center gap-2 mt-1 font-mono text-[9px] text-slate-400">
                  <span>Lat: {sug.lat.toFixed(5)}</span>
                  <span>•</span>
                  <span>Lon: {sug.lon.toFixed(5)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── BADGE DE STATUS & COORDENADAS VINCULADAS ─── */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        {typeof currentLat === 'number' && typeof currentLon === 'number' && (
          <div className="flex items-center gap-1.5 text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <Compass className="w-3 h-3 text-[#E45318]" />
            <span>Ponto Ativo:</span>
            <strong className="text-slate-800 font-bold">{currentLat.toFixed(6)}, {currentLon.toFixed(6)}</strong>
            {activeRank && getRankBadge(activeRank)}
          </div>
        )}

        {statusMessage && (
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <Check className="w-3 h-3" />
            {statusMessage}
          </span>
        )}
      </div>
    </div>
  );
}

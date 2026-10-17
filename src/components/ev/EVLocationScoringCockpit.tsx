"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Compass, MapPin, Zap, TrendingUp, Clock, ShieldAlert, 
  CheckCircle2, AlertOctagon, HelpCircle, Navigation, 
  Sliders, BatteryCharging, DollarSign, Activity, FileText
} from "lucide-react";
import { 
  calculateLocationScore, 
  calculateScenarioProjections, 
  generate24HourLoadProfile, 
  LocationInputData, 
  CommercialAnchorType, 
  ElectricalGridCategory,
  AntigravityGeoPayload
} from "@/lib/ev/locationScoringEngine";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export interface EVLocationScoringCockpitProps {
  onApplyToProject?: (data: {
    powerKW: number;
    commercialAnchor: CommercialAnchorType;
    vdm: number;
    fleetDensity: number;
    gridCategory: ElectricalGridCategory;
    recommendation: string;
  }) => void;
}

export default function EVLocationScoringCockpit({ onApplyToProject }: EVLocationScoringCockpitProps = {}) {
  // ─── ESTADOS DOS PARÂMETROS DO LOCAL ANALISADO ───────────────────────────
  const [vdm, setVdm] = useState<number>(32000);
  const [fleetDensity, setFleetDensity] = useState<number>(2.4);
  const [anchor, setAnchor] = useState<CommercialAnchorType>('farmacia_24h');
  const [gridCategory, setGridCategory] = useState<ElectricalGridCategory>('bt_grupo_f_disponivel');
  const [availablePowerKW, setAvailablePowerKW] = useState<number>(120);
  const [chargerPowerKW, setChargerPowerKW] = useState<number>(120);
  const [isVerticalHousing, setIsVerticalHousing] = useState<boolean>(true);
  const [competitorDistanceKM, setCompetitorDistanceKM] = useState<number>(4.2);

  // Multiplicadores Binários de Restrição Fatal (Prod(Fj))
  const [hasConnectivity, setHasConnectivity] = useState<boolean>(true);
  const [isOutsideEnvArea, setIsOutsideEnvArea] = useState<boolean>(true);
  const [has24hAccess, setHas24hAccess] = useState<boolean>(true);
  const [isUtilityApproved, setIsUtilityApproved] = useState<boolean>(true);

  // Busca Geoespacial de Concorrentes via Haversine
  const [geoData, setGeoData] = useState<AntigravityGeoPayload | null>(null);
  const [searchRadiusKM, setSearchRadiusKM] = useState<number>(10.0);
  const [loadingGeo, setLoadingGeo] = useState<boolean>(false);

  // ─── MOTOR DE CÁLCULO CIENTÍFICO AHP & MCDA ──────────────────────────────
  const locationInput: LocationInputData = useMemo(() => ({
    vdmVehiclesPerDay: vdm,
    evFleetDensityPercent: fleetDensity,
    commercialAnchor: anchor,
    gridCategory,
    availablePowerKW,
    totalChargerPowerKW: chargerPowerKW,
    competitorDistanceKM,
    isVerticalHousingArea: isVerticalHousing,
    fatalFlaws: {
      has4gOrWifiConnectivity: hasConnectivity,
      isOutsideEnvironmentalProtectedArea: isOutsideEnvArea,
      hasPhysical24hAccess: has24hAccess,
      utilityFeasibilityApproved: isUtilityApproved
    }
  }), [
    vdm, fleetDensity, anchor, gridCategory, availablePowerKW, 
    chargerPowerKW, competitorDistanceKM, isVerticalHousing, 
    hasConnectivity, isOutsideEnvArea, has24hAccess, isUtilityApproved
  ]);

  const scoreResult = useMemo(() => {
    return calculateLocationScore(locationInput);
  }, [locationInput]);

  const scenarios = useMemo(() => {
    return calculateScenarioProjections(locationInput, 95000, 2.10, 0.85);
  }, [locationInput]);

  const loadCurve24h = useMemo(() => {
    return generate24HourLoadProfile(locationInput, 'Realista');
  }, [locationInput]);

  // Busca estações vizinhas via rota de API Haversine
  useEffect(() => {
    const fetchNearby = async () => {
      try {
        setLoadingGeo(true);
        const res = await fetch(`/api/ev/geo?lat=-19.9275&lon=-43.9558&raio=${searchRadiusKM}`);
        if (res.ok) {
          const data = await res.json();
          setGeoData(data);
        }
      } catch (err) {
        // Fallback silencioso
      } finally {
        setLoadingGeo(false);
      }
    };
    fetchNearby();
  }, [searchRadiusKM]);

  return (
    <div className="bg-[#0A192F] text-white p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
      {/* ─── CABEÇALHO DO COCKPIT AHP ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Compass className="w-3 h-3 text-[#E45318]" />
              Data-Driven Site Selection Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Modelo AHP / MCDA</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Scoring Científico de Localização para Eletropostos
          </h2>
          <p className="text-xs text-slate-400">
            Ponderação analítica de 4 macro-critérios (Rede 35%, Tráfego 30%, Dwell 20%, Concorrência 15%) com filtros binários eliminatórios.
          </p>
        </div>

        {/* Card do Score Global com Semáforo */}
        <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
          <div className="text-right">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Score Final Ponderado:</span>
            <div className="flex items-baseline gap-1 justify-end">
              <strong className={`text-2xl font-black font-mono ${
                scoreResult.fatalFlawMultiplier === 0 ? 'text-rose-500' :
                scoreResult.totalScore >= 80 ? 'text-[#00B356]' :
                scoreResult.totalScore >= 65 ? 'text-blue-400' : 'text-amber-400'
              }`}>
                {scoreResult.totalScore}
              </strong>
              <span className="text-xs text-slate-500 font-mono">/100</span>
            </div>
            <span className={`text-[10px] font-bold uppercase block ${
              scoreResult.fatalFlawMultiplier === 0 ? 'text-rose-400' :
              scoreResult.totalScore >= 80 ? 'text-[#00B356]' :
              scoreResult.totalScore >= 65 ? 'text-blue-400' : 'text-amber-400'
            }`}>
              {scoreResult.rating}
            </span>
          </div>

          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            scoreResult.fatalFlawMultiplier === 0 ? 'bg-rose-500/20 border-rose-500 text-rose-400' :
            scoreResult.totalScore >= 80 ? 'bg-emerald-500/20 border-emerald-500 text-[#00B356]' :
            scoreResult.totalScore >= 65 ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-amber-500/20 border-amber-500 text-amber-400'
          }`}>
            {scoreResult.fatalFlawMultiplier === 0 ? (
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          {onApplyToProject && (
            <button
              onClick={() => onApplyToProject({
                powerKW: chargerPowerKW,
                commercialAnchor: anchor,
                vdm,
                fleetDensity,
                gridCategory,
                recommendation: scoreResult.keyRecommendations[0] || scoreResult.executiveSummary
              })}
              className="bg-[#00B356] hover:bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
              title="Transferir parâmetros calculados de potência e âncora diretamente para o projeto elétrico"
            >
              <Zap className="w-4 h-4" />
              <span>Aplicar ao Projeto</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── ALERTA SE HOUVER VETO FATAL (FATAL FLAW) ─── */}
      {scoreResult.fatalFlawReasons.length > 0 && (
        <div className="p-4 bg-rose-950/60 border border-rose-600 rounded-2xl text-xs text-rose-200 space-y-1.5 animate-pulse">
          <div className="font-bold flex items-center gap-1.5 text-rose-300 uppercase tracking-wider">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            VETO SUMÁRIO DETECTADO (PROJETO INVIABILIZADO)
          </div>
          {scoreResult.fatalFlawReasons.map((reason, idx) => (
            <p key={idx} className="pl-6 text-[11px] font-mono">• {reason}</p>
          ))}
          <p className="pl-6 text-[10px] text-slate-400 pt-1">
            O multiplicador binário assumiu valor 0 (Prod(Fj) = 0), zerando o score final e evitando gastos desnecessários com vistorias de campo.
          </p>
        </div>
      )}

      {/* ─── OS 4 MACRO-PILARES AHP (PROGRESS CARDS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pilar 1: Rede Elétrica */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              1. Rede Elétrica
            </span>
            <span className="text-[10px] text-amber-400 font-mono font-bold">Peso: 35%</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xl font-black text-white font-mono">{scoreResult.gridReadinessScore}/100</span>
            <span className="text-[11px] text-slate-400 font-mono">+{(scoreResult.gridReadinessScore * 0.35).toFixed(1)} pts</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full" style={{ width: `${scoreResult.gridReadinessScore}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {gridCategory === 'bt_grupo_f_disponivel' ? 'CEMIG BT Grupo F (Dispensa MT)' : 'Média Tensão / Padrão Normal'}
          </span>
        </div>

        {/* Pilar 2: Demanda & Tráfego */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              2. Tráfego & Frota
            </span>
            <span className="text-[10px] text-blue-400 font-mono font-bold">Peso: 30%</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xl font-black text-white font-mono">{scoreResult.trafficAndFleetScore}/100</span>
            <span className="text-[11px] text-slate-400 font-mono">+{(scoreResult.trafficAndFleetScore * 0.30).toFixed(1)} pts</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${scoreResult.trafficAndFleetScore}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            VDM: {vdm.toLocaleString()} | Frota: {fleetDensity}%
          </span>
        </div>

        {/* Pilar 3: Dwell Time */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              3. Dwell & POI
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">Peso: 20%</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xl font-black text-white font-mono">{scoreResult.dwellTimeMatchScore}/100</span>
            <span className="text-[11px] text-slate-400 font-mono">+{(scoreResult.dwellTimeMatchScore * 0.20).toFixed(1)} pts</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${scoreResult.dwellTimeMatchScore}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 block truncate uppercase">
            {anchor.replace('_', ' ')}
          </span>
        </div>

        {/* Pilar 4: Concorrência */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-purple-400" />
              4. Concorrência
            </span>
            <span className="text-[10px] text-purple-400 font-mono font-bold">Peso: 15%</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xl font-black text-white font-mono">{scoreResult.competitionAndAccessScore}/100</span>
            <span className="text-[11px] text-slate-400 font-mono">+{(scoreResult.competitionAndAccessScore * 0.15).toFixed(1)} pts</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full" style={{ width: `${scoreResult.competitionAndAccessScore}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Próximo DC: {competitorDistanceKM} km de distância
          </span>
        </div>
      </div>

      {/* ─── PAINEL DE CONTROLES ANALÍTICOS (SIMULADOR DE CENÁRIOS EM TEMPO REAL) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800 text-xs">
        {/* Controle 1: VDM */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Tráfego da Via (VDM):</span>
            <strong className="text-white font-mono">{vdm.toLocaleString()} veíc/dia</strong>
          </div>
          <input
            type="range"
            min="2000"
            max="60000"
            step="1000"
            value={vdm}
            onChange={(e) => setVdm(Number(e.target.value))}
            className="w-full accent-[#E45318] cursor-pointer"
          />
        </div>

        {/* Controle 2: Frota VE */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Densidade Frota VE (%):</span>
            <strong className="text-blue-400 font-mono">{fleetDensity}%</strong>
          </div>
          <input
            type="range"
            min="0.5"
            max="6.0"
            step="0.1"
            value={fleetDensity}
            onChange={(e) => setFleetDensity(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>

        {/* Controle 3: Âncora Comercial */}
        <div className="space-y-1.5">
          <span className="text-slate-400 block">Âncora Comercial:</span>
          <select
            value={anchor}
            onChange={(e) => setAnchor(e.target.value as CommercialAnchorType)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="farmacia_24h">Farmácia 24h (Oportunidade 25min)</option>
            <option value="posto_combustivel">Posto de Combustível c/ Conveniência</option>
            <option value="supermercado">Supermercado (45-90 min)</option>
            <option value="shopping">Shopping Center (2-4h Destino)</option>
            <option value="hotel_resort">Hotel / Pernoite (Destino AC)</option>
            <option value="comercio_geral">Comércio de Rua Geral</option>
          </select>
        </div>

        {/* Controle 4: Infraestrutura Elétrica */}
        <div className="space-y-1.5">
          <span className="text-slate-400 block">Enquadramento Elétrico:</span>
          <select
            value={gridCategory}
            onChange={(e) => setGridCategory(e.target.value as ElectricalGridCategory)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="bt_grupo_f_disponivel">Baixa Tensão CEMIG Grupo F (até 800A)</option>
            <option value="mt_subestacao_existente">Média Tensão c/ Trafo Existente</option>
            <option value="bt_convencional_pequena">Baixa Tensão Normal (Aumento 200A)</option>
            <option value="mt_nova_necessaria">Subestação MT Nova Necessária</option>
          </select>
        </div>
      </div>

      {/* ─── FILTROS BINÁRIOS DE RESTRIÇÃO FATAL (CONDICIONANTES PROD(Fj)) ─── */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
        <span className="font-bold text-slate-300 uppercase tracking-wider block">
          Condicionantes Eliminatórias de Viabilidade (Filtros Fatais - Prod(Fj))
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={hasConnectivity}
              onChange={(e) => setHasConnectivity(e.target.checked)}
              className="accent-[#00B356] rounded"
            />
            <span className="text-slate-300 text-[11px]">Sinal 4G/Wi-Fi OK</span>
          </label>

          <label className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isOutsideEnvArea}
              onChange={(e) => setIsOutsideEnvArea(e.target.checked)}
              className="accent-[#00B356] rounded"
            />
            <span className="text-slate-300 text-[11px]">Fora de APP / Alagamento</span>
          </label>

          <label className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={has24hAccess}
              onChange={(e) => setHas24hAccess(e.target.checked)}
              className="accent-[#00B356] rounded"
            />
            <span className="text-slate-300 text-[11px]">Acesso Físico 24h</span>
          </label>

          <label className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isUtilityApproved}
              onChange={(e) => setIsUtilityApproved(e.target.checked)}
              className="accent-[#00B356] rounded"
            />
            <span className="text-slate-300 text-[11px]">Concessionária Viável</span>
          </label>
        </div>
      </div>

      {/* ─── BUSCA GEODÉSICA HAVERSINE (ELECTROMAPS / PLUGSHARE SCAN) ─── */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-purple-400" />
            Mapeamento Geodésico de Concorrentes (Fórmula de Haversine via DuckDB)
          </h4>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Raio de Análise:</span>
            <select
              value={searchRadiusKM}
              onChange={(e) => setSearchRadiusKM(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-purple-400 font-bold"
            >
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="15">15 km</option>
              <option value="25">25 km</option>
            </select>
          </div>
        </div>

        {/* Tabela Georreferenciada */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2 pr-3">Estação Identificada</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-right">Potência</th>
                <th className="py-2 pl-3 text-right">Distância (Haversine)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px] font-mono">
              {geoData?.estacoes?.map((st, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50">
                  <td className="py-2 pr-3 font-semibold text-white font-sans">{st.nome}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      st.status === 'Disponível' ? 'bg-emerald-500/10 text-[#00B356] border border-emerald-500/30' :
                      st.status === 'Ocupado' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {st.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-amber-400 font-bold">{st.potencia_kw} kW</td>
                  <td className="py-2 pl-3 text-right font-bold text-purple-400">{st.distancia_km} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── PROJEÇÃO EM 3 CENÁRIOS OPERACIONAIS ─── */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-[#00B356]" />
          Projeção Financeira & Operacional (3 Cenários de Sensibilidade)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scenarios.map((sc, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                sc.name === 'Realista'
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold uppercase text-white">{sc.name}</span>
                <span className="text-[10px] font-mono text-emerald-400">{sc.operatingHoursPerDay}h/dia úteis</span>
              </div>

              <div className="mt-3 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Sessões Diárias Estimadas:</span>
                  <span className="text-white font-bold">{sc.dailySessions} recargas</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Energia Faturada Mensal:</span>
                  <span className="text-white">{sc.monthlyKWh.toLocaleString()} kWh</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Receita Bruta Mensal:</span>
                  <span className="text-emerald-400 font-bold">R$ {sc.monthlyGrossRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Lucro Líquido Operacional:</span>
                  <span className="text-emerald-400 font-bold">R$ {sc.monthlyNetProfit.toLocaleString()}/mês</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-900">
                  <span>Payback Estimado:</span>
                  <span className="text-amber-400 font-bold">{sc.paybackMonths} meses</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { 
  Building2, Home, Zap, ShieldAlert, AlertTriangle, 
  CheckCircle2, Flame, Wind, Key, ShieldCheck, 
  Clock, Gauge, Info, Sparkles, HelpCircle, ArrowRight
} from "lucide-react";
import { 
  ApplicationMode, 
  CondoEnvironmentLocation, 
  FireSafetyChecklist, 
  CommercialHubOperationalData,
  UtilityId
} from "@/lib/coenergygo";

interface InstallationEnvironmentSelectorProps {
  applicationMode: ApplicationMode;
  onApplicationModeChange: (mode: ApplicationMode) => void;
  condoLocation: CondoEnvironmentLocation;
  onCondoLocationChange: (loc: CondoEnvironmentLocation) => void;
  fireSafety: FireSafetyChecklist;
  onFireSafetyChange: (updated: Partial<FireSafetyChecklist>) => void;
  commercialHub: CommercialHubOperationalData;
  onCommercialHubChange: (updated: Partial<CommercialHubOperationalData>) => void;
  onApplyPreset?: (presetType: "condo" | "hub") => void;
  utility?: UtilityId;
}

export default function InstallationEnvironmentSelector({
  applicationMode,
  onApplicationModeChange,
  condoLocation,
  onCondoLocationChange,
  fireSafety,
  onFireSafetyChange,
  commercialHub,
  onCommercialHubChange,
  onApplyPreset,
  utility = "CEMIG"
}: InstallationEnvironmentSelectorProps) {

  const isCondo = applicationMode === "condominio_frota";
  const isHub = applicationMode === "eletroposto_hub";
  const isIndividual = applicationMode === "individual";

  const isSubsolo = condoLocation === "subsolo_g1" || condoLocation === "subsolo_g2_inferior";

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#00B356] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Tipo de Instalação & Diretrizes
            </span>
            <span className="text-xs text-slate-400">Passo 1A.2</span>
          </div>
          <h2 className="text-xl font-bold text-[#0A192F] mt-1">
            Cenário de Instalação & Conformidade Normativa
          </h2>
          <p className="text-xs text-slate-500">
            Defina o ambiente físico, requisitos dos Corpos de Bombeiros (IT-41/IT-30) e dados operacionais de carga.
          </p>
        </div>

        {/* Modelos / Presets Rápidos */}
        {onApplyPreset && (
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase px-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Modelos:
            </span>
            <button
              type="button"
              onClick={() => onApplyPreset("condo")}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#0A192F] hover:border-slate-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Condomínio (4x 7.4kW)
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset("hub")}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#0A192F] hover:border-slate-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#E45318]" />
              Eletroposto (80kW DC + 22kW)
            </button>
          </div>
        )}
      </div>

      {/* 3 Modos de Aplicação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Modo 1: Residencial Individual */}
        <button
          type="button"
          onClick={() => onApplicationModeChange("individual")}
          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
            isIndividual 
              ? "border-[#E45318] bg-orange-50/20 shadow-sm" 
              : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-xl ${isIndividual ? "bg-[#E45318] text-white" : "bg-slate-100 text-slate-600"}`}>
              <Home className="w-5 h-5" />
            </div>
            {isIndividual && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#E45318] ring-4 ring-orange-100" />
            )}
          </div>
          <h3 className="font-bold text-sm text-[#0A192F]">Residencial / Individual</h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            Garagem unifamiliar privativa. Dimensionamento para 1 a 2 veículos com foco em recarga noturna lenta/semi-rápida.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ABNT NBR 17019 & NBR 5410
          </div>
        </button>

        {/* Modo 2: Condomínio / Coletivo */}
        <button
          type="button"
          onClick={() => onApplicationModeChange("condominio_frota")}
          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
            isCondo 
              ? "border-blue-600 bg-blue-50/20 shadow-sm" 
              : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-xl ${isCondo ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <Building2 className="w-5 h-5" />
            </div>
            {isCondo && (
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100" />
            )}
          </div>
          <h3 className="font-bold text-sm text-[#0A192F]">Condomínio / Multi-vagas AC</h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            Garagem compartilhada de edifícios residenciais ou comerciais. Fator de simultaneidade e regras de bombeiros.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            Corpo de Bombeiros (IT-41 / IT-30)
          </div>
        </button>

        {/* Modo 3: Eletroposto Comercial */}
        <button
          type="button"
          onClick={() => onApplicationModeChange("eletroposto_hub")}
          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
            isHub 
              ? "border-[#00B356] bg-emerald-50/20 shadow-sm" 
              : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-xl ${isHub ? "bg-[#00B356] text-white" : "bg-slate-100 text-slate-600"}`}>
              <Zap className="w-5 h-5" />
            </div>
            {isHub && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#00B356] ring-4 ring-emerald-100" />
            )}
          </div>
          <h3 className="font-bold text-sm text-[#0A192F]">Eletroposto Comercial (DC + AC)</h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            Hub de recarga rápida/ultrarrápida pública ou privada, frotas, postos de combustíveis e shoppings.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <Gauge className="w-3.5 h-3.5 text-emerald-600" />
            Alta Demanda & Média Tensão
          </div>
        </button>
      </div>

      {/* SEÇÃO DINÂMICA: REGRAS PARA CONDOMÍNIO / MULTI-VAGAS AC */}
      {isCondo && (
        <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                Localização Física da Garagem & Proteção contra Incêndio
              </span>
              <h4 className="text-sm font-bold text-[#0A192F] mt-1">
                Ambiente de Instalação e Legislação do Corpo de Bombeiros (IT-41 SP / IT-30 MG)
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Instruções Técnicas Vigentes</span>
            </div>
          </div>

          {/* Seletor de Localização Física */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Localização Física das Vagas de Recarga:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { id: "aberto", label: "Área Externa / Descoberta", desc: "Sem confinamento, ventilação livre" },
                { id: "terreo_coberto", label: "Térreo Coberto", desc: "Ventilação natural cruzada perimetral" },
                { id: "subsolo_g1", label: "Subsolo 1º Piso (G1)", desc: "Exige sistema de exaustão mecânica" },
                { id: "subsolo_g2_inferior", label: "Subsolo G2 ou Inferior", desc: "Alto risco de confinamento de gases" }
              ].map((loc) => {
                const isSelected = condoLocation === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => onCondoLocationChange(loc.id as CondoEnvironmentLocation)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-blue-600 shadow-xs text-blue-900"
                        : "bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="font-bold text-xs">{loc.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{loc.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alerta Crítico para Subsolo */}
          {isSubsolo && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-bold">
                  Atenção Especial para Instalações em Subsolo Confinado:
                </p>
                <p className="text-amber-800 leading-relaxed">
                  As instruções técnicas <strong>IT-41 (CBPMESP)</strong> e <strong>IT-30 (CBMMG)</strong> 
                  <strong> proíbem</strong> a instalação de carregadores rápidos em corrente contínua (DC) 
                  em subsolos sem aprovação especial de projeto de bombeiros. 
                  Para pontos AC, é obrigatória a instalação de sistema de corte emergencial remoto e ventilação mecânica para mitigação de vapores de eletrólito (fluorídrico/monóxido).
                </p>
              </div>
            </div>
          )}

          {/* Checklist Interativo dos Bombeiros */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Checklist Obrigatório de Prevenção e Combate a Incêndio (AVCB / CLCB):
              </label>
              <span className="text-[11px] text-slate-500">Marque os itens implementados</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[
                {
                  key: "hasEmergencyButtonWithin5m",
                  label: "Botão de Emergência (EPO) a ≤ 5m",
                  desc: "Comando de desenergização total imediata acessível ao usuário"
                },
                {
                  key: "hasExternalDisconnectSwitch",
                  label: "Chave Seccionadora Externa para Bombeiros",
                  desc: "Dispositivo de manobra no pavimento térreo fora da área de risco"
                },
                {
                  key: "hasSmokeDetection",
                  label: "Detecção Precoce de Fumaça Interligada",
                  desc: "Detectores ópticos/térmicos interligados à central de alarme predial"
                },
                {
                  key: "hasMechanicalExhaust",
                  label: "Ventilação / Exaustão Mecânica de Fumaça",
                  desc: "Sistema com vazão mínima de renovação forçada em caso de sinistro"
                },
                {
                  key: "hasMechanicalBollards",
                  label: "Balizadores Mecânicos de Proteção (Bollards)",
                  desc: "Tubos de aço ou barreiras contra impacto de rodas na carcaça do carregador"
                },
                {
                  key: "hasPhotoluminescentSignaling",
                  label: "Sinalização Fotoluminescente & Piso Verde",
                  desc: "Demarcação horizontal em tinta epóxi e placas NBR 13434 indicativas de rota"
                }
              ].map((item) => {
                const checked = Boolean(fireSafety[item.key as keyof FireSafetyChecklist]);
                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      checked 
                        ? "bg-emerald-50/40 border-emerald-300 text-slate-800" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onFireSafetyChange({ [item.key]: e.target.checked })}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">{item.label}</div>
                      <div className="text-[11px] text-slate-500 leading-tight">{item.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO DINÂMICA: DADOS OPERACIONAIS PARA ELETROPOSTO COMERCIAL */}
      {isHub && (
        <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase text-[#00B356] bg-emerald-100 px-2 py-0.5 rounded-md">
                Parâmetros Operacionais de Recarga & Modelagem de Pico
              </span>
              <h4 className="text-sm font-bold text-[#0A192F] mt-1">
                Variáveis para Simulação da Curva de Carga do Passo 2 (24 Horas)
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Dimensionamento de Fluxo Contínuo</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Previsão de Recargas/Dia */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recargas Previstas / Dia:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={commercialHub.forecastDailyCharges || 25}
                  onChange={(e) => onCommercialHubChange({ 
                    forecastDailyCharges: Math.max(1, parseInt(e.target.value) || 25) 
                  })}
                  className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[#0A192F] focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">veículos/dia</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Usado para distribuir as sessões na curva diária de 24h.
              </p>
            </div>

            {/* Tempo Médio de Permanência */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tempo Médio de Recarga:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="480"
                  value={commercialHub.averageSessionMinutes || 35}
                  onChange={(e) => onCommercialHubChange({ 
                    averageSessionMinutes: Math.max(5, parseInt(e.target.value) || 35) 
                  })}
                  className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[#0A192F] focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">minutos</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                35 min é a média para recarga DC 20% a 80%.
              </p>
            </div>

            {/* Tensão de Fornecimento da Rede Local */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tensão de Fornecimento:
              </label>
              <select
                value={commercialHub.gridSupplyVoltage ?? (utility === "CEMIG" ? 220 : 380)}
                onChange={(e) => onCommercialHubChange({ 
                  gridSupplyVoltage: Number(e.target.value) as 220 | 380 
                })}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[#0A192F] focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value={220}>220V / 127V Trifásico (Padrão CEMIG BT)</option>
                <option value={380}>380V / 220V Trifásico (Subestação / Outras)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                {(commercialHub.gridSupplyVoltage ?? (utility === "CEMIG" ? 220 : 380)) === 220
                  ? "⚡ Na rede 220V (CEMIG), carregadores 380V exigem Transformador Elevador."
                  : "✅ Alimentação 380V Fase-Fase (dispensa transformador elevador)."}
              </p>
            </div>
          </div>

          {/* NOTA TÉCNICA DIDÁTICA: O QUE INTERFERE NO DIMENSIONAMENTO? */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950 space-y-1">
              <p className="font-bold">
                Como as variáveis operacionais (Recargas/Dia e Tempo de Recarga) influenciam no projeto?
              </p>
              <p className="text-blue-900 leading-relaxed text-[11px]">
                • <strong>Dimensionamento Eletrotécnico Instantâneo (Cabos, Disjuntores e Transformador):</strong> É determinado <strong>exclusivamente pela potência nominal máxima contínua em kW</strong> dos carregadores ativos simultaneamente (critério da ABNT NBR 5410 e NBR 17019 com fator de carga contínua = 1,00).<br />
                • <strong>Consumo Acumulado de Energia (kWh/mês) & Curva Horária (Passo 2):</strong> O número de recargas/dia e a duração de cada sessão determinam a <strong>energia faturada em kWh/mês</strong> e a dispersão probabilística da demanda ao longo das 24 horas, permitindo avaliar a rentabilidade do eletroposto e o comportamento do pico.
              </p>
            </div>
          </div>

          {/* Opcionais de Infraestrutura do Eletroposto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border bg-white border-slate-200 cursor-pointer hover:border-slate-300">
              <input
                type="checkbox"
                checked={commercialHub.hasCanopy}
                onChange={(e) => onCommercialHubChange({ hasCanopy: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800">Cobertura Metálica / Canopy para Veículos</span>
                <p className="text-[11px] text-slate-500">Proteção contra intempéries e viabilidade de usina solar fotovoltaica no teto.</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border bg-white border-slate-200 cursor-pointer hover:border-slate-300">
              <input
                type="checkbox"
                checked={commercialHub.hasAutonomousPayment}
                onChange={(e) => onCommercialHubChange({ hasAutonomousPayment: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800">Totem / Pagamento Autônomo com Tarifação</span>
                <p className="text-[11px] text-slate-500">Terminal POS com cartão de crédito/débito e protocolo OCPP 1.6J/2.0.1 em nuvem.</p>
              </div>
            </label>
          </div>

          {/* ─── PAINEL DE MODELAGEM FINANCEIRA E BUSINESS PLAN (BLEV / COENERGYGO) ─── */}
          <div className="p-5 rounded-2xl bg-[#0A192F] text-white space-y-4 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-[#E45318]/20 text-[#E45318] font-bold text-xs">
                  R$
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Modelagem Financeira & Viabilidade de Negócios (Padrão BLEV)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Parâmetros para cálculo automático de Faturamento, Margem Líquida, Payback, TIR e VPL.
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-500/20 text-[#00B356] border border-emerald-500/30 px-2.5 py-1 rounded-full">
                Hub Comercial Ativo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tarifa de Venda ao Usuário */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Preço de Venda (R$/kWh):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="1.0"
                    max="5.0"
                    value={commercialHub.sellingPricePerKWh ?? 2.00}
                    onChange={(e) => onCommercialHubChange({ sellingPricePerKWh: Number(e.target.value) })}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Média BH: R$ 1,80 a R$ 2,40/kWh.</p>
              </div>

              {/* Custo de Energia Concessionária */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Custo Concessionária (R$/kWh):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="3.0"
                    value={commercialHub.gridEnergyCostPerKWh ?? 1.00}
                    onChange={(e) => onCommercialHubChange({ gridEnergyCostPerKWh: Number(e.target.value) })}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg text-amber-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">TUSD + TE + Impostos (CEMIG).</p>
              </div>

              {/* Custo de Energia Usina Solar (UFV) */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Custo Solar Fotovoltaico (R$/kWh):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.2"
                    max="1.5"
                    value={commercialHub.solarEnergyCostPerKWh ?? 0.50}
                    onChange={(e) => onCommercialHubChange({ solarEnergyCostPerKWh: Number(e.target.value) })}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg text-[#00B356] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Geração própria GD / Mercado Livre.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Estrutura Jurídica das Vagas */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Modelo do Ponto (CNAE 5229-0/99):
                </label>
                <select
                  value={commercialHub.realEstateModel ?? 'comodato'}
                  onChange={(e) => onCommercialHubChange({ realEstateModel: e.target.value as any })}
                  className="w-full text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="comodato">Comodato Gratuito (Ponto Próprio)</option>
                  <option value="aluguel_fixo">Aluguel Fixo Mensal</option>
                  <option value="revenue_share">Participação na Receita (%)</option>
                  <option value="misto">Modelo Misto (Fixo + %)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Cessão de vagas com âncora comercial.</p>
              </div>

              {/* OPEX Fixo por Ponto */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  OPEX Fixo Mensal / Ponto:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    value={commercialHub.fixedOpexPerPointBRL ?? 474}
                    onChange={(e) => onCommercialHubChange({ fixedOpexPerPointBRL: Number(e.target.value) })}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Seguro + Link 4G + Manutenção.</p>
              </div>

              {/* OPEX Variável (Gateway + Impostos) */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  OPEX Variável (% Faturamento):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercialHub.variableOpexPercent ?? 14}
                    onChange={(e) => onCommercialHubChange({ variableOpexPercent: Number(e.target.value) })}
                    className="w-full pr-8 pl-3 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">8% Gateway White-Label + 6% Tributos.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DICA TÉCNICA CONDICIONAL */}
      {isIndividual && (
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Orientação NBR 17019 / NBR 5410:</strong> Em instalações residenciais unifamiliares, 
            cada ponto de recarga deve ter um circuito terminal exclusivo protegido por disjuntor bipolar ou tripolar, 
            DPS Classe II e dispositivo DR Tipo A com sensibilidade de 30mA acompanhado de detecção de fuga em corrente contínua (RDC-DD 6mA CC).
          </div>
        </div>
      )}
    </div>
  );
}


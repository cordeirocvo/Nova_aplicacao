"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Compass, MapPin, Zap, TrendingUp, Clock, ShieldAlert, 
  CheckCircle2, AlertOctagon, HelpCircle, Navigation, 
  Sliders, BatteryCharging, DollarSign, Activity, FileText,
  Truck, Building2, Home, Car, Fuel, Store, Database, Layers,
  Table, Info, Search, CheckCircle, ExternalLink, ArrowRight, BookOpen,
  Code, Server, Map as MapIcon, Loader2, Plus, Trash2
} from "lucide-react";
import { CompetitorStationFeature } from "@/lib/coenergygo/types";
import { 
  calculateLocationScore, 
  calculateScenarioProjections, 
  generate24HourLoadProfile, 
  LocationInputData, 
  CommercialAnchorType, 
  ElectricalGridCategory,
  LocationNicheType,
  NICHE_PROFILES,
  AntigravityGeoPayload,
  MUNICIPAL_FLEET_CENSUS_MG,
  detectCityKeyFromContext,
  RoadHierarchyKey,
  ROAD_HIERARCHY_HCM_SPECS,
  OFFICIAL_ROAD_CORRIDORS_MG,
  getCityScaleTrafficFactor,
  calculateHcmVdm,
  detectRoadDefaultsFromContext,
  COMMERCIAL_ANCHOR_SPECS,
  evaluateDwellTimeAndEnergyMatch,
  formatPaybackMonthsAndYears,
  CustomRealEstatePartnershipOption,
  calculateHaversineDistanceKM,
  parseLocationInput,
  estimateDrivingDistanceKM
} from "@/lib/ev/locationScoringEngine";

// Importação dinâmica com ssr: false para compatibilidade perfeita com o Leaflet no Next.js
const EVStationMap = dynamic(() => import("./EVStationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full rounded-2xl bg-[#0A192F] border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#E45318] border-t-transparent animate-spin" />
      <span className="text-xs font-bold text-slate-300">Carregando Mapa de Eletropostos (Leaflet & OpenStreetMap)...</span>
    </div>
  )
});

export interface EVLocationScoringCockpitProps {
  projectId?: string | null;
  initialNiche?: LocationNicheType;
  initialLatitude?: number;
  initialLongitude?: number;
  initialAddress?: string;
  projectName?: string;
  utility?: string;
  installationNumber?: string;
  standardCategory?: string;
  standardBreakerA?: number;
  projectAvailablePowerKW?: number;
  projectExistingLoadKW?: number;
  projectHeadroomKW?: number;
  projectChargerPowerKW?: number;
  projectChargerDescription?: string;
  projectTotalCapexBRL?: number;
  isNewConnection?: boolean;
  targetNewCategory?: string;
  isExistingStandardAdequate?: boolean;
  // Parâmetros AHP persistidos no projeto (evitam perda de estado ao trocar de aba)
  savedNiche?: LocationNicheType;
  savedVdm?: number;
  savedFleetDensity?: number;
  savedFleetCount?: number;
  savedAnchor?: CommercialAnchorType;
  savedGridCategory?: ElectricalGridCategory;
  savedIsVerticalHousing?: boolean;
  savedTariffBRL?: number;
  savedEnergyCostBRL?: number;
  savedCapexBRL?: number;
  savedSessionMinutes?: number;
  savedCityKey?: string;
  savedCityTotalVehicles?: number;
  savedCityEvVehicles?: number;
  savedCorridorFactor?: number;
  savedFleetSourceMode?: 'censo_municipal' | 'manual_override';
  savedVdmSourceMode?: 'osm_hcm' | 'dnit_corridor' | 'field_count' | 'manual_override';
  savedRoadHierarchy?: RoadHierarchyKey;
  savedRoadLanes?: number;
  savedRoadOneway?: boolean;
  savedCorridorPresetKey?: string;
  savedFieldCountVehicles?: number;
  savedFieldCountMinutes?: number;
  savedFieldKFactor?: number;
  savedFieldDirectionMode?: 'ambos_sem_canteiro' | 'um_sentido_mao_dupla' | 'ambos_com_canteiro' | 'sentido_porta';
  savedSolarEnergyCostBRL?: number;
  savedEnergySourceMode?: 'concessionaria' | 'solar' | 'hibrido';
  savedSolarSharePercent?: number;
  savedRealEstateModel?: string;
  savedRevenueSharePercent?: number;
  savedFixedRentBRL?: number;
  savedVariableOpexPercent?: number;
  savedFixedOpexBRL?: number;
  savedCustomRealEstateModels?: CustomRealEstatePartnershipOption[];
  savedCustomCompetitors?: CompetitorStationFeature[];
  onAhpStateChange?: (updated: {
    ahpNiche?: string;
    ahpVdm?: number;
    ahpFleetDensityPercent?: number;
    ahpFleetCount?: number;
    ahpCommercialAnchor?: string;
    ahpGridCategory?: string;
    ahpIsVerticalHousing?: boolean;
    ahpTariffBRL?: number;
    ahpEnergyCostBRL?: number;
    ahpCapexBRL?: number;
    ahpSessionMinutes?: number;
    ahpCityKey?: string;
    ahpCityTotalVehicles?: number;
    ahpCityEvVehicles?: number;
    ahpCorridorFactor?: number;
    ahpFleetSourceMode?: 'censo_municipal' | 'manual_override';
    ahpVdmSourceMode?: 'osm_hcm' | 'dnit_corridor' | 'field_count' | 'manual_override';
    ahpRoadHierarchy?: string;
    ahpRoadLanes?: number;
    ahpRoadOneway?: boolean;
    ahpCorridorPresetKey?: string;
    ahpFieldCountVehicles?: number;
    ahpFieldCountMinutes?: number;
    ahpFieldKFactor?: number;
    ahpFieldDirectionMode?: 'ambos_sem_canteiro' | 'um_sentido_mao_dupla' | 'ambos_com_canteiro' | 'sentido_porta';
    ahpSolarEnergyCostBRL?: number;
    ahpEnergySourceMode?: 'concessionaria' | 'solar' | 'hibrido';
    ahpSolarSharePercent?: number;
    ahpRealEstateModel?: string;
    ahpRevenueSharePercent?: number;
    ahpFixedRentBRL?: number;
    ahpVariableOpexPercent?: number;
    ahpFixedOpexBRL?: number;
    ahpCustomRealEstateModels?: CustomRealEstatePartnershipOption[];
    ahpCustomCompetitors?: CompetitorStationFeature[];
    ahpCustomLatitude?: number;
    ahpCustomLongitude?: number;
    ahpLocationPreset?: string;
  }) => void;
  onApplyToProject?: (data: {
    powerKW: number;
    commercialAnchor: CommercialAnchorType;
    vdm: number;
    fleetDensity: number;
    fleetCount: number;
    gridCategory: ElectricalGridCategory;
    isVerticalHousing: boolean;
    tariffBRL: number;
    energyCostBRL: number;
    capexBRL: number;
    sessionMinutes: number;
    dailySessionsRealistic: number;
    totalScore: number;
    rating: string;
    recommendation: string;
    niche: LocationNicheType;
    cityKey: string;
    cityTotalVehicles: number;
    cityEvVehicles: number;
    corridorFactor: number;
    fleetSourceMode: 'censo_municipal' | 'manual_override';
    vdmSourceMode: 'osm_hcm' | 'dnit_corridor' | 'field_count' | 'manual_override';
    roadHierarchy: RoadHierarchyKey;
    roadLanes: number;
    roadOneway: boolean;
    corridorPresetKey: string;
    fieldCountVehicles: number;
    fieldCountMinutes: number;
    fieldKFactor: number;
    fieldDirectionMode: 'ambos_sem_canteiro' | 'um_sentido_mao_dupla' | 'ambos_com_canteiro' | 'sentido_porta';
  }) => void;
  onCoordinatesChange?: (coords: { lat: number; lon: number; address?: string }) => void;
}

export default function EVLocationScoringCockpit({
  projectId,
  initialNiche = 'urban_hub',
  initialLatitude = -19.471676,
  initialLongitude = -44.258735,
  initialAddress = "Endereço a definir",
  projectName,
  utility = 'CEMIG',
  installationNumber,
  standardCategory = 'C3',
  standardBreakerA,
  projectAvailablePowerKW,
  projectExistingLoadKW = 0,
  projectHeadroomKW,
  projectChargerPowerKW,
  projectChargerDescription,
  projectTotalCapexBRL,
  isNewConnection,
  targetNewCategory,
  isExistingStandardAdequate,
  savedNiche,
  savedVdm,
  savedFleetDensity,
  savedFleetCount,
  savedAnchor,
  savedGridCategory,
  savedIsVerticalHousing,
  savedTariffBRL,
  savedEnergyCostBRL,
  savedCapexBRL,
  savedSessionMinutes,
  savedCityKey,
  savedCityTotalVehicles,
  savedCityEvVehicles,
  savedCorridorFactor,
  savedFleetSourceMode,
  savedVdmSourceMode,
  savedRoadHierarchy,
  savedRoadLanes,
  savedRoadOneway,
  savedCorridorPresetKey,
  savedFieldCountVehicles,
  savedFieldCountMinutes,
  savedFieldKFactor,
  savedFieldDirectionMode,
  savedSolarEnergyCostBRL,
  savedEnergySourceMode,
  savedSolarSharePercent,
  savedRealEstateModel,
  savedRevenueSharePercent,
  savedFixedRentBRL,
  savedVariableOpexPercent,
  savedFixedOpexBRL,
  savedCustomRealEstateModels,
  savedCustomCompetitors,
  onAhpStateChange,
  onApplyToProject,
  onCoordinatesChange
}: EVLocationScoringCockpitProps = {}) {


  // ─── SELETOR DE NICHO DE MERCADO (OS 6 NICHOS HOMOLOGADOS) ────────────────
  const [selectedNiche, setSelectedNiche] = useState<LocationNicheType>(savedNiche || initialNiche);
  const [subTab, setSubTab] = useState<'cockpit' | 'discretizacao'>('cockpit');
  const [appliedSuccessBanner, setAppliedSuccessBanner] = useState<string | null>(null);

  // ─── COORDENADAS & LOCALIDADE GEOGRÁFICA ──────────────────────────────────
  const [currentLat, setCurrentLat] = useState<number>(initialLatitude);
  const [currentLon, setCurrentLon] = useState<number>(initialLongitude);
  const [currentAddress, setCurrentAddress] = useState<string>(initialAddress);
  const [locationPreset, setLocationPreset] = useState<string>('projeto_atual');

  // ─── ESTADOS DOS PARÂMETROS DO LOCAL ANALISADO (PERSISTENTES) ─────────────
  const [vdm, setVdm] = useState<number>(savedVdm ?? 18000);
  const [fleetDensity, setFleetDensity] = useState<number>(savedFleetDensity ?? 2.4);
  const [fleetCount, setFleetCount] = useState<number>(savedFleetCount ?? 25);
  const [anchor, setAnchor] = useState<CommercialAnchorType>(savedAnchor || 'farmacia_24h');
  const [gridCategory, setGridCategory] = useState<ElectricalGridCategory>(savedGridCategory || 'bt_grupo_f_disponivel');
  const [availablePowerKW, setAvailablePowerKW] = useState<number>(projectAvailablePowerKW || 75);
  const [chargerPowerKW, setChargerPowerKW] = useState<number>(projectChargerPowerKW || 60);
  const [isVerticalHousing, setIsVerticalHousing] = useState<boolean>(savedIsVerticalHousing ?? true);
  const [competitorDistanceKM, setCompetitorDistanceKM] = useState<number>(3.8);

  // ─── PREMISSAS DAS PROJEÇÕES FINANCEIRAS (AUDITÁVEIS E EDITÁVEIS) ─────────
  const [tariffPerKWh, setTariffPerKWh] = useState<number>(savedTariffBRL ?? 2.10);
  const [energyCostPerKWh, setEnergyCostPerKWh] = useState<number>(savedEnergyCostBRL ?? 0.85);
  const [solarEnergyCostPerKWh, setSolarEnergyCostPerKWh] = useState<number>(savedSolarEnergyCostBRL ?? 0.39);
  const [energySourceMode, setEnergySourceMode] = useState<'concessionaria' | 'solar' | 'hibrido'>(savedEnergySourceMode || 'concessionaria');
  const [solarSharePercent, setSolarSharePercent] = useState<number>(savedSolarSharePercent ?? 50);
  const [realEstateModel, setRealEstateModel] = useState<string>(savedRealEstateModel || 'comodato');
  const [revenueSharePercent, setRevenueSharePercent] = useState<number>(savedRevenueSharePercent ?? 10);
  const [fixedRentBRL, setFixedRentBRL] = useState<number>(savedFixedRentBRL ?? 500);
  const [variableOpexPercent, setVariableOpexPercent] = useState<number>(savedVariableOpexPercent ?? 12);
  const [fixedOpexBRL, setFixedOpexBRL] = useState<number>(savedFixedOpexBRL ?? 350);
  const [customRealEstateModels, setCustomRealEstateModels] = useState<CustomRealEstatePartnershipOption[]>(savedCustomRealEstateModels || []);
  const [showCustomPartnerModal, setShowCustomPartnerModal] = useState<boolean>(false);
  const [newPartnerLabel, setNewPartnerLabel] = useState<string>("");
  const [newPartnerShare, setNewPartnerShare] = useState<number>(12);
  const [newPartnerFixed, setNewPartnerFixed] = useState<number>(0);
  const [newPartnerBasis, setNewPartnerBasis] = useState<'gross' | 'net_margin'>('gross');
  const [estimatedCapexBRL, setEstimatedCapexBRL] = useState<number>(savedCapexBRL ?? projectTotalCapexBRL ?? 95000);
  const [avgSessionMinutes, setAvgSessionMinutes] = useState<number>(savedSessionMinutes ?? 35);

  // ─── CALCULADORA AUDITÁVEL DA FROTA MUNICIPAL (IBGE / SENATRAN / ABVE) ────
  const initialDetectedCityKey = savedCityKey || detectCityKeyFromContext(`${initialAddress || ''} ${projectName || ''}`);
  const initialCityCensus = MUNICIPAL_FLEET_CENSUS_MG[initialDetectedCityKey] || MUNICIPAL_FLEET_CENSUS_MG.sete_lagoas;

  const [selectedCityKey, setSelectedCityKey] = useState<string>(initialDetectedCityKey);
  const [cityTotalVehicles, setCityTotalVehicles] = useState<number>(savedCityTotalVehicles ?? initialCityCensus.totalLightVehicles);
  const [cityEvVehicles, setCityEvVehicles] = useState<number>(savedCityEvVehicles ?? initialCityCensus.evPluginVehicles);
  const [corridorFactor, setCorridorFactor] = useState<number>(savedCorridorFactor ?? initialCityCensus.defaultCorridorFactor);
  const [fleetSourceMode, setFleetSourceMode] = useState<'censo_municipal' | 'manual_override'>(savedFleetSourceMode || 'censo_municipal');

  const currentCityCensus = MUNICIPAL_FLEET_CENSUS_MG[selectedCityKey] || MUNICIPAL_FLEET_CENSUS_MG.sete_lagoas;
  const baseMunicipalEvPercent = cityTotalVehicles > 0 ? Number(((cityEvVehicles / cityTotalVehicles) * 100).toFixed(2)) : 0;

  // ─── CALCULADORA AUDITÁVEL DE TRÁFEGO VIÁRIO — VDM (COMBO 1 + 2 + 3) ──────
  const initialRoadDefaults = detectRoadDefaultsFromContext(`${initialAddress || ''} ${projectName || ''}`, initialDetectedCityKey);
  const [vdmSourceMode, setVdmSourceMode] = useState<'osm_hcm' | 'dnit_corridor' | 'field_count' | 'manual_override'>(savedVdmSourceMode || 'osm_hcm');
  const [roadHierarchy, setRoadHierarchy] = useState<RoadHierarchyKey>(savedRoadHierarchy || initialRoadDefaults.hierarchyKey);
  const [roadLanes, setRoadLanes] = useState<number>(savedRoadLanes ?? initialRoadDefaults.lanes);
  const [roadOneway, setRoadOneway] = useState<boolean>(savedRoadOneway ?? initialRoadDefaults.isOneway);
  const [corridorPresetKey, setCorridorPresetKey] = useState<string>(savedCorridorPresetKey || initialRoadDefaults.corridorKey);
  const [fieldCountVehicles, setFieldCountVehicles] = useState<number>(savedFieldCountVehicles ?? 45);
  const [fieldCountMinutes, setFieldCountMinutes] = useState<number>(savedFieldCountMinutes ?? 5);
  const [fieldKFactor, setFieldKFactor] = useState<number>(savedFieldKFactor ?? 0.065);
  const [fieldDirectionMode, setFieldDirectionMode] = useState<'ambos_sem_canteiro' | 'um_sentido_mao_dupla' | 'ambos_com_canteiro' | 'sentido_porta'>(
    savedFieldDirectionMode || 'ambos_sem_canteiro'
  );
  const [isInspectingOsmRoad, setIsInspectingOsmRoad] = useState<boolean>(false);
  const [osmDetectedRoadLabel, setOsmDetectedRoadLabel] = useState<string | null>(null);

  const currentRoadSpec = ROAD_HIERARCHY_HCM_SPECS[roadHierarchy] || ROAD_HIERARCHY_HCM_SPECS.coletora_bairro;
  const currentOfficialCorridor = OFFICIAL_ROAD_CORRIDORS_MG[corridorPresetKey] || OFFICIAL_ROAD_CORRIDORS_MG.sl_olavo_bilac;
  const cityScaleFactor = (roadHierarchy === 'rodovia_dupla' || roadHierarchy === 'rodovia_simples') ? 1.0 : getCityScaleTrafficFactor(cityTotalVehicles);
  const fieldDirectionMultiplier =
    fieldDirectionMode === 'um_sentido_mao_dupla' ? 2.0 :
    fieldDirectionMode === 'ambos_com_canteiro' ? 0.60 : 1.0;
  const fieldHourlyFlow = Math.round(fieldCountVehicles * (60 / Math.max(1, fieldCountMinutes)) * fieldDirectionMultiplier);
  const fieldCalculatedVdm = Math.max(500, Math.round((fieldHourlyFlow / Math.max(0.02, fieldKFactor)) / 50) * 50);

  const dwellEvaluation = useMemo(() => {
    return evaluateDwellTimeAndEnergyMatch(anchor, chargerPowerKW, avgSessionMinutes);
  }, [anchor, chargerPowerKW, avgSessionMinutes]);

  const handleInspectRoadOnOsm = async (targetLat = currentLat, targetLon = currentLon) => {
    try {
      setIsInspectingOsmRoad(true);
      const res = await fetch(`/api/ev/road-traffic?lat=${targetLat}&lon=${targetLon}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.mappedHierarchyKey) {
          const nextHierarchy = data.mappedHierarchyKey as RoadHierarchyKey;
          const nextLanes = Number(data.lanes) || 2;
          const nextOneway = Boolean(data.isOneway);
          const nextVdm = calculateHcmVdm(nextHierarchy, nextLanes, nextOneway, cityTotalVehicles);
          setRoadHierarchy(nextHierarchy);
          setRoadLanes(nextLanes);
          setRoadOneway(nextOneway);
          setVdmSourceMode('osm_hcm');
          setVdm(nextVdm);
          setOsmDetectedRoadLabel(
            `${data.roadName || 'Via Local'} (OSM tag: ${data.osmHighwayTag}, ${nextLanes} faixas, ${nextOneway ? 'Mão Única' : 'Mão Dupla'})`
          );
          if (onAhpStateChange) {
            onAhpStateChange({
              ahpVdm: nextVdm,
              ahpVdmSourceMode: 'osm_hcm',
              ahpRoadHierarchy: nextHierarchy,
              ahpRoadLanes: nextLanes,
              ahpRoadOneway: nextOneway
            });
          }
        }
      }
    } catch (e) {
      // Fallback silencioso
    } finally {
      setIsInspectingOsmRoad(false);
    }
  };

  // Multiplicadores Binários de Restrição Fatal (Prod(Fj))
  const [hasConnectivity, setHasConnectivity] = useState<boolean>(true);
  const [isOutsideEnvArea, setIsOutsideEnvArea] = useState<boolean>(true);
  const [has24hAccess, setHas24hAccess] = useState<boolean>(true);
  const [isUtilityApproved, setIsUtilityApproved] = useState<boolean>(true);

  // Busca Geoespacial de Concorrentes via Haversine & DuckDB
  const [geoData, setGeoData] = useState<AntigravityGeoPayload | null>(null);
  const [searchRadiusKM, setSearchRadiusKM] = useState<number>(20.0);
  const [loadingGeo, setLoadingGeo] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'map' | 'table' | 'split'>('map');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Concorrentes Personalizados / PlugShare / Vistoria de Campo
  const [customCompetitors, setCustomCompetitors] = useState<CompetitorStationFeature[]>(savedCustomCompetitors || []);
  const [manualStationName, setManualStationName] = useState<string>('');
  const [manualStationAddress, setManualStationAddress] = useState<string>('');
  const [manualStationPower, setManualStationPower] = useState<number>(60);
  const [isAddingManualStation, setIsAddingManualStation] = useState<boolean>(false);

  // Calibração Numérica Fina do Ponto Alvo (Ligação Nova / Coordenadas Exatas Google Maps)
  const [showTargetCalibrateModal, setShowTargetCalibrateModal] = useState<boolean>(false);
  const [customTargetLat, setCustomTargetLat] = useState<string>(currentLat ? currentLat.toString() : '-19.4703402');
  const [customTargetLon, setCustomTargetLon] = useState<string>(currentLon ? currentLon.toString() : '-44.2634043');
  const [targetSearchInput, setTargetSearchInput] = useState<string>('');
  const [isSearchingTarget, setIsSearchingTarget] = useState<boolean>(false);
  const [targetSearchSuccessFeedback, setTargetSearchSuccessFeedback] = useState<string | null>(null);
  const [targetCalibrateSuccess, setTargetCalibrateSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof currentLat === 'number') setCustomTargetLat(currentLat.toString());
    if (typeof currentLon === 'number') setCustomTargetLon(currentLon.toString());
  }, [currentLat, currentLon]);

  // Recupera coordenadas calibradas salvas localmente se existirem
  useEffect(() => {
    try {
      const savedKey = `coenergygo_calibrated_coords_${projectId || 'default'}`;
      const raw = localStorage.getItem(savedKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          if (initialLatitude === -19.471676 && parsed.lat !== -19.471676) {
            setCurrentLat(parsed.lat);
            setCurrentLon(parsed.lon);
            if (parsed.address) setCurrentAddress(parsed.address);
          }
        }
      }
    } catch (_) {}
  }, [projectId]);

  const handleSaveTargetCalibration = () => {
    const latN = parseFloat(customTargetLat);
    const lonN = parseFloat(customTargetLon);
    if (isNaN(latN) || isNaN(lonN) || latN < -90 || latN > 90 || lonN < -180 || lonN > 180) {
      alert("Coordenadas inválidas. Insira valores decimais válidos (ex: -19.4703402, -44.2634043).");
      return;
    }
    const cleanLat = Number(latN.toFixed(7));
    const cleanLon = Number(lonN.toFixed(7));
    setCurrentLat(cleanLat);
    setCurrentLon(cleanLon);
    setLocationPreset('personalizado');

    // Blindagem de persistência no localStorage imediata
    try {
      localStorage.setItem(`coenergygo_calibrated_coords_${projectId || 'default'}`, JSON.stringify({
        lat: cleanLat,
        lon: cleanLon,
        address: currentAddress
      }));
    } catch (_) {}

    onCoordinatesChange?.({
      lat: cleanLat,
      lon: cleanLon,
      address: currentAddress
    });

    onAhpStateChange?.({
      ahpCustomLatitude: cleanLat,
      ahpCustomLongitude: cleanLon,
      ahpLocationPreset: 'personalizado'
    });

    setTargetCalibrateSuccess(true);
    setTimeout(() => {
      setTargetCalibrateSuccess(false);
      setShowTargetCalibrateModal(false);
    }, 1200);
  };

  const handleSearchTargetAddress = async (queryToSearch?: string) => {
    const q = (queryToSearch || targetSearchInput || currentAddress || '').trim();
    if (!q || q.length < 3) {
      alert("Por favor, digite um endereço, número ou coordenadas válidas para buscar.");
      return;
    }
    try {
      setIsSearchingTarget(true);
      setTargetSearchSuccessFeedback(null);
      const res = await fetch(`/api/ev/geocode?address=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Erro na requisição de geocodificação");
      const data = await res.json();
      if (!data.success || typeof data.lat !== 'number' || typeof data.lon !== 'number') {
        alert(`Não foi possível localizar o endereço "${q}". Tente incluir a cidade ou cole as coordenadas decimais do Google Maps.`);
        return;
      }
      
      const cleanLat = Number(data.lat.toFixed(7));
      const cleanLon = Number(data.lon.toFixed(7));
      const newAddress = data.formattedAddress || q;

      setCurrentLat(cleanLat);
      setCurrentLon(cleanLon);
      setCurrentAddress(newAddress);
      setCustomTargetLat(cleanLat.toString());
      setCustomTargetLon(cleanLon.toString());
      setLocationPreset('personalizado');

      try {
        localStorage.setItem(`coenergygo_calibrated_coords_${projectId || 'default'}`, JSON.stringify({
          lat: cleanLat,
          lon: cleanLon,
          address: newAddress
        }));
      } catch (_) {}

      onCoordinatesChange?.({
        lat: cleanLat,
        lon: cleanLon,
        address: newAddress
      });

      onAhpStateChange?.({
        ahpCustomLatitude: cleanLat,
        ahpCustomLongitude: cleanLon,
        ahpLocationPreset: 'personalizado'
      });

      setTargetSearchSuccessFeedback(`✓ Localizado com precisão: ${cleanLat}, ${cleanLon}`);
      setTimeout(() => setTargetSearchSuccessFeedback(null), 5000);
    } catch (err: any) {
      alert(`Erro ao buscar endereço: ${err?.message || 'Serviço temporariamente indisponível'}`);
    } finally {
      setIsSearchingTarget(false);
    }
  };

  // Sincronizar automaticamente a Categoria de Rede do AHP com o status do padrão (Ligação Nova vs Existente)
  useEffect(() => {
    if (isNewConnection) {
      const isMT = targetNewCategory === 'A4' || targetNewCategory === 'A3a' || (targetNewCategory && targetNewCategory.includes('MT'));
      setGridCategory(isMT ? 'ligacao_nova_mt' : 'ligacao_nova_bt');
    } else if (isExistingStandardAdequate !== undefined) {
      setGridCategory(isExistingStandardAdequate ? 'bt_grupo_f_disponivel' : 'bt_convencional_pequena');
    }
  }, [isNewConnection, targetNewCategory, isExistingStandardAdequate]);

  // Sincronizar potência disponível e potência dos carregadores do projeto ativo
  useEffect(() => {
    if (typeof projectAvailablePowerKW === 'number' && projectAvailablePowerKW > 0) {
      setAvailablePowerKW(Number(projectAvailablePowerKW.toFixed(1)));
    }
  }, [projectAvailablePowerKW, projectId]);

  useEffect(() => {
    if (typeof projectChargerPowerKW === 'number' && projectChargerPowerKW > 0) {
      setChargerPowerKW(Number(projectChargerPowerKW.toFixed(1)));
    }
  }, [projectChargerPowerKW, projectId]);

  useEffect(() => {
    if (typeof savedTariffBRL === 'number' && savedTariffBRL > 0) setTariffPerKWh(savedTariffBRL);
    if (typeof savedEnergyCostBRL === 'number' && savedEnergyCostBRL > 0) setEnergyCostPerKWh(savedEnergyCostBRL);
    if (typeof savedSolarEnergyCostBRL === 'number' && savedSolarEnergyCostBRL > 0) setSolarEnergyCostPerKWh(savedSolarEnergyCostBRL);
    if (savedEnergySourceMode) setEnergySourceMode(savedEnergySourceMode);
    if (typeof savedSolarSharePercent === 'number') setSolarSharePercent(savedSolarSharePercent);
    if (savedRealEstateModel) setRealEstateModel(savedRealEstateModel);
    if (typeof savedRevenueSharePercent === 'number') setRevenueSharePercent(savedRevenueSharePercent);
    if (typeof savedFixedRentBRL === 'number') setFixedRentBRL(savedFixedRentBRL);
    if (typeof savedVariableOpexPercent === 'number') setVariableOpexPercent(savedVariableOpexPercent);
    if (typeof savedFixedOpexBRL === 'number') setFixedOpexBRL(savedFixedOpexBRL);
    if (Array.isArray(savedCustomRealEstateModels)) setCustomRealEstateModels(savedCustomRealEstateModels);
    if (Array.isArray(savedCustomCompetitors)) setCustomCompetitors(savedCustomCompetitors);
  }, [
    savedTariffBRL, savedEnergyCostBRL, savedSolarEnergyCostBRL, savedEnergySourceMode,
    savedSolarSharePercent, savedRealEstateModel, savedRevenueSharePercent, savedFixedRentBRL,
    savedVariableOpexPercent, savedFixedOpexBRL, savedCustomRealEstateModels, savedCustomCompetitors
  ]);

  // Sincronizar coordenadas quando as props mudarem a partir do projeto central (Single Source of Truth)
  useEffect(() => {
    if (typeof initialLatitude === 'number' && initialLatitude !== currentLat) {
      setCurrentLat(initialLatitude);
    }
    if (typeof initialLongitude === 'number' && initialLongitude !== currentLon) {
      setCurrentLon(initialLongitude);
    }
  }, [initialLatitude, initialLongitude]);

  // Sincronizar endereço e respeitar parâmetros salvos no projeto (só usa default da cidade se o projeto ainda não tiver valores salvos)
  useEffect(() => {
    if (initialAddress && initialAddress !== currentAddress) {
      setCurrentAddress(initialAddress);
    }
    if (typeof savedVdm === 'number' && savedVdm > 0) {
      setVdm(savedVdm);
    }
    if (typeof savedFleetDensity === 'number' && savedFleetDensity > 0) {
      setFleetDensity(savedFleetDensity);
    }
    if (typeof savedFleetCount === 'number' && savedFleetCount > 0) {
      setFleetCount(savedFleetCount);
    }
    if (savedAnchor) {
      setAnchor(savedAnchor);
    }
    if (savedNiche) {
      setSelectedNiche(savedNiche);
    }
    if (typeof savedTariffBRL === 'number' && savedTariffBRL > 0) {
      setTariffPerKWh(savedTariffBRL);
    }
    if (typeof savedEnergyCostBRL === 'number' && savedEnergyCostBRL > 0) {
      setEnergyCostPerKWh(savedEnergyCostBRL);
    }
    if (typeof savedCapexBRL === 'number' && savedCapexBRL > 0) {
      setEstimatedCapexBRL(savedCapexBRL);
    } else if (typeof projectTotalCapexBRL === 'number' && projectTotalCapexBRL > 0) {
      setEstimatedCapexBRL(Math.round(projectTotalCapexBRL));
    }
    if (typeof savedSessionMinutes === 'number' && savedSessionMinutes > 0) {
      setAvgSessionMinutes(savedSessionMinutes);
    }

    // Sincronizar dados salvos da calculadora municipal ou calibrar automaticamente pelo município do endereço
    const detectedKey = savedCityKey || detectCityKeyFromContext(`${initialAddress || ''} ${projectName || ''}`);
    const census = MUNICIPAL_FLEET_CENSUS_MG[detectedKey] || MUNICIPAL_FLEET_CENSUS_MG.sete_lagoas;
    setSelectedCityKey(detectedKey);

    const effectiveTotalVeh = (typeof savedCityTotalVehicles === 'number' && savedCityTotalVehicles > 0)
      ? savedCityTotalVehicles
      : census.totalLightVehicles;
    const effectiveEvVeh = (typeof savedCityEvVehicles === 'number' && savedCityEvVehicles > 0)
      ? savedCityEvVehicles
      : census.evPluginVehicles;
    const effectiveCorr = (typeof savedCorridorFactor === 'number' && savedCorridorFactor > 0)
      ? savedCorridorFactor
      : census.defaultCorridorFactor;

    setCityTotalVehicles(effectiveTotalVeh);
    setCityEvVehicles(effectiveEvVeh);
    setCorridorFactor(effectiveCorr);
    setFleetSourceMode(savedFleetSourceMode || 'censo_municipal');

    const roadDefs = detectRoadDefaultsFromContext(`${initialAddress || ''} ${projectName || ''}`, detectedKey);
    const effectiveRoadHierarchy = savedRoadHierarchy || roadDefs.hierarchyKey;
    const effectiveRoadLanes = (typeof savedRoadLanes === 'number' && savedRoadLanes > 0) ? savedRoadLanes : roadDefs.lanes;
    const effectiveRoadOneway = savedRoadOneway ?? roadDefs.isOneway;
    const effectiveCorridorKey = savedCorridorPresetKey || roadDefs.corridorKey;

    setRoadHierarchy(effectiveRoadHierarchy);
    setRoadLanes(effectiveRoadLanes);
    setRoadOneway(effectiveRoadOneway);
    setCorridorPresetKey(effectiveCorridorKey);
    setVdmSourceMode(savedVdmSourceMode || 'osm_hcm');
    if (typeof savedFieldCountVehicles === 'number') setFieldCountVehicles(savedFieldCountVehicles);
    if (typeof savedFieldCountMinutes === 'number') setFieldCountMinutes(savedFieldCountMinutes);
    if (typeof savedFieldKFactor === 'number') setFieldKFactor(savedFieldKFactor);
    if (savedFieldDirectionMode) setFieldDirectionMode(savedFieldDirectionMode);

    if (savedFleetDensity === undefined) {
      const calcDensity = Number(Math.min(6.0, Math.max(0.2, ((effectiveEvVeh / effectiveTotalVeh) * 100) * effectiveCorr)).toFixed(2));
      setFleetDensity(calcDensity);
    }

    if (savedVdm === undefined) {
      const hcmVdm = calculateHcmVdm(effectiveRoadHierarchy, effectiveRoadLanes, effectiveRoadOneway, effectiveTotalVeh);
      setVdm(hcmVdm);

      const combinedContext = `${initialAddress || ''} ${projectName || ''}`.toLowerCase();
      if (combinedContext.includes('montes claros') || combinedContext.includes('dangelis') || combinedContext.includes('br 251') || combinedContext.includes('br-251')) {
        setSelectedNiche('highway');
        setAnchor('posto_combustivel');
        setLocationPreset('montes_claros');
      } else if (combinedContext.includes('curvelo')) {
        setLocationPreset('curvelo_bias');
      } else if (combinedContext.includes('belo horizonte') || combinedContext.includes('savassi')) {
        setLocationPreset('bh_savassi');
      } else if (combinedContext.includes('sete lagoas') || combinedContext.includes('olavo bilac')) {
        setLocationPreset('sete_lagoas');
      } else {
        setLocationPreset('projeto_atual');
      }
    }
  }, [projectId, initialAddress, projectName]);

  // ─── HANDLER DE AJUSTE DIRETO PELO MAPA INTERATIVO (DRAG & DROP) ──────────
  const handleMapLocationChange = async (coords: { lat: number; lon: number; address?: string }) => {
    setCurrentLat(coords.lat);
    setCurrentLon(coords.lon);
    setLocationPreset('personalizado');

    // Se não veio o endereço pronto, busca o endereço reverso via Nominatim
    try {
      setIsGeocoding(true);
      const res = await fetch(`/api/ev/geocode?lat=${coords.lat}&lon=${coords.lon}&reverse=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.address) {
          setCurrentAddress(data.address);
          if (onCoordinatesChange) {
            onCoordinatesChange({ lat: coords.lat, lon: coords.lon, address: data.address });
          }
        }
      }
    } catch (e) {
      // Fallback
      if (onCoordinatesChange) {
        onCoordinatesChange({ lat: coords.lat, lon: coords.lon });
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  // ─── PRESETS DE LOCALIDADE ────────────────────────────────────────────────
  const handleSelectLocationPreset = (presetKey: string) => {
    setLocationPreset(presetKey);
    if (presetKey === 'sete_lagoas') {
      setCurrentLat(-19.471676);
      setCurrentLon(-44.258735);
      setCurrentAddress("Rua Olavo Bilac 1085, Canaã, Sete Lagoas - MG");
      setSelectedNiche('urban_hub');
      setChargerPowerKW(60);
      setAvailablePowerKW(75);
      setGridCategory('bt_grupo_f_disponivel');
      setAnchor('farmacia_24h');
      setVdm(18000);
      if (onCoordinatesChange) onCoordinatesChange({ lat: -19.471676, lon: -44.258735, address: "Rua Olavo Bilac 1085, Canaã, Sete Lagoas - MG" });
    } else if (presetKey === 'montes_claros') {
      setCurrentLat(-16.657055);
      setCurrentLon(-43.740725);
      setCurrentAddress("Rodovia BR-251 Km 514, Posto D'Angelis, Montes Claros - MG");
      setSelectedNiche('highway');
      setChargerPowerKW(160);
      setAvailablePowerKW(200);
      setGridCategory('mt_subestacao_existente');
      setAnchor('posto_combustivel');
      setVdm(28000);
      if (onCoordinatesChange) onCoordinatesChange({ lat: -16.657055, lon: -43.740725, address: "Rodovia BR-251 Km 514, Posto D'Angelis, Montes Claros - MG" });
    } else if (presetKey === 'curvelo_bias') {
      setCurrentLat(-18.763554);
      setCurrentLon(-44.422256);
      setCurrentAddress("Avenida Bias Fortes, 1928, Centro, Curvelo - MG");
      setSelectedNiche('urban_hub');
      setChargerPowerKW(60);
      setAvailablePowerKW(75);
      setGridCategory('bt_grupo_f_disponivel');
      setAnchor('comercio_geral');
      setVdm(16000);
      if (onCoordinatesChange) onCoordinatesChange({ lat: -18.763554, lon: -44.422256, address: "Avenida Bias Fortes, 1928, Centro, Curvelo - MG" });
    } else if (presetKey === 'bh_savassi') {
      setCurrentLat(-19.9380);
      setCurrentLon(-43.9350);
      setCurrentAddress("Av. Getúlio Vargas 1420, Savassi, Belo Horizonte - MG");
      setSelectedNiche('urban_hub');
      setChargerPowerKW(120);
      setVdm(32000);
      setFleetDensity(3.2);
      if (onCoordinatesChange) onCoordinatesChange({ lat: -19.9380, lon: -43.9350, address: "Av. Getúlio Vargas 1420, Savassi, Belo Horizonte - MG" });
    } else if (presetKey === 'rodovia_br040') {
      setCurrentLat(-18.7500);
      setCurrentLon(-44.4300);
      setCurrentAddress("Rodovia BR-040 Km 415, Posto Décio, Curvelo - MG");
      setSelectedNiche('highway');
      setChargerPowerKW(150);
      setVdm(38000);
      setAnchor('posto_combustivel');
      setGridCategory('mt_subestacao_existente');
      if (onCoordinatesChange) onCoordinatesChange({ lat: -18.7500, lon: -44.4300, address: "Rodovia BR-040 Km 415, Posto Décio, Curvelo - MG" });
    } else if (presetKey === 'shopping_sl') {
      setCurrentLat(-19.4480);
      setCurrentLon(-44.2520);
      setCurrentAddress("Shopping Sete Lagoas, Av. Otávio Campelo Ribeiro");
      setSelectedNiche('destination');
      setChargerPowerKW(30);
      setAnchor('shopping');
      setVdm(14000);
      if (onCoordinatesChange) onCoordinatesChange({ lat: -19.4480, lon: -44.2520, address: "Shopping Sete Lagoas, Av. Otávio Campelo Ribeiro" });
    }
  };


  // ─── APLICAÇÃO DE PRESETS INTELIGENTES AO MUDAR O NICHO ──────────────────
  const handleSelectNiche = (niche: LocationNicheType) => {
    setSelectedNiche(niche);
    switch (niche) {
      case 'highway':
        setChargerPowerKW(150);
        setAnchor('posto_combustivel');
        setGridCategory('mt_subestacao_existente');
        setVdm(38000);
        break;
      case 'urban_hub':
        setChargerPowerKW(60);
        setAnchor('farmacia_24h');
        setGridCategory('bt_grupo_f_disponivel');
        setVdm(18000);
        setIsVerticalHousing(true);
        break;
      case 'destination':
        setChargerPowerKW(22);
        setAnchor('shopping');
        setGridCategory('mt_subestacao_existente');
        setVdm(12000);
        break;
      case 'fleet_depot':
        setChargerPowerKW(60);
        setAnchor('comercio_geral');
        setGridCategory('bt_grupo_f_disponivel');
        setVdm(6000);
        setFleetCount(30);
        break;
      case 'heavy_duty':
        setChargerPowerKW(180);
        setAnchor('posto_combustivel');
        setGridCategory('mt_nova_necessaria');
        setVdm(28000);
        setFleetCount(15);
        break;
      case 'residential':
        setChargerPowerKW(7.4);
        setAnchor('comercio_geral');
        setGridCategory('bt_convencional_pequena');
        setVdm(3000);
        setIsVerticalHousing(true);
        break;
    }
  };

  // ─── MOTOR DE CÁLCULO CIENTÍFICO AHP & MCDA ──────────────────────────────
  const locationInput: LocationInputData = useMemo(() => ({
    niche: selectedNiche,
    vdmVehiclesPerDay: vdm,
    evFleetDensityPercent: fleetDensity,
    commercialAnchor: anchor,
    gridCategory,
    availablePowerKW,
    totalChargerPowerKW: chargerPowerKW,
    competitorDistanceKM,
    averageDwellTimeMinutes: avgSessionMinutes,
    isVerticalHousingArea: isVerticalHousing,
    fleetVehiclesCount: fleetCount,
    latitude: currentLat,
    longitude: currentLon,
    fatalFlaws: {
      has4gOrWifiConnectivity: hasConnectivity,
      isOutsideEnvironmentalProtectedArea: isOutsideEnvArea,
      hasPhysical24hAccess: has24hAccess,
      utilityFeasibilityApproved: isUtilityApproved
    }
  }), [
    selectedNiche, vdm, fleetDensity, anchor, gridCategory, availablePowerKW, 
    chargerPowerKW, competitorDistanceKM, avgSessionMinutes, isVerticalHousing, fleetCount,
    currentLat, currentLon, hasConnectivity, isOutsideEnvArea, has24hAccess, isUtilityApproved
  ]);

  const scoreResult = useMemo(() => {
    return calculateLocationScore(locationInput);
  }, [locationInput]);

  const scenarios = useMemo(() => {
    return calculateScenarioProjections(locationInput, estimatedCapexBRL, tariffPerKWh, energyCostPerKWh, {
      energySourceMode,
      solarEnergyCostPerKWh,
      solarSharePercent,
      realEstateModel,
      revenueSharePercent,
      fixedRentBRL,
      variableOpexPercent,
      fixedOpexBRL,
      customRealEstateModels
    });
  }, [
    locationInput, estimatedCapexBRL, tariffPerKWh, energyCostPerKWh,
    energySourceMode, solarEnergyCostPerKWh, solarSharePercent,
    realEstateModel, revenueSharePercent, fixedRentBRL,
    variableOpexPercent, fixedOpexBRL, customRealEstateModels
  ]);

  // Busca estações vizinhas via rota de API Haversine
  useEffect(() => {
    const fetchNearby = async () => {
      try {
        setLoadingGeo(true);
        const res = await fetch(`/api/ev/geo?lat=${currentLat}&lon=${currentLon}&raio=${searchRadiusKM}`);
        if (res.ok) {
          const data: AntigravityGeoPayload = await res.json();
          setGeoData(data);
        }
      } catch (err) {
        // Fallback silencioso
      } finally {
        setLoadingGeo(false);
      }
    };
    fetchNearby();
  }, [currentLat, currentLon, searchRadiusKM]);

  // Lista unificada e deduplicada de estações concorrentes (Manuais PlugShare + Automáticas Overpass/Google)
  const allRenderedStations = useMemo(() => {
    const manualList: CompetitorStationFeature[] = customCompetitors.map(c => {
      const dist = calculateHaversineDistanceKM(currentLat, currentLon, c.latitude, c.longitude);
      return {
        ...c,
        distancia_km: dist,
        distancia_rota_km: estimateDrivingDistanceKM(dist)
      };
    });

    const autoList: CompetitorStationFeature[] = (geoData?.estacoes || []).map((st, idx) => {
      const dist = typeof st.distancia_km === 'number' && st.distancia_km >= 0 
        ? st.distancia_km 
        : calculateHaversineDistanceKM(currentLat, currentLon, st.latitude, st.longitude);
      return {
        id: st.id_estacao || `auto_${idx}_${st.latitude.toFixed(4)}_${st.longitude.toFixed(4)}`,
        nome: st.nome,
        latitude: st.latitude,
        longitude: st.longitude,
        distancia_km: dist,
        distancia_rota_km: estimateDrivingDistanceKM(dist),
        potencia_kw: st.potencia_kw || 30,
        tipo_recarga: (st.potencia_kw || 0) >= 30 ? 'DC_RAPIDO' : 'AC_LENTO',
        operador: st.operador || 'OpenStreetMap / Places',
        endereco: st.endereco || `${st.latitude.toFixed(4)}, ${st.longitude.toFixed(4)}`,
        origem: (st as any).origem || 'OPENSTREETMAP',
        status: (st.status as any) || 'Disponível',
        conectores: st.conectores || ((st.potencia_kw || 0) >= 30 ? ['CCS2'] : ['Tipo 2']),
        isCalibrated: false
      };
    });

    // Deduplicação espacial: se uma estação manual estiver a menos de 120m de uma automática, dá preferência à manual
    const combined = [...manualList];
    for (const auto of autoList) {
      const isDuplicate = manualList.some(m => {
        const d = calculateHaversineDistanceKM(m.latitude, m.longitude, auto.latitude, auto.longitude);
        return d < 0.12; // 120 metros
      });
      if (!isDuplicate) {
        combined.push(auto);
      }
    }

    return combined.sort((a, b) => a.distancia_km - b.distancia_km);
  }, [customCompetitors, geoData, currentLat, currentLon]);

  // Recalcula dinamicamente a distância do concorrente mais próximo para alimentar o Pilar 5 (AHP)
  useEffect(() => {
    const externalStations = allRenderedStations.filter(st => st.distancia_km >= 0.08);
    if (externalStations.length > 0) {
      // Prioriza eletropostos DC rápidos (concorrentes diretos de alta potência) ou o mais próximo
      const dcStations = externalStations.filter(st => st.potencia_kw >= 30);
      const targetCompetitor = dcStations.length > 0 ? dcStations[0] : externalStations[0];
      setCompetitorDistanceKM(Number(targetCompetitor.distancia_km.toFixed(2)));
    } else {
      setCompetitorDistanceKM(searchRadiusKM);
    }
  }, [allRenderedStations, searchRadiusKM]);

  // Reposicionamento fino / calibração de concorrente manual arrastado no mapa
  const handleStationLocationChange = (stationId: string, coords: { lat: number; lon: number }) => {
    const updated = customCompetitors.map(st => {
      if (st.id === stationId) {
        const newDist = calculateHaversineDistanceKM(currentLat, currentLon, coords.lat, coords.lon);
        return {
          ...st,
          latitude: coords.lat,
          longitude: coords.lon,
          distancia_km: Number(newDist.toFixed(2)),
          distancia_rota_km: estimateDrivingDistanceKM(newDist),
          isCalibrated: true,
          metodo_posicionamento: 'arraste_mapa' as const
        };
      }
      return st;
    });
    setCustomCompetitors(updated);
    onAhpStateChange?.({
      ahpCustomCompetitors: updated
    });
  };

  // Adicionar eletroposto concorrente manual (PlugShare / Vistoria de Campo com suporte a Coordenadas GPS)
  const handleAddManualCompetitor = async () => {
    if (!manualStationAddress || manualStationAddress.trim().length === 0) {
      alert("Por favor, digite o endereço (ex: Av. Imbaúbas, 1676) OU coordenadas (ex: -18.9104592, -48.3037299).");
      return;
    }

    setIsAddingManualStation(true);
    try {
      const parsed = parseLocationInput(manualStationAddress);
      let targetLatFound = 0;
      let targetLonFound = 0;
      let targetAddressFound = '';
      let isCalibrated = false;
      let metodo: 'coordenadas_gps' | 'endereco_osm' = 'endereco_osm';

      if (parsed.type === 'coordinates') {
        // Coordenadas diretas (ex: -18.9104592, -48.3037299 ou Link do Maps)
        targetLatFound = parsed.lat;
        targetLonFound = parsed.lon;
        targetAddressFound = manualStationName.trim() || `Coordenadas (${parsed.lat.toFixed(6)}, ${parsed.lon.toFixed(6)})`;
        isCalibrated = true;
        metodo = 'coordenadas_gps';
      } else {
        // Endereço textual -> geocodifica
        let query = parsed.query;
        const detectedCity = detectCityKeyFromContext(currentAddress);
        const cityName = detectedCity === 'UBERLANDIA' ? 'Uberlândia' : 'Minas Gerais';
        
        if (!query.toLowerCase().includes('uberlândia') && !query.toLowerCase().includes('mg') && !query.toLowerCase().includes('brasil')) {
          query = `${query}, ${cityName} - MG, Brasil`;
        }

        const res = await fetch(`/api/ev/geocode?address=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Erro ao consultar serviço de geocodificação");
        const geo = await res.json();

        if (!geo.success || !geo.lat || !geo.lon) {
          alert(`Não foi possível localizar o endereço "${manualStationAddress}". Verifique o nome da rua ou insira diretamente as coordenadas de latitude e longitude do Google Maps.`);
          return;
        }
        targetLatFound = geo.lat;
        targetLonFound = geo.lon;
        targetAddressFound = geo.formattedAddress || manualStationAddress;
      }

      const dist = calculateHaversineDistanceKM(currentLat, currentLon, targetLatFound, targetLonFound);
      const isDC = manualStationPower >= 30;

      const newStation: CompetitorStationFeature = {
        id: `manual_${Date.now()}`,
        nome: manualStationName.trim() || `Eletroposto ${manualStationAddress.split(',')[0]}`,
        latitude: targetLatFound,
        longitude: targetLonFound,
        distancia_km: Number(dist.toFixed(2)),
        distancia_rota_km: estimateDrivingDistanceKM(dist),
        potencia_kw: manualStationPower,
        tipo_recarga: isDC ? 'DC_RAPIDO' : 'AC_LENTO',
        operador: 'PlugShare / Vistoria',
        endereco: targetAddressFound,
        origem: 'MANUAL_PLUGSHARE',
        status: 'Disponível',
        conectores: isDC ? ['CCS2', 'CHAdeMO'] : ['Tipo 2'],
        isCalibrated: isCalibrated,
        metodo_posicionamento: metodo
      };

      const updatedCompetitors = [newStation, ...customCompetitors];
      setCustomCompetitors(updatedCompetitors);
      
      onAhpStateChange?.({
        ahpCustomCompetitors: updatedCompetitors
      });

      setManualStationName('');
      setManualStationAddress('');
    } catch (e: any) {
      alert("Erro ao adicionar eletroposto: " + (e?.message || "Falha na localização"));
    } finally {
      setIsAddingManualStation(false);
    }
  };

  // Remover concorrente manual
  const handleRemoveManualCompetitor = (id: string) => {
    const updated = customCompetitors.filter(c => c.id !== id);
    setCustomCompetitors(updated);
    onAhpStateChange?.({
      ahpCustomCompetitors: updated
    });
  };

  const activeProfile = NICHE_PROFILES[selectedNiche] || NICHE_PROFILES.urban_hub;
  const weights = activeProfile.weights;

  return (
    <div className="bg-[#0A192F] text-white p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
      {/* ─── CABEÇALHO DO COCKPIT AHP ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase text-[#E45318] bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Compass className="w-3 h-3 text-[#E45318]" />
              Data-Driven Multi-Niche Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Modelo AHP Ponderado por Nicho</span>
            {projectName && (
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                {projectName}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Scoring de Localização & Inteligência de Mercado VE
          </h2>
          <p className="text-xs text-slate-400">
            Ponderação dinâmica de 5 dimensões analíticas ajustadas ao nicho do projeto, com filtros eliminatórios e concorrência geodésica.
          </p>
        </div>

        {/* Card do Score Global com Semáforo */}
        <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
          <div className="text-right">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Score Final Ponderado:</span>
            <div className="flex items-baseline gap-1 justify-end">
              <strong className={`text-2xl font-black font-mono ${
                scoreResult.fatalFlawMultiplier === 0 || scoreResult.totalScore < 50 ? 'text-rose-500' :
                scoreResult.totalScore >= 80 ? 'text-[#00B356]' :
                scoreResult.totalScore >= 65 ? 'text-blue-400' : 'text-amber-400'
              }`}>
                {scoreResult.totalScore.toFixed(1)}
              </strong>
              <span className="text-xs text-slate-500 font-mono">/100</span>
            </div>
            <span className={`text-[10px] font-bold uppercase block ${
              scoreResult.fatalFlawMultiplier === 0 || scoreResult.totalScore < 50 ? 'text-rose-400' :
              scoreResult.totalScore >= 80 ? 'text-[#00B356]' :
              scoreResult.totalScore >= 65 ? 'text-blue-400' : 'text-amber-400'
            }`}>
              {scoreResult.rating}
            </span>
          </div>

          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            scoreResult.fatalFlawMultiplier === 0 || scoreResult.totalScore < 50 ? 'bg-rose-500/20 border-rose-500 text-rose-400' :
            scoreResult.totalScore >= 80 ? 'bg-emerald-500/20 border-emerald-500 text-[#00B356]' :
            scoreResult.totalScore >= 65 ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-amber-500/20 border-amber-500 text-amber-400'
          }`}>
            {scoreResult.fatalFlawMultiplier === 0 || scoreResult.totalScore < 50 ? (
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          {onApplyToProject && (
            <button
              type="button"
              onClick={() => {
                const realisticScenario = scenarios.find(s => s.name === 'Realista') || scenarios[1];
                onApplyToProject({
                  powerKW: chargerPowerKW,
                  commercialAnchor: anchor,
                  vdm,
                  fleetDensity,
                  fleetCount,
                  gridCategory,
                  isVerticalHousing,
                  tariffBRL: tariffPerKWh,
                  energyCostBRL: energyCostPerKWh,
                  capexBRL: estimatedCapexBRL,
                  sessionMinutes: avgSessionMinutes,
                  dailySessionsRealistic: realisticScenario ? realisticScenario.dailySessions : 10,
                  totalScore: scoreResult.totalScore,
                  rating: scoreResult.rating,
                  recommendation: scoreResult.keyRecommendations[0] || scoreResult.executiveSummary,
                  niche: selectedNiche,
                  cityKey: selectedCityKey,
                  cityTotalVehicles,
                  cityEvVehicles,
                  corridorFactor,
                  fleetSourceMode,
                  vdmSourceMode,
                  roadHierarchy,
                  roadLanes,
                  roadOneway,
                  corridorPresetKey,
                  fieldCountVehicles,
                  fieldCountMinutes,
                  fieldKFactor,
                  fieldDirectionMode
                });
                setAppliedSuccessBanner(
                  `Parâmetros salvos no projeto "${projectName || 'Ativo'}"! Tráfego (VDM: ${vdm.toLocaleString('pt-BR')} veíc/dia), Frota VE (${fleetDensity}%), Âncora (${anchor.replace(/_/g, ' ')}), Sessões DLM (${realisticScenario?.dailySessions || 10}/dia) e Enquadramento Elétrico foram gravados permanentemente.`
                );
                setTimeout(() => setAppliedSuccessBanner(null), 8000);
              }}
              className="bg-[#00B356] hover:bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
              title="Salva permanentemente VDM, % Frota, Âncora, Projeções e sincroniza com o dimensionamento do projeto"
            >
              <Zap className="w-4 h-4" />
              <span>Aplicar ao Projeto</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── BANNER DE CONFIRMAÇÃO AO CLICAR EM "APLICAR AO PROJETO" ─── */}
      {appliedSuccessBanner && (
        <div className="bg-emerald-950/80 border-2 border-[#00B356] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#00B356] shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-300 font-bold block">✓ Dados Locacionais e Projeções Gravados com Sucesso!</strong>
              <span className="text-slate-200 text-[11px]">{appliedSuccessBanner}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAppliedSuccessBanner(null)}
            className="text-[10px] font-bold text-emerald-300 hover:text-white px-2.5 py-1 rounded-lg border border-emerald-500/40 shrink-0 self-end sm:self-center cursor-pointer"
          >
            Fechar aviso
          </button>
        </div>
      )}

      {/* ─── RÉGUA VISUAL DE FAIXAS DE ACEITABILIDADE DO SCORE AHP & O QUE MUDA NO PROJETO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-950/90 p-4 rounded-2xl border border-slate-800 text-xs">
        {/* Coluna Esquerda (7 cols): Faixas de Score Aceitável vs Não Aceitável */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#E45318]" />
              Régua Oficial de Decisão AHP — Faixas de Score Aceitável vs. Não Aceitável:
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400">
              Nota Mínima de Corte Aceitável: &ge; 50.0 pts
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className={`p-2.5 rounded-xl border transition-all ${
              scoreResult.fatalFlawMultiplier === 0 || scoreResult.totalScore < 50
                ? 'bg-rose-950/50 border-rose-500 ring-1 ring-rose-500/60'
                : 'bg-slate-900/60 border-slate-800 opacity-75'
            }`}>
              <div className="flex items-center justify-between font-mono font-black text-rose-400">
                <span>0 a 49.9 pts</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <strong className="text-white block mt-0.5 text-[11px]">NÃO ACEITÁVEL</strong>
              <span className="text-slate-400 block leading-tight mt-0.5">
                Abaixo do corte mínimo ou vetado. Exige revisão de ponto, redução de CAPEX ou DLM.
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border transition-all ${
              scoreResult.fatalFlawMultiplier === 1 && scoreResult.totalScore >= 50 && scoreResult.totalScore < 65
                ? 'bg-amber-950/50 border-amber-500 ring-1 ring-amber-500/60'
                : 'bg-slate-900/60 border-slate-800 opacity-75'
            }`}>
              <div className="flex items-center justify-between font-mono font-black text-amber-400">
                <span>50.0 a 64.9 pts</span>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <strong className="text-white block mt-0.5 text-[11px]">ACEITÁVEL (RESSALVAS)</strong>
              <span className="text-slate-400 block leading-tight mt-0.5">
                Faixa mínima aceitável. Viável com mitigação técnica (DLM) ou parceria comercial.
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border transition-all ${
              scoreResult.fatalFlawMultiplier === 1 && scoreResult.totalScore >= 65 && scoreResult.totalScore < 80
                ? 'bg-blue-950/50 border-blue-500 ring-1 ring-blue-500/60'
                : 'bg-slate-900/60 border-slate-800 opacity-75'
            }`}>
              <div className="flex items-center justify-between font-mono font-black text-blue-400">
                <span>65.0 a 79.9 pts</span>
                <span className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
              <strong className="text-white block mt-0.5 text-[11px]">MUITO BOM (APROVADO)</strong>
              <span className="text-slate-400 block leading-tight mt-0.5">
                Ponto comercialmente sólido, bom fluxo viário e payback atrativo.
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border transition-all ${
              scoreResult.fatalFlawMultiplier === 1 && scoreResult.totalScore >= 80
                ? 'bg-emerald-950/50 border-[#00B356] ring-1 ring-[#00B356]/60'
                : 'bg-slate-900/60 border-slate-800 opacity-75'
            }`}>
              <div className="flex items-center justify-between font-mono font-black text-[#00B356]">
                <span>80.0 a 100 pts</span>
                <span className="w-2 h-2 rounded-full bg-[#00B356]" />
              </div>
              <strong className="text-white block mt-0.5 text-[11px]">EXCELENTE (PREMIUM)</strong>
              <span className="text-slate-400 block leading-tight mt-0.5">
                Prioridade máxima de investimento: folga de rede elétrica + alta demanda VE.
              </span>
            </div>
          </div>
        </div>

        {/* Coluna Direita (5 cols): O que muda ao clicar em "Aplicar ao Projeto" */}
        <div className="lg:col-span-5 bg-slate-900/70 p-3 rounded-xl border border-slate-800/90 flex flex-col justify-between space-y-1.5">
          <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#00B356]" />
            O que muda ao clicar em &ldquo;Aplicar ao Projeto&rdquo;?
          </span>
          <ul className="text-[10px] text-slate-300 space-y-1 leading-relaxed">
            <li>• <strong>1. Salva Tráfego &amp; Frota:</strong> Grava permanentemente o VDM (<strong className="text-white">{vdm.toLocaleString('pt-BR')} veíc/dia</strong>), a Frota VE (<strong className="text-white">{fleetDensity}%</strong>) e a Âncora no cadastro do projeto ativo.</li>
            <li>• <strong>2. Alimenta o Passo 2 (Curva 24h &amp; DLM):</strong> Exporta a previsão de <strong className="text-emerald-400">{scenarios[1]?.dailySessions || 10} recargas/dia</strong> e o tempo de sessão (<strong className="text-white">{avgSessionMinutes} min</strong>) para o simulador de demanda.</li>
            <li>• <strong>3. Sincroniza Enquadramento Elétrico:</strong> Atualiza o Modo da Aplicação ({activeProfile.title.split('.')[1]?.trim() || activeProfile.title}) e o status de Ligação Nova/Existente no orçamento (BOM).</li>
          </ul>
        </div>
      </div>

      {/* ─── NAVEGAÇÃO DE SUB-ABAS: COCKPIT VS MEMÓRIA DE CÁLCULO / DISCRETIZAÇÃO ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('cockpit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'cockpit'
                ? 'bg-[#E45318] text-white shadow-lg shadow-orange-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Visão Cockpit & Simulador de Sensibilidade</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('discretizacao')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'discretizacao'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Memória de Cálculo & Discretização Detalhada (Fotos 1 & 2)</span>
            <span className="bg-purple-500/30 text-purple-200 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-black">
              Auditoria
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 pr-2">
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span>Fonte: DuckDB OLAP + Parquet Local</span>
        </div>
      </div>

      {subTab === 'cockpit' ? (
        <>
          {/* ─── SELETOR DOS 6 NICHOS DE MERCADO ─── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#E45318]" />
                Selecione o Nicho do Projeto (Pesos Calibrados Dinamicamente):
              </span>
              <span className="text-[11px] text-orange-400 font-mono font-bold">
                Perfil Atual: {activeProfile.title}
              </span>
            </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Nicho 1: Rodoviário */}
          <button
            type="button"
            onClick={() => handleSelectNiche('highway')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedNiche === 'highway'
                ? 'bg-orange-500/20 border-[#E45318] shadow-lg'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Fuel className="w-4 h-4 text-orange-400" />
              <span>Rodoviário</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
              Viagens longas, DC 60-350kW, tráfego contínuo.
            </p>
          </button>

          {/* Nicho 2: Hub Urbano (Sete Lagoas) */}
          <button
            type="button"
            onClick={() => handleSelectNiche('urban_hub')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
              selectedNiche === 'urban_hub'
                ? 'bg-emerald-500/20 border-[#00B356] shadow-lg ring-1 ring-[#00B356]'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="absolute -top-1.5 -right-1 text-[8px] font-black uppercase bg-[#00B356] text-white px-1.5 py-0.2 rounded-full">
              Urbano DC
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Hub Urbano</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
              Ubers, táxis e prédios sem tomada. DC 30-120kW.
            </p>
          </button>

          {/* Nicho 3: Varejo de Destino */}
          <button
            type="button"
            onClick={() => handleSelectNiche('destination')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedNiche === 'destination'
                ? 'bg-blue-500/20 border-blue-500 shadow-lg'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Store className="w-4 h-4 text-blue-400" />
              <span>Varejo / Shopping</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
              Dwell time 1-4h. AC 7-22kW ou DC 30kW.
            </p>
          </button>

          {/* Nicho 4: Frotas Last-Mile */}
          <button
            type="button"
            onClick={() => handleSelectNiche('fleet_depot')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedNiche === 'fleet_depot'
                ? 'bg-amber-500/20 border-amber-500 shadow-lg'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Car className="w-4 h-4 text-amber-400" />
              <span>Frotas / Pátio</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
              Vans e delivery. Carga noturna concentrada.
            </p>
          </button>

          {/* Nicho 5: Transporte Pesado */}
          <button
            type="button"
            onClick={() => handleSelectNiche('heavy_duty')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedNiche === 'heavy_duty'
                ? 'bg-purple-500/20 border-purple-500 shadow-lg'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Truck className="w-4 h-4 text-purple-400" />
              <span>Pesados / MCS</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
              Caminhões e ônibus. Alta potência &gt;150kW.
            </p>
          </button>

          {/* Nicho 6: Residencial */}
          <button
            type="button"
            onClick={() => handleSelectNiche('residential')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedNiche === 'residential'
                ? 'bg-cyan-500/20 border-cyan-500 shadow-lg'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Home className="w-4 h-4 text-cyan-400" />
              <span>Residencial</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
              Prédios com rateio. AC 7.4kW com DLM.
            </p>
          </button>
        </div>
      </div>

      {/* ─── LOCALIDADE & COORDENADAS REAIS DO PONTO ─── */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#E45318]">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block flex items-center gap-1.5">
              Ponto Geodésico de Referência:
              {isGeocoding && (
                <span className="text-orange-400 font-bold text-[9px] flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Geocodificando...
                </span>
              )}
            </span>
            <strong className="text-white text-xs block truncate max-w-md" title={currentAddress}>
              {currentAddress}
            </strong>
            <span className="text-[10px] text-slate-400 font-mono">
              Lat: <strong className="text-orange-300">{currentLat.toFixed(4)}</strong> | Lon: <strong className="text-orange-300">{currentLon.toFixed(4)}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400">Ponto Rápido:</span>
          <select
            value={locationPreset}
            onChange={(e) => handleSelectLocationPreset(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
          >
            <option value="projeto_atual">📌 Endereço do Projeto Ativo ({projectName || 'Projeto Atual'})</option>
            <option value="montes_claros">Montes Claros - Posto D&apos;Angelis (BR-251 Km 514)</option>
            <option value="curvelo_bias">Curvelo - Av. Bias Fortes 1928 (Centro)</option>
            <option value="rodovia_br040">Curvelo - Posto Décio (Trevo BR-040)</option>
            <option value="sete_lagoas">Sete Lagoas - Olavo Bilac 1085 (Projeto Real C6 200A)</option>
            <option value="shopping_sl">Sete Lagoas - Shopping Sete Lagoas</option>
            <option value="bh_savassi">Belo Horizonte - Savassi Sul</option>
            <option value="personalizado">📍 Ponto Personalizado (Ajustado no Mapa)</option>
          </select>
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

      {/* ─── OS 5 MACRO-PILARES AHP COM PESOS DINÂMICOS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Pilar 1: Rede Elétrica */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 truncate">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              1. Rede Elétrica
            </span>
            <span className="text-[10px] text-amber-400 font-mono font-bold shrink-0">
              {Math.round(weights.grid * 100)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-lg font-black text-white font-mono">{scoreResult.gridReadinessScore}/100</span>
            <span className="text-[10px] text-slate-400 font-mono">+{(scoreResult.gridReadinessScore * weights.grid).toFixed(1)} pts</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full" style={{ width: `${scoreResult.gridReadinessScore}%` }} />
          </div>
          <span className="text-[9px] text-slate-400 block truncate">
            {gridCategory === 'bt_grupo_f_disponivel' 
              ? 'Padrão Existente Atende (R$ 0,00)' 
              : gridCategory === 'ligacao_nova_bt'
              ? '⚡ Ligação Nova BT (Padrão Novo no CAPEX)'
              : gridCategory === 'bt_convencional_pequena'
              ? 'Padrão Insuficiente (Requer Aumento)'
              : gridCategory === 'ligacao_nova_mt' || gridCategory === 'mt_nova_necessaria'
              ? 'Subestação MT Nova Necessária'
              : 'Padrão / Trafo Convencional'}
          </span>
        </div>

        {/* Pilar 2: Fluxo de Tráfego */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 truncate">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              2. Tráfego & Fluxo
            </span>
            <span className="text-[10px] text-blue-400 font-mono font-bold shrink-0">
              {Math.round(weights.traffic * 100)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-lg font-black text-white font-mono">{scoreResult.trafficScore}/100</span>
            <span className="text-[10px] text-slate-400 font-mono">+{(scoreResult.trafficScore * weights.traffic).toFixed(1)} pts</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${scoreResult.trafficScore}%` }} />
          </div>
          <span className="text-[9px] text-slate-400 block truncate">
            VDM: {vdm.toLocaleString()} veíc/dia
          </span>
        </div>

        {/* Pilar 3: Demanda & Frota Alvo */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 truncate">
              <Car className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              3. Frota Alvo
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold shrink-0">
              {Math.round(weights.fleet * 100)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-lg font-black text-white font-mono">{scoreResult.fleetScore}/100</span>
            <span className="text-[10px] text-slate-400 font-mono">+{(scoreResult.fleetScore * weights.fleet).toFixed(1)} pts</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${scoreResult.fleetScore}%` }} />
          </div>
          <span className="text-[9px] text-slate-400 block truncate">
            {selectedNiche === 'fleet_depot' || selectedNiche === 'heavy_duty' 
              ? `${fleetCount} veíc. dedicados` 
              : `Penetração: ${fleetDensity}% da frota`}
          </span>
        </div>

        {/* Pilar 4: Dwell Time */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              4. Dwell Time
            </span>
            <span className="text-[10px] text-purple-400 font-mono font-bold shrink-0">
              {Math.round(weights.dwell * 100)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-lg font-black text-white font-mono">{scoreResult.dwellTimeMatchScore}/100</span>
            <span className="text-[10px] text-slate-400 font-mono">+{(scoreResult.dwellTimeMatchScore * weights.dwell).toFixed(1)} pts</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full" style={{ width: `${scoreResult.dwellTimeMatchScore}%` }} />
          </div>
          <span className="text-[9px] text-slate-400 block truncate uppercase">
            {anchor.replace('_', ' ')}
          </span>
        </div>

        {/* Pilar 5: Concorrência */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 truncate">
              <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              5. Concorrência
            </span>
            <span className="text-[10px] text-cyan-400 font-mono font-bold shrink-0">
              {Math.round(weights.comp * 100)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-lg font-black text-white font-mono">{scoreResult.competitionAndAccessScore}/100</span>
            <span className="text-[10px] text-slate-400 font-mono">+{(scoreResult.competitionAndAccessScore * weights.comp).toFixed(1)} pts</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full" style={{ width: `${scoreResult.competitionAndAccessScore}%` }} />
          </div>
          <span className="text-[9px] text-slate-400 block truncate">
            Próximo DC: {competitorDistanceKM} km
          </span>
        </div>
      </div>

      {/* ─── PAINEL DE CONTROLES ANALÍTICOS (SIMULADOR DE CENÁRIOS EM TEMPO REAL) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800 text-xs">
        {/* Controle 1: VDM */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Tráfego da Via (VDM):</span>
            <strong className="text-white font-mono">{vdm.toLocaleString('pt-BR')} veíc/dia</strong>
          </div>
          <input
            type="range"
            min="1000"
            max="60000"
            step="200"
            value={vdm}
            onChange={(e) => {
              const val = Number(e.target.value);
              setVdm(val);
              setVdmSourceMode('manual_override');
              if (onAhpStateChange) onAhpStateChange({ ahpVdm: val, ahpVdmSourceMode: 'manual_override' });
            }}
            className="w-full accent-[#E45318] cursor-pointer"
          />
          <span className="text-[9px] text-slate-500 block font-mono">
            {vdmSourceMode === 'osm_hcm'
              ? `Calculado HCM: ${currentRoadSpec.shortLabel} (${roadLanes} faixas)`
              : vdmSourceMode === 'dnit_corridor'
              ? `Corredor Oficial: ${currentOfficialCorridor.name.slice(0, 26)}...`
              : vdmSourceMode === 'field_count'
              ? `Aferido em Campo: ${fieldCountVehicles} veíc/${fieldCountMinutes}min`
              : `Ajustado manualmente pelo projetista`}
          </span>
        </div>

        {/* Controle 2: Frota VE ou Quantidade de Veículos Dedicados */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">
              {selectedNiche === 'fleet_depot' || selectedNiche === 'heavy_duty' 
                ? 'Veículos na Garagem/Pátio:' 
                : 'Densidade Frota VE (%):'}
            </span>
            <strong className="text-blue-400 font-mono">
              {selectedNiche === 'fleet_depot' || selectedNiche === 'heavy_duty'
                ? `${fleetCount} un.`
                : `${fleetDensity}%`}
            </strong>
          </div>
          {selectedNiche === 'fleet_depot' || selectedNiche === 'heavy_duty' ? (
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={fleetCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFleetCount(val);
                if (onAhpStateChange) onAhpStateChange({ ahpFleetCount: val });
              }}
              className="w-full accent-blue-500 cursor-pointer"
            />
          ) : (
            <input
              type="range"
              min="0.2"
              max="6.0"
              step="0.05"
              value={fleetDensity}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFleetDensity(val);
                setFleetSourceMode('manual_override');
                if (onAhpStateChange) onAhpStateChange({ ahpFleetDensityPercent: val, ahpFleetSourceMode: 'manual_override' });
              }}
              className="w-full accent-blue-500 cursor-pointer"
            />
          )}
          <span className="text-[9px] text-slate-500 block font-mono">
            {fleetSourceMode === 'censo_municipal'
              ? `Calculado via Censo ${currentCityCensus.cityName} (${baseMunicipalEvPercent}% × ${corridorFactor}x)`
              : `Ajustado manualmente pelo projetista`}
          </span>
        </div>

        {/* Controle 3: Âncora Comercial (Opção 4 Homologada) */}
        <div className="space-y-1.5">
          <span className="text-slate-400 block">Âncora Comercial / Dwell:</span>
          <select
            value={anchor}
            onChange={(e) => {
              const val = e.target.value as CommercialAnchorType;
              const spec = COMMERCIAL_ANCHOR_SPECS[val] || COMMERCIAL_ANCHOR_SPECS.farmacia_24h;
              setAnchor(val);
              setAvgSessionMinutes(spec.defaultDwellMinutes);
              if (onAhpStateChange) onAhpStateChange({ ahpCommercialAnchor: val, ahpSessionMinutes: spec.defaultDwellMinutes });
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            {Object.values(COMMERCIAL_ANCHOR_SPECS).map(spec => (
              <option key={spec.key} value={spec.key}>
                {spec.label}
              </option>
            ))}
          </select>
          <span className="text-[9px] text-purple-300 font-mono block">
            Entrega: {dwellEvaluation.deliveredKWh} kWh (+{dwellEvaluation.addedRangeKM} km) em {avgSessionMinutes} min
          </span>
        </div>

        {/* Controle 4: Infraestrutura Elétrica */}
        <div className="space-y-1.5">
          <span className="text-slate-400 block">Enquadramento Concessionária:</span>
          <select
            value={gridCategory}
            onChange={(e) => {
              const val = e.target.value as ElectricalGridCategory;
              setGridCategory(val);
              if (onAhpStateChange) onAhpStateChange({ ahpGridCategory: val });
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="bt_grupo_f_disponivel">Padrão Existente Atende — BT C6 200A / Grupo F (Sem obra, R$ 0)</option>
            <option value="ligacao_nova_bt">⚡ Ligação Nova BT (Padrão Novo Homologado incluso no CAPEX)</option>
            <option value="bt_convencional_pequena">Padrão Existente Insuficiente — Requer Aumento de Carga</option>
            <option value="mt_subestacao_existente">Média Tensão c/ Trafo Existente</option>
            <option value="ligacao_nova_mt">⚡ Ligação Nova MT (Subestação Nova Necessária)</option>
            <option value="mt_nova_necessaria">Subestação MT Nova Necessária</option>
          </select>
        </div>
      </div>

      {/* ─── CALCULADORA AUDITÁVEL DE TRÁFEGO VIÁRIO — VDM (COMBO 1 + 2 + 3: OSM/HCM + BASE DNIT + AFERIÇÃO EM CAMPO) ─── */}
      <div className="bg-slate-950/90 p-5 rounded-3xl border border-blue-500/30 space-y-4 text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                Calculadora Auditável de Tráfego da Via — VDM (Combo 1, 2 e 3: Geometria OSM/HCM + Base DNIT + Aferição em Campo)
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                vdmSourceMode === 'osm_hcm'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                  : vdmSourceMode === 'dnit_corridor'
                  ? 'bg-emerald-500/15 text-[#00B356] border-emerald-500/40'
                  : vdmSourceMode === 'field_count'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
              }`}>
                {vdmSourceMode === 'osm_hcm'
                  ? `✓ Método 1 Ativo: Engenharia Viária HCM (${currentRoadSpec.shortLabel}, ${roadLanes} faixas)`
                  : vdmSourceMode === 'dnit_corridor'
                  ? `✓ Método 2 Ativo: Base Oficial ${currentOfficialCorridor.agencySource}`
                  : vdmSourceMode === 'field_count'
                  ? `✓ Método 3 Ativo: Aferição Física em Campo (${fieldCountVehicles} veíc/${fieldCountMinutes} min)`
                  : `✎ Ajuste Manual / Slider VDM (${vdm.toLocaleString('pt-BR')} veíc/dia)`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Escolha entre <strong className="text-white">1. Capacidade Física da Via (OpenStreetMap + HCM)</strong>, <strong className="text-white">2. Base Oficial DNIT/Radares</strong> ou <strong className="text-white">3. Contagem Real de 5/15 min na Porta do Cliente</strong>.
            </p>
          </div>

          {/* Links Oficiais Clicáveis de Auditoria Viária */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleInspectRoadOnOsm(currentLat, currentLon)}
              disabled={isInspectingOsmRoad}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Consultar Overpass API (OpenStreetMap) nas coordenadas atuais para detectar tipo da via, faixas e mão única/dupla"
            >
              {isInspectingOsmRoad ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              <span>{isInspectingOsmRoad ? 'Lendo Via OSM...' : 'Detectar Geometria da Via (OSM)'}</span>
            </button>
            <a
              href="https://servicos.dnit.gov.br/dadospnct"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
              title="Abrir portal oficial do Plano Nacional de Contagem de Tráfego (DNIT / PNCT)"
            >
              <ExternalLink className="w-3 h-3" />
              <span>DNIT / PNCT (Gov.br)</span>
            </a>
            <a
              href="https://www.der.mg.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
              title="Abrir portal do DER-MG (Departamento de Estradas de Rodagem de Minas Gerais)"
            >
              <ExternalLink className="w-3 h-3" />
              <span>DER-MG</span>
            </a>
            <a
              href={`https://www.openstreetmap.org/?mlat=${currentLat}&mlon=${currentLon}#map=18/${currentLat}/${currentLon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
              title="Inspecionar a via diretamente no mapa OpenStreetMap"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Ver Via no OSM</span>
            </a>
          </div>
        </div>

        {osmDetectedRoadLabel && (
          <div className="bg-blue-950/40 border border-blue-500/40 px-3 py-2 rounded-xl text-[11px] font-mono text-blue-200 flex items-center justify-between">
            <span>🛰️ Geometria detectada via OpenStreetMap: <strong className="text-white">{osmDetectedRoadLabel}</strong></span>
            <button
              type="button"
              onClick={() => setOsmDetectedRoadLabel(null)}
              className="text-[10px] text-blue-300 hover:text-white underline cursor-pointer"
            >
              Ocultar
            </button>
          </div>
        )}

        {/* Abas / Botões dos 3 Métodos do Combo (Opção 1, Opção 2 e Opção 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setVdmSourceMode('osm_hcm');
              const nextVdm = calculateHcmVdm(roadHierarchy, roadLanes, roadOneway, cityTotalVehicles);
              setVdm(nextVdm);
              if (onAhpStateChange) onAhpStateChange({ ahpVdm: nextVdm, ahpVdmSourceMode: 'osm_hcm' });
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              vdmSourceMode === 'osm_hcm'
                ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-blue-400">Opção 1 • Geometria da Via (HCM/OSM)</span>
              <span className="text-xs font-mono font-black text-white">
                {calculateHcmVdm(roadHierarchy, roadLanes, roadOneway, cityTotalVehicles).toLocaleString('pt-BR')} veíc/dia
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Calcula pela Hierarquia da Rua + Nº de Faixas + Sentido + Porte da Cidade ({cityScaleFactor.toFixed(2)}x).
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setVdmSourceMode('dnit_corridor');
              const cor = OFFICIAL_ROAD_CORRIDORS_MG[corridorPresetKey] || OFFICIAL_ROAD_CORRIDORS_MG.sl_olavo_bilac;
              setVdm(cor.officialVdm);
              setRoadHierarchy(cor.hierarchyKey);
              setRoadLanes(cor.lanes);
              setRoadOneway(cor.isOneway);
              if (onAhpStateChange) {
                onAhpStateChange({
                  ahpVdm: cor.officialVdm,
                  ahpVdmSourceMode: 'dnit_corridor',
                  ahpCorridorPresetKey: corridorPresetKey,
                  ahpRoadHierarchy: cor.hierarchyKey,
                  ahpRoadLanes: cor.lanes,
                  ahpRoadOneway: cor.isOneway
                });
              }
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              vdmSourceMode === 'dnit_corridor'
                ? 'bg-emerald-950/40 border-[#00B356] ring-1 ring-[#00B356]/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-emerald-400">Opção 2 • Base Oficial DNIT / Radares</span>
              <span className="text-xs font-mono font-black text-white">
                {currentOfficialCorridor.officialVdm.toLocaleString('pt-BR')} veíc/dia
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Volume homologado de postos de contagem do DNIT (PNCT), DER-MG e Secretarias Municipais.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setVdmSourceMode('field_count');
              setVdm(fieldCalculatedVdm);
              if (onAhpStateChange) {
                onAhpStateChange({
                  ahpVdm: fieldCalculatedVdm,
                  ahpVdmSourceMode: 'field_count',
                  ahpFieldCountVehicles: fieldCountVehicles,
                  ahpFieldCountMinutes: fieldCountMinutes,
                  ahpFieldKFactor: fieldKFactor
                });
              }
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              vdmSourceMode === 'field_count'
                ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-purple-400">Opção 3 • Aferição Rápida 5/15 min</span>
              <span className="text-xs font-mono font-black text-white">
                {fieldCalculatedVdm.toLocaleString('pt-BR')} veíc/dia
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Expande a contagem real na porta do cliente ({fieldCountVehicles} carros em {fieldCountMinutes} min) pelo Fator Horário K.
            </p>
          </button>
        </div>

        {/* Controles Detalhados conforme o Método Ativo */}
        {vdmSourceMode === 'dnit_corridor' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 font-mono">
            <div className="md:col-span-6 space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                Selecionar Rodovia ou Corredor Urbano Auditado (DNIT / DER-MG / Settran / BHTrans / Seltrans):
              </label>
              <select
                value={corridorPresetKey}
                onChange={(e) => {
                  const key = e.target.value;
                  const cor = OFFICIAL_ROAD_CORRIDORS_MG[key] || OFFICIAL_ROAD_CORRIDORS_MG.sl_olavo_bilac;
                  setCorridorPresetKey(key);
                  setVdm(cor.officialVdm);
                  setRoadHierarchy(cor.hierarchyKey);
                  setRoadLanes(cor.lanes);
                  setRoadOneway(cor.isOneway);
                  setVdmSourceMode('dnit_corridor');
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpVdm: cor.officialVdm,
                      ahpVdmSourceMode: 'dnit_corridor',
                      ahpCorridorPresetKey: key,
                      ahpRoadHierarchy: cor.hierarchyKey,
                      ahpRoadLanes: cor.lanes,
                      ahpRoadOneway: cor.isOneway
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                {Object.values(OFFICIAL_ROAD_CORRIDORS_MG).map(c => (
                  <option key={c.key} value={c.key}>
                    [{c.cityOrRegion}] {c.name} — {c.officialVdm.toLocaleString('pt-BR')} veíc/dia
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">Órgão / Fonte Oficial:</span>
              <div className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-400 font-bold truncate">
                {currentOfficialCorridor.agencySource}
              </div>
              <span className="text-[9px] text-slate-500 block">Geometria: {currentOfficialCorridor.lanes} faixas</span>
            </div>
            <div className="md:col-span-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[10px] text-emerald-300 uppercase font-sans font-bold">VDM Oficial Aplicado:</span>
              <strong className="text-lg font-black text-[#00B356]">
                {vdm.toLocaleString('pt-BR')} <span className="text-xs text-slate-300 font-normal">veíc/dia</span>
              </strong>
            </div>
          </div>
        ) : vdmSourceMode === 'field_count' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 font-mono">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                1. Veículos Contados:
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                value={fieldCountVehicles}
                onChange={(e) => {
                  const cnt = Math.max(1, Number(e.target.value));
                  setFieldCountVehicles(cnt);
                  const hFlow = Math.round(cnt * (60 / Math.max(1, fieldCountMinutes)) * fieldDirectionMultiplier);
                  const nextVdm = Math.max(500, Math.round((hFlow / Math.max(0.02, fieldKFactor)) / 50) * 50);
                  setVdm(nextVdm);
                  setVdmSourceMode('field_count');
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpVdm: nextVdm,
                      ahpVdmSourceMode: 'field_count',
                      ahpFieldCountVehicles: cnt
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-[9px] text-slate-500 block">Na calçada ou câmera CFTV</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                2. Tempo da Amostra:
              </label>
              <select
                value={String(fieldCountMinutes)}
                onChange={(e) => {
                  const mins = Number(e.target.value);
                  setFieldCountMinutes(mins);
                  const hFlow = Math.round(fieldCountVehicles * (60 / Math.max(1, mins)) * fieldDirectionMultiplier);
                  const nextVdm = Math.max(500, Math.round((hFlow / Math.max(0.02, fieldKFactor)) / 50) * 50);
                  setVdm(nextVdm);
                  setVdmSourceMode('field_count');
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpVdm: nextVdm,
                      ahpVdmSourceMode: 'field_count',
                      ahpFieldCountMinutes: mins
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-purple-300 focus:outline-none focus:border-purple-500"
              >
                <option value="5">5 minutos (×12 p/ hora)</option>
                <option value="10">10 minutos (×6 p/ hora)</option>
                <option value="15">15 minutos (×4 p/ hora)</option>
                <option value="30">30 minutos (×2 p/ hora)</option>
                <option value="60">60 minutos (1 hora cheia)</option>
              </select>
              <span className="text-[9px] text-purple-300 block">Fluxo útil: <strong>{fieldHourlyFlow} veíc/h</strong></span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                3. Modo da Contagem &amp; Canteiro:
              </label>
              <select
                value={fieldDirectionMode}
                onChange={(e) => {
                  const mode = e.target.value as 'ambos_sem_canteiro' | 'um_sentido_mao_dupla' | 'ambos_com_canteiro' | 'sentido_porta';
                  setFieldDirectionMode(mode);
                  const mult = mode === 'um_sentido_mao_dupla' ? 2.0 : mode === 'ambos_com_canteiro' ? 0.60 : 1.0;
                  const hFlow = Math.round(fieldCountVehicles * (60 / Math.max(1, fieldCountMinutes)) * mult);
                  const nextVdm = Math.max(500, Math.round((hFlow / Math.max(0.02, fieldKFactor)) / 50) * 50);
                  setVdm(nextVdm);
                  setVdmSourceMode('field_count');
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpVdm: nextVdm,
                      ahpVdmSourceMode: 'field_count',
                      ahpFieldDirectionMode: mode
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="ambos_sem_canteiro">Contei os 2 sentidos (Sem canteiro — 100%)</option>
                <option value="um_sentido_mao_dupla">Contei só 1 sentido (Mão dupla s/ canteiro — ×2.0)</option>
                <option value="ambos_com_canteiro">Contei os 2 sentidos (Com canteiro/barreira — ×0.60)</option>
                <option value="sentido_porta">Contei só sentido da porta (Mão única/Canteiro — 100%)</option>
              </select>
              <span className="text-[9px] text-slate-500 block">Fator capturável: <strong>{fieldDirectionMultiplier.toFixed(2)}x</strong></span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                4. Horário Medido (Fator K):
              </label>
              <select
                value={String(fieldKFactor)}
                onChange={(e) => {
                  const k = Number(e.target.value);
                  setFieldKFactor(k);
                  const hFlow = Math.round(fieldCountVehicles * (60 / Math.max(1, fieldCountMinutes)) * fieldDirectionMultiplier);
                  const nextVdm = Math.max(500, Math.round((hFlow / Math.max(0.02, k)) / 50) * 50);
                  setVdm(nextVdm);
                  setVdmSourceMode('field_count');
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpVdm: nextVdm,
                      ahpVdmSourceMode: 'field_count',
                      ahpFieldKFactor: k
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              >
                <option value="0.09">Horário de Pico (07h-09h / 17h-19h) — K = 9.0%</option>
                <option value="0.065">Horário Comercial Normal (09h-17h) — K = 6.5%</option>
                <option value="0.045">Entrepico / Sábado / Noite — K = 4.5%</option>
              </select>
              <span className="text-[9px] text-slate-500 block">Proporção da hora sobre 24h</span>
            </div>

            <div className="bg-purple-950/30 border border-purple-500/40 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[10px] text-purple-300 uppercase font-sans font-bold">5. VDM 24h Capturável:</span>
              <strong className="text-lg font-black text-white">
                {fieldCalculatedVdm.toLocaleString('pt-BR')} <span className="text-xs text-purple-300 font-normal">veíc/dia</span>
              </strong>
              <span className="text-[9px] text-slate-400">
                {fieldHourlyFlow} veíc/h ÷ {(fieldKFactor * 100).toFixed(1)}% = {fieldCalculatedVdm.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 font-mono">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                1. Classificação Hierárquica da Via:
              </label>
              <select
                value={roadHierarchy}
                onChange={(e) => {
                  const hKey = e.target.value as RoadHierarchyKey;
                  const spec = ROAD_HIERARCHY_HCM_SPECS[hKey] || ROAD_HIERARCHY_HCM_SPECS.coletora_bairro;
                  setRoadHierarchy(hKey);
                  setRoadLanes(spec.defaultLanes);
                  setVdmSourceMode('osm_hcm');
                  const nextVdm = calculateHcmVdm(hKey, spec.defaultLanes, roadOneway, cityTotalVehicles);
                  setVdm(nextVdm);
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpVdm: nextVdm,
                      ahpVdmSourceMode: 'osm_hcm',
                      ahpRoadHierarchy: hKey,
                      ahpRoadLanes: spec.defaultLanes
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              >
                {Object.values(ROAD_HIERARCHY_HCM_SPECS).map(spec => (
                  <option key={spec.key} value={spec.key}>
                    {spec.shortLabel} ({spec.baseDailyVolumePerLane.toLocaleString('pt-BR')} veíc/faixa)
                  </option>
                ))}
              </select>
              <span className="text-[9px] text-slate-500 block">Tag OSM: {currentRoadSpec.osmTags}</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                2. Nº de Faixas de Rolamento:
              </label>
              <select
                value={String(roadLanes)}
                onChange={(e) => {
                  const lns = Number(e.target.value);
                  setRoadLanes(lns);
                  setVdmSourceMode('osm_hcm');
                  const nextVdm = calculateHcmVdm(roadHierarchy, lns, roadOneway, cityTotalVehicles);
                  setVdm(nextVdm);
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpVdm: nextVdm,
                      ahpVdmSourceMode: 'osm_hcm',
                      ahpRoadLanes: lns
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-300 focus:outline-none focus:border-blue-500"
              >
                <option value="1">1 faixa (Via estreita)</option>
                <option value="2">2 faixas (1 por sentido ou dupla simples)</option>
                <option value="3">3 faixas (Corredor comercial)</option>
                <option value="4">4 faixas (2 por sentido — Avenida/BR)</option>
                <option value="6">6 faixas (3 por sentido — Eixo Arterial)</option>
                <option value="8">8 faixas (Via Expressa / Marginal)</option>
              </select>
              <span className="text-[9px] text-slate-500 block">Total de faixas ativas na seção</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                3. Sentido de Fluxo &amp; Porte Urbano:
              </label>
              <select
                value={roadOneway ? 'oneway' : 'twoway'}
                onChange={(e) => {
                  const isOne = e.target.value === 'oneway';
                  setRoadOneway(isOne);
                  setVdmSourceMode('osm_hcm');
                  const nextVdm = calculateHcmVdm(roadHierarchy, roadLanes, isOne, cityTotalVehicles);
                  setVdm(nextVdm);
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpVdm: nextVdm,
                      ahpVdmSourceMode: 'osm_hcm',
                      ahpRoadOneway: isOne
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              >
                <option value="twoway">Mão Dupla (Fluxo Bidirecional 1.0x)</option>
                <option value="oneway">Mão Única (Fluxo Unidirecional 0.78x)</option>
              </select>
              <span className="text-[9px] text-slate-500 block">
                Fator Porte {currentCityCensus.cityName}: <strong>{cityScaleFactor.toFixed(2)}x</strong>
              </span>
            </div>

            <div className="bg-blue-950/30 border border-blue-500/40 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[10px] text-blue-300 uppercase font-sans font-bold">4. VDM Calculado (HCM):</span>
              <strong className="text-lg font-black text-white">
                {vdm.toLocaleString('pt-BR')} <span className="text-xs text-blue-300 font-normal">veíc/dia</span>
              </strong>
              <span className="text-[9px] text-slate-400">
                {roadLanes} fx × {currentRoadSpec.baseDailyVolumePerLane.toLocaleString('pt-BR')} × {cityScaleFactor.toFixed(2)}x {roadOneway ? '× 0.78' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── CALCULADORA AUDITÁVEL DA FROTA MUNICIPAL (AÇÃO 1 + AÇÃO 2: IBGE / SENATRAN / ABVE) ─── */}
      {selectedNiche !== 'fleet_depot' && selectedNiche !== 'heavy_duty' && (
        <div className="bg-slate-950/90 p-5 rounded-3xl border border-emerald-500/30 space-y-4 text-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Car className="w-4 h-4 text-[#00B356]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Calculadora Auditável da Frota Alvo Municipal (IBGE + Senatran + ABVE)
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  fleetSourceMode === 'censo_municipal'
                    ? 'bg-emerald-500/15 text-[#00B356] border-emerald-500/40'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                }`}>
                  {fleetSourceMode === 'censo_municipal'
                    ? `✓ Fonte Ativa: Censo Oficial ${currentCityCensus.cityName} (${currentCityCensus.referencePeriod})`
                    : `✎ Fonte Ativa: Ajuste Manual / Override do Projetista (${currentCityCensus.cityName})`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Substitui estimativas genéricas pela divisão exata entre <strong className="text-white">Veículos Plug-in Emplacados (BEV + PHEV)</strong> e a <strong className="text-white">Frota Total de Automóveis/Leves do Município</strong>, ponderada pelo perfil da via.
              </p>
            </div>

            {/* Links Oficiais Clicáveis para Auditoria Externa */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={currentCityCensus.ibgeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                title={`Abrir página oficial da frota de ${currentCityCensus.cityName} no IBGE Cidades`}
              >
                <ExternalLink className="w-3 h-3" />
                <span>IBGE Frota ({currentCityCensus.cityName})</span>
              </a>
              <a
                href="https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/estatisticas-frota-de-veiculos-senatran"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-500/30 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                title="Baixar planilha oficial de Frota por Município e Combustível na Senatran (Gov.br)"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Senatran (Município/Combustível)</span>
              </a>
              <a
                href="https://abve.org.br/abve-data/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                title="Consultar painel ABVE Data de emplacamentos de veículos eletrificados"
              >
                <ExternalLink className="w-3 h-3" />
                <span>ABVE Data BI</span>
              </a>
            </div>
          </div>

          {/* 5 Colunas da Equação Municipal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono">
            {/* 1. Seletor de Município */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                1. Município de Referência:
              </label>
              <select
                value={selectedCityKey}
                onChange={(e) => {
                  const key = e.target.value;
                  const rec = MUNICIPAL_FLEET_CENSUS_MG[key] || MUNICIPAL_FLEET_CENSUS_MG.sete_lagoas;
                  setSelectedCityKey(key);
                  setCityTotalVehicles(rec.totalLightVehicles);
                  setCityEvVehicles(rec.evPluginVehicles);
                  setCorridorFactor(rec.defaultCorridorFactor);
                  setFleetSourceMode('censo_municipal');
                  const nextDensity = Number(Math.min(6.0, Math.max(0.2, ((rec.evPluginVehicles / rec.totalLightVehicles) * 100) * rec.defaultCorridorFactor)).toFixed(2));
                  setFleetDensity(nextDensity);
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpCityKey: key,
                      ahpCityTotalVehicles: rec.totalLightVehicles,
                      ahpCityEvVehicles: rec.evPluginVehicles,
                      ahpCorridorFactor: rec.defaultCorridorFactor,
                      ahpFleetDensityPercent: nextDensity,
                      ahpFleetSourceMode: 'censo_municipal'
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                {Object.values(MUNICIPAL_FLEET_CENSUS_MG).map(c => (
                  <option key={c.key} value={c.key}>
                    {c.cityName} ({c.uf})
                  </option>
                ))}
              </select>
              <span className="text-[9px] text-slate-500 block">Cód. IBGE: {currentCityCensus.ibgeCode}</span>
            </div>

            {/* 2. Frota Total de Leves do Município (IBGE) */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                2. Frota Leves Cidade (IBGE):
              </label>
              <input
                type="number"
                min="1000"
                max="10000000"
                step="500"
                value={cityTotalVehicles}
                onChange={(e) => {
                  const total = Math.max(1000, Number(e.target.value));
                  setCityTotalVehicles(total);
                  setFleetSourceMode('manual_override');
                  const nextDensity = Number(Math.min(6.0, Math.max(0.2, ((cityEvVehicles / total) * 100) * corridorFactor)).toFixed(2));
                  setFleetDensity(nextDensity);
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpCityTotalVehicles: total,
                      ahpFleetDensityPercent: nextDensity,
                      ahpFleetSourceMode: 'manual_override'
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[9px] text-slate-500 block">Automóveis + caminhonetes</span>
            </div>

            {/* 3. Frota Plug-in BEV + PHEV no Município (Senatran/ABVE) */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                3. Frota Plug-in (Senatran):
              </label>
              <input
                type="number"
                min="1"
                max="500000"
                step="10"
                value={cityEvVehicles}
                onChange={(e) => {
                  const evs = Math.max(1, Number(e.target.value));
                  setCityEvVehicles(evs);
                  setFleetSourceMode('manual_override');
                  const nextDensity = Number(Math.min(6.0, Math.max(0.2, ((evs / cityTotalVehicles) * 100) * corridorFactor)).toFixed(2));
                  setFleetDensity(nextDensity);
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpCityEvVehicles: evs,
                      ahpFleetDensityPercent: nextDensity,
                      ahpFleetSourceMode: 'manual_override'
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[9px] text-emerald-400/90 block">
                Base Municipal: <strong>{baseMunicipalEvPercent.toFixed(2)}%</strong> da frota
              </span>
            </div>

            {/* 4. Fator de Concentração Socioeconômica da Via */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-1">
              <label className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                4. Fator Concentração da Via:
              </label>
              <select
                value={String(corridorFactor)}
                onChange={(e) => {
                  const factor = Number(e.target.value);
                  setCorridorFactor(factor);
                  const nextDensity = Number(Math.min(6.0, Math.max(0.2, ((cityEvVehicles / cityTotalVehicles) * 100) * factor)).toFixed(2));
                  setFleetDensity(nextDensity);
                  if (onAhpStateChange) {
                    onAhpStateChange({
                      ahpCorridorFactor: factor,
                      ahpFleetDensityPercent: nextDensity
                    });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              >
                <option value="1">1.0x — Média Geral da Cidade</option>
                <option value="1.3">1.3x — Bairro Residencial Misto</option>
                <option value="1.5">1.5x — Via Arterial / Comercial Principal</option>
                <option value="1.7">1.7x — Entroncamento Urbano / BR</option>
                <option value="1.8">1.8x — Corredor Principal Polo Regional</option>
                <option value="2">2.0x — Eixo Nobre Renda A/B / Shopping</option>
                <option value="2.5">2.5x — Hub Rodoviário / Alta Concentração</option>
              </select>
              <span className="text-[9px] text-slate-500 block">Concentração de VEs no corredor</span>
            </div>

            {/* 5. Resultado Final Auditado + Botão Restaurar + Checkbox Habitação Vertical */}
            <div className="bg-emerald-950/30 p-3 rounded-2xl border border-emerald-500/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-300 uppercase font-sans font-bold">
                    5. Penetração na Via:
                  </span>
                  {fleetSourceMode === 'manual_override' && (
                    <button
                      type="button"
                      onClick={() => {
                        const rec = MUNICIPAL_FLEET_CENSUS_MG[selectedCityKey] || MUNICIPAL_FLEET_CENSUS_MG.sete_lagoas;
                        setCityTotalVehicles(rec.totalLightVehicles);
                        setCityEvVehicles(rec.evPluginVehicles);
                        setCorridorFactor(rec.defaultCorridorFactor);
                        setFleetSourceMode('censo_municipal');
                        const nextDensity = Number(Math.min(6.0, Math.max(0.2, ((rec.evPluginVehicles / rec.totalLightVehicles) * 100) * rec.defaultCorridorFactor)).toFixed(2));
                        setFleetDensity(nextDensity);
                        if (onAhpStateChange) {
                          onAhpStateChange({
                            ahpCityTotalVehicles: rec.totalLightVehicles,
                            ahpCityEvVehicles: rec.evPluginVehicles,
                            ahpCorridorFactor: rec.defaultCorridorFactor,
                            ahpFleetDensityPercent: nextDensity,
                            ahpFleetSourceMode: 'censo_municipal'
                          });
                        }
                      }}
                      className="text-[9px] text-amber-300 hover:text-white underline cursor-pointer font-sans"
                      title="Restaurar dados oficiais do Censo IBGE/Senatran desta cidade"
                    >
                      Restaurar Censo
                    </button>
                  )}
                </div>
                <div className="text-lg font-black text-[#00B356] mt-0.5">
                  {fleetDensity.toFixed(2)}% <span className="text-[10px] text-slate-300 font-normal">({Math.max(1, Math.round(vdm * (fleetDensity / 100)))} VEs/dia)</span>
                </div>
                <span className="text-[9px] text-slate-400 block">
                  {baseMunicipalEvPercent.toFixed(2)}% cid. × {corridorFactor.toFixed(1)}x = {(baseMunicipalEvPercent * corridorFactor).toFixed(2)}%
                </span>
              </div>

              <label className="flex items-center gap-1.5 pt-1.5 mt-1.5 border-t border-emerald-500/20 cursor-pointer font-sans">
                <input
                  type="checkbox"
                  checked={isVerticalHousing}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsVerticalHousing(checked);
                    if (onAhpStateChange) onAhpStateChange({ ahpIsVerticalHousing: checked });
                  }}
                  className="accent-[#00B356] rounded"
                />
                <span className="text-[10px] text-slate-200 font-medium">
                  Habitação Vertical (+20% nota)
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ─── PAINEL AUDITÁVEL DE DWELL TIME & SINERGIA ENERGÉTICA DA PARADA (OPÇÃO 4) ─── */}
      <div className="bg-slate-950/90 p-5 rounded-3xl border border-purple-500/30 space-y-3 text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                Auditoria de Dwell Time &amp; Entrega Energética por Parada (Pilar 4 — Opção 4)
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                dwellEvaluation.statusVerdict === 'match_perfeito'
                  ? 'bg-emerald-500/15 text-[#00B356] border-emerald-500/40'
                  : dwellEvaluation.statusVerdict === 'bom_atende'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                  : dwellEvaluation.statusVerdict === 'bloqueio_ocioso'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/40'
              }`}>
                Nota Dwell Time: {dwellEvaluation.dwellScore}/100 (+{(dwellEvaluation.dwellScore * weights.dwell).toFixed(1)} pts)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {dwellEvaluation.explanation}
            </p>
          </div>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded-xl shrink-0">
            Ref.: {dwellEvaluation.anchorSpec.benchmarkSource}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">1. Janela da Âncora ({dwellEvaluation.anchorSpec.shortLabel}):</span>
            <strong className="text-white text-sm block mt-0.5">{avgSessionMinutes} min <span className="text-[10px] text-slate-400 font-normal">(Típico: {dwellEvaluation.anchorSpec.typicalDwellRangeLabel})</span></strong>
            <span className="text-[9px] text-purple-300 block mt-0.5">Meta útil: {dwellEvaluation.anchorSpec.targetSessionKWh} kWh na parada</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">2. Energia Entregue na Sessão:</span>
            <strong className="text-emerald-400 text-sm block mt-0.5">{dwellEvaluation.deliveredKWh} kWh <span className="text-[10px] text-slate-300 font-normal">({chargerPowerKW} kW × {(avgSessionMinutes / 60).toFixed(2)}h × 0.82)</span></strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">Faixa ideal âncora: {dwellEvaluation.anchorSpec.idealMinKW} a {dwellEvaluation.anchorSpec.idealMaxKW} kW</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">3. Autonomia &amp; Bateria Recuperada:</span>
            <strong className="text-cyan-400 text-sm block mt-0.5">+{dwellEvaluation.addedRangeKM} km <span className="text-[10px] text-slate-300 font-normal">(+{dwellEvaluation.recoveredSocPercent}% SoC)</span></strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">Base: 6,0 km/kWh (Bateria 60 kWh)</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">4. Giro de Vaga &amp; Tempo p/ 80% SoC:</span>
            <strong className={`text-sm block mt-0.5 ${dwellEvaluation.idleBlockedMinutes > 45 ? 'text-amber-400' : 'text-white'}`}>
              {dwellEvaluation.minutesTo80PercentSoc} min p/ 36 kWh
            </strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              {dwellEvaluation.idleBlockedMinutes > 15
                ? `⚠️ Vaga ociosa por ~${dwellEvaluation.idleBlockedMinutes} min após carga`
                : '✓ Sem bloqueio ocioso de vaga'}
            </span>
          </div>
        </div>

        {/* Tabela Visível de Orientação das Âncoras Comerciais (ABRASCE / Abrasel) & Impactos de CAPEX */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              📋 Tabela de Orientação: Permanência do Varejo Brasileiro (ABRASCE / Abrasel) vs. Carregador Ideal &amp; Impacto no CAPEX
            </span>
            <span className="text-[10px] text-slate-400">
              Clique em qualquer linha para simular a âncora comercial com seu carregador atual (<strong className="text-white">{chargerPowerKW} kW</strong>)
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-2 px-3">Estabelecimento / Âncora Comercial</th>
                  <th className="py-2 px-3">Permanência (Dwell Time)</th>
                  <th className="py-2 px-3">Carregador Ideal Recomendado</th>
                  <th className="py-2 px-3">Com {chargerPowerKW} kW na Parada</th>
                  <th className="py-2 px-3">Impacto no CAPEX, Rede CEMIG &amp; Operação</th>
                  <th className="py-2 px-3 text-right">Nota Dwell</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {Object.values(COMMERCIAL_ANCHOR_SPECS).map((spec) => {
                  const isCurrentAnchor = anchor === spec.key;
                  const rowEval = evaluateDwellTimeAndEnergyMatch(
                    spec.key,
                    chargerPowerKW,
                    isCurrentAnchor ? avgSessionMinutes : spec.defaultDwellMinutes
                  );
                  const impactDescription =
                    rowEval.statusVerdict === 'match_perfeito'
                      ? (chargerPowerKW <= 75
                          ? '✓ Equilíbrio Ótimo: Cabe em BT C6 200A (s/ Subestação MT) e entrega 100% da meta.'
                          : '⚡ Alta Performance: Entrega 100% da meta, mas >75 kW exige Subestação MT.')
                      : rowEval.statusVerdict === 'bom_atende'
                      ? `✓ Bom Custo-Benefício: Menor CAPEX de equipamento/rede, atendendo ${Math.round((rowEval.deliveredKWh / spec.targetSessionKWh) * 100)}% da meta.`
                      : rowEval.statusVerdict === 'bloqueio_ocioso'
                      ? `⚠️ Alto CAPEX + Ociosidade: Atinge 80% em ${rowEval.minutesTo80PercentSoc} min e bloqueia a vaga por ~${rowEval.idleBlockedMinutes} min.`
                      : '🚨 Subdimensionado: Baixo CAPEX inicial, mas entrega pouca carga na parada (baixa receita/sessão).';

                  return (
                    <tr
                      key={spec.key}
                      onClick={() => {
                        setAnchor(spec.key);
                        setAvgSessionMinutes(spec.defaultDwellMinutes);
                        if (onAhpStateChange) {
                          onAhpStateChange({
                            ahpCommercialAnchor: spec.key,
                            ahpSessionMinutes: spec.defaultDwellMinutes
                          });
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isCurrentAnchor
                          ? 'bg-purple-950/40 border-l-2 border-l-purple-400'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isCurrentAnchor ? 'bg-purple-400' : 'bg-slate-700'}`} />
                          <span>{spec.shortLabel}</span>
                          {isCurrentAnchor && (
                            <span className="text-[9px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded">
                              Ativo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-purple-300 font-bold">
                        {spec.typicalDwellRangeLabel}
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-400 font-bold">
                        {spec.recommendedTechLabel}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-200">
                        <strong>{rowEval.deliveredKWh} kWh</strong> <span className="text-[10px] text-cyan-400">(+{rowEval.addedRangeKM} km)</span>
                      </td>
                      <td className="py-2 px-3 text-[10px] text-slate-300">
                        {impactDescription}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          rowEval.statusVerdict === 'match_perfeito'
                            ? 'bg-emerald-500/15 text-[#00B356] border-emerald-500/40'
                            : rowEval.statusVerdict === 'bom_atende'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                            : rowEval.statusVerdict === 'bloqueio_ocioso'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                        }`}>
                          {rowEval.dwellScore}/100
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            <span className="text-slate-300 text-[11px]">Acesso Físico Livre 24h</span>
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

      {/* ─── BUSCA GEODÉSICA HAVERSINE & MAPA INTERATIVO (ELECTROMAPS / OCM / OSM) ─── */}
      <div className="bg-slate-950 p-4 md:p-5 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider block">
                Inteligência Geoespacial & SIG
              </span>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Mapa Interativo de Concorrentes & Buffer OLAP
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Alternador de Modo de Visualização */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'map' ? 'bg-[#E45318] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Mapa</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'split' ? 'bg-[#E45318] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Mapa + Tabela</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'table' ? 'bg-[#E45318] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabela</span>
              </button>
            </div>

            {/* Seletor de Raio */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 font-mono">
              <span className="text-slate-400 text-[11px]">Raio:</span>
              <select
                value={searchRadiusKM}
                onChange={(e) => setSearchRadiusKM(Number(e.target.value))}
                className="bg-transparent text-purple-400 font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="15">15 km</option>
                <option value="20">20 km (Recomendado)</option>
                <option value="25">25 km</option>
                <option value="35">35 km</option>
                <option value="50">50 km</option>
              </select>
              {loadingGeo && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
            </div>

            {/* Botão de Calibração Numérica Fina do Ponto Alvo */}
            <button
              type="button"
              onClick={() => setShowTargetCalibrateModal(prev => !prev)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-slate-900 hover:bg-orange-500/20 text-orange-400 border border-orange-500/40"
              title="Calibrar coordenadas exatas do Ponto Alvo (Google Maps)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calibrar Ponto Alvo</span>
            </button>
          </div>
        </div>

        {/* Modal / Painel Inline de Calibração do Ponto Alvo */}
        {showTargetCalibrateModal && (
          <div className="bg-slate-900/95 border border-orange-500/50 rounded-2xl p-4 space-y-3.5 animate-in fade-in duration-200 shadow-xl shadow-black/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                  Calibração Geodésica do Ponto Alvo (Google Maps / Alta Precisão)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTargetCalibrateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Busca Inteligente por Endereço ou Link Google Maps */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
              <label className="text-[11px] font-bold text-slate-300 block">
                🔍 Buscar por Endereço, Número ou Link/Coordenadas do Google Maps:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={targetSearchInput}
                  onChange={(e) => setTargetSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchTargetAddress();
                    }
                  }}
                  placeholder="Ex: Rua Carlos Antônio Giordani, 1580, Sete Lagoas OU cole coordenadas -19.4703402, -44.2634043"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSearchTargetAddress()}
                  disabled={isSearchingTarget}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg px-4 py-2 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow"
                >
                  {isSearchingTarget ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Localizando...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Localizar no Mapa</span>
                    </>
                  )}
                </button>
              </div>
              {targetSearchSuccessFeedback && (
                <div className="text-emerald-400 text-[11px] font-medium animate-in fade-in flex items-center gap-1.5 pt-1">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{targetSearchSuccessFeedback}</span>
                </div>
              )}
            </div>

            {/* Inserção Numérica Direta de Latitude e Longitude */}
            <div className="border-t border-slate-800/80 pt-3">
              <p className="text-[11px] text-slate-300 mb-2">
                Ou insira/ajuste a latitude e longitude numéricas exatas com precisão milimétrica:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5">
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Latitude (ex: -19.4703402)</label>
                  <input
                    type="text"
                    value={customTargetLat}
                    onChange={(e) => setCustomTargetLat(e.target.value)}
                    placeholder="-19.4703402"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-mono">Longitude (ex: -44.2634043)</label>
                  <input
                    type="text"
                    value={customTargetLon}
                    onChange={(e) => setCustomTargetLon(e.target.value)}
                    placeholder="-44.2634043"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={handleSaveTargetCalibration}
                    className="w-full bg-[#E45318] hover:bg-orange-600 active:scale-95 text-white font-bold text-xs rounded-lg px-3 py-2 transition-all flex items-center justify-center gap-1.5 shadow"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                </div>
              </div>

              {targetCalibrateSuccess && (
                <div className="mt-2 text-emerald-400 text-xs font-bold animate-in fade-in flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>✓ Coordenadas salvas e sincronizadas com sucesso no projeto!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Barra Rápida de Adição Manual de Concorrentes (PlugShare / Vistoria de Campo) */}
        <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0 animate-pulse" />
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                Adicionar Concorrente Manual (PlugShare / Vistoria de Campo)
              </span>
              <span className="text-[10px] text-purple-300/80 bg-purple-500/10 px-2 py-0.5 rounded font-mono border border-purple-500/20">
                Pilar 5 Instantâneo
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {customCompetitors.length} {customCompetitors.length === 1 ? 'posto cadastrado' : 'postos cadastrados'} manualmente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-0.5">
            <div className="sm:col-span-4">
              <input
                type="text"
                placeholder="Nome do Posto (Ex: Posto Espigão ou Posto Tem Tem)"
                value={manualStationName}
                onChange={(e) => setManualStationName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="sm:col-span-5">
              <input
                type="text"
                placeholder="Endereço (Ex: Av. Imbaúbas, 1676) OU Coordenadas (Ex: -18.9104592, -48.3037299)"
                value={manualStationAddress}
                onChange={(e) => setManualStationAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddManualCompetitor();
                  }
                }}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono"
              />
            </div>
            <div className="sm:col-span-1">
              <select
                value={manualStationPower}
                onChange={(e) => setManualStationPower(Number(e.target.value))}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-2 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-purple-400"
                title="Potência do Carregador Concorrente"
              >
                <option value="22">22 kW (AC)</option>
                <option value="40">40 kW (DC)</option>
                <option value="50">50 kW (DC)</option>
                <option value="60">60 kW (DC)</option>
                <option value="80">80 kW (DC)</option>
                <option value="120">120 kW (DC)</option>
                <option value="150">150 kW (DC)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddManualCompetitor}
                disabled={isAddingManualStation}
                className="w-full h-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl px-3 py-2 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-950/50"
              >
                {isAddingManualStation ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar / Calibrar</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
            <span className="text-purple-400 font-bold">💡 Precisão Predial:</span>
            <span>Cole o endereço ou as coordenadas exatas do Google Maps (`-18.9104592, -48.3037299`). Você também pode arrastar o pino roxo no mapa para o lote exato.</span>
          </div>
        </div>

        {/* 1. Componente de Mapa Interativo Leaflet */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <EVStationMap
              targetLat={currentLat}
              targetLon={currentLon}
              targetAddress={currentAddress}
              targetName={projectName || "Ponto Proposto Cordeiro Energia"}
              stations={allRenderedStations}
              radiusKM={searchRadiusKM}
              isDraggable={true}
              onLocationChange={handleMapLocationChange}
              onStationLocationChange={handleStationLocationChange}
              className="h-[430px] w-full"
            />
          </div>
        )}

        {/* 2. Tabela Georreferenciada Detalhada */}
        {(viewMode === 'table' || viewMode === 'split') && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/40">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase bg-slate-900/80">
                  <th className="py-2.5 px-3">Estação Identificada</th>
                  <th className="py-2.5 px-3">Rede / Operador</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Potência</th>
                  <th className="py-2.5 px-3 text-right">Linha Reta (Haversine)</th>
                  <th className="py-2.5 px-3 text-right">Trajeto Est. (Carro)</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px] font-mono">
                {allRenderedStations.length > 0 ? (
                  allRenderedStations.map((st, idx) => (
                    <tr key={st.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white font-sans">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            st.origem === 'MANUAL_PLUGSHARE'
                              ? 'bg-purple-400 ring-2 ring-purple-400/30'
                              : st.status === 'Disponível'
                              ? 'bg-[#00B356]'
                              : st.status === 'Ocupado'
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          }`} />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="block">{st.nome}</span>
                              {st.origem === 'MANUAL_PLUGSHARE' && (
                                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                  PlugShare
                                </span>
                              )}
                              {st.isCalibrated && (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                                  GPS Calibrado
                                </span>
                              )}
                            </div>
                            {st.endereco && (
                              <span className="text-[10px] text-slate-500 font-normal block truncate max-w-xs">
                                {st.endereco}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">
                        {st.operador || 'Rede de Recarga'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          st.status === 'Disponível' ? 'bg-emerald-500/10 text-[#00B356] border border-emerald-500/30' :
                          st.status === 'Ocupado' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {st.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400 font-bold">{st.potencia_kw} kW</td>
                      <td className="py-2.5 px-3 text-right font-bold text-purple-400">
                        {st.distancia_km === 0 ? 'No Ponto (0 km)' : `${st.distancia_km.toFixed(2)} km`}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                        {st.distancia_km === 0 ? '-' : `~${(st.distancia_rota_km || (st.distancia_km * 1.28)).toFixed(2)} km`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {st.origem === 'MANUAL_PLUGSHARE' ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveManualCompetitor(st.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Remover concorrente manual"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono">Auto</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 font-mono">
                      <div className="space-y-1">
                        <p className="font-bold text-emerald-400">⚡ Vácuo de Mercado Total Detectado!</p>
                        <p className="text-[11px] text-slate-500">
                          Nenhum eletroposto concorrente ativo em um raio de {searchRadiusKM} km. Excelente viabilidade de penetração!
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ─── PROJEÇÃO EM 3 CENÁRIOS OPERACIONAIS COM AUDITORIA COMPLETA (FOTOS 01 E 02) ─── */}
      <div className="space-y-4 bg-slate-950/60 p-5 rounded-3xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#00B356]" />
              Modelagem Financeira (Padrão BLEV) &amp; Projeção em 3 Cenários (Fotos 01 &amp; 02)
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cálculos iniciados com os valores padrão do sistema (<strong className="text-white">{chargerPowerKW} kW</strong>, <strong className="text-emerald-400">{Math.max(1, Math.round(vdm * (fleetDensity / 100))).toLocaleString('pt-BR')} VEs/dia</strong>) e 100% editáveis abaixo (sincronizados com o Passo 1A).
            </p>
          </div>
          <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
            Fator Curva CC/CV: 82% (0.82) | Ciclo: 30 dias/mês
          </span>
        </div>

        {/* Barra de Alternância: Custo Concessionária vs Custo Solar Fotovoltaico vs Mix Híbrido + Modelo de Participação */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-slate-900/95 p-3.5 rounded-2xl border border-slate-800 text-xs">
          {/* Fonte de Energia: Concessionária vs Solar vs Híbrido */}
          <div className="lg:col-span-6 space-y-2 border-b lg:border-b-0 lg:border-r border-slate-800 pb-3 lg:pb-0 lg:pr-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-300">
                1. Alternar Fonte de Custo de Energia (Rede vs. Solar):
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                Efetivo: R$ {(scenarios[1]?.energyCostPerKWh ?? energyCostPerKWh).toFixed(2)}/kWh
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'concessionaria', label: '⚡ Concessionária' },
                { id: 'solar', label: '☀️ Energia Solar' },
                { id: 'hibrido', label: '🔄 Mix Híbrido' }
              ].map((m) => {
                const active = energySourceMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setEnergySourceMode(m.id as any);
                      if (onAhpStateChange) onAhpStateChange({ ahpEnergySourceMode: m.id as any });
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#00B356] text-white border-emerald-400 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            {energySourceMode === 'hibrido' && (
              <div className="flex items-center justify-between gap-2 pt-1 text-[10px]">
                <span className="text-emerald-300 font-mono">
                  Mix: <strong>{solarSharePercent}% Solar</strong> (R$ {solarEnergyCostPerKWh.toFixed(2)}) + <strong>{100 - solarSharePercent}% Rede</strong> (R$ {energyCostPerKWh.toFixed(2)})
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={solarSharePercent}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSolarSharePercent(val);
                    if (onAhpStateChange) onAhpStateChange({ ahpSolarSharePercent: val });
                  }}
                  className="w-32 accent-[#00B356] cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Participação na Receita / Modelo Comercial do Ponto */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-300">
                2. Participação na Receita / Modelo do Ponto Comercial:
              </span>
              <button
                type="button"
                onClick={() => setShowCustomPartnerModal(!showCustomPartnerModal)}
                className="text-[10px] font-bold text-[#00B356] hover:underline cursor-pointer"
              >
                {showCustomPartnerModal ? 'Fechar Cadastro' : '+ Cadastrar Outra Modalidade'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <select
                value={realEstateModel}
                onChange={(e) => {
                  const val = e.target.value;
                  setRealEstateModel(val);
                  if (onAhpStateChange) onAhpStateChange({ ahpRealEstateModel: val });
                }}
                className="sm:col-span-7 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="comodato">Comodato Gratuito (Ponto Próprio — 0%)</option>
                <option value="revenue_share_bruto">Participação na Receita Bruta — Revenue Share (%)</option>
                <option value="revenue_share_liquido">Participação na Margem Pós-Energia (%)</option>
                <option value="aluguel_fixo">Aluguel Fixo Mensal de Vaga (R$/mês)</option>
                <option value="misto">Modelo Misto (Aluguel Fixo R$ + % Receita)</option>
                <option value="reembolso_energia_split">Parceiro Cede Energia + Split de Lucro (%)</option>
                {customRealEstateModels.map((cm) => (
                  <option key={cm.id} value={cm.id}>
                    ★ {cm.label} ({cm.fixedRentBRL > 0 ? `R$ ${cm.fixedRentBRL} + ` : ''}{cm.revenueSharePercent}%)
                  </option>
                ))}
              </select>

              {(realEstateModel === 'revenue_share' ||
                realEstateModel === 'revenue_share_bruto' ||
                realEstateModel === 'revenue_share_liquido' ||
                realEstateModel === 'misto' ||
                realEstateModel === 'reembolso_energia_split') && (
                <div className="sm:col-span-5 flex items-center gap-1.5 bg-slate-950 border border-amber-500/40 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] text-amber-300 font-mono whitespace-nowrap">% Repasse:</span>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    step="1"
                    value={revenueSharePercent}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setRevenueSharePercent(val);
                      if (onAhpStateChange) onAhpStateChange({ ahpRevenueSharePercent: val });
                    }}
                    className="w-full bg-transparent text-xs font-bold text-amber-300 focus:outline-none text-right font-mono"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">%</span>
                </div>
              )}

              {(realEstateModel === 'aluguel_fixo' || realEstateModel === 'misto') && (
                <div className="sm:col-span-5 flex items-center gap-1.5 bg-slate-950 border border-cyan-500/40 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] text-cyan-300 font-mono whitespace-nowrap">Fixo R$:</span>
                  <input
                    type="number"
                    min="0"
                    max="50000"
                    step="50"
                    value={fixedRentBRL}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setFixedRentBRL(val);
                      if (onAhpStateChange) onAhpStateChange({ ahpFixedRentBRL: val });
                    }}
                    className="w-full bg-transparent text-xs font-bold text-cyan-300 focus:outline-none text-right font-mono"
                  />
                </div>
              )}
            </div>

            {showCustomPartnerModal && (
              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2 text-[10px]">
                <span className="font-bold text-emerald-400 uppercase block">Cadastrar Nova Modalidade de Participação:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Nome (ex: Rede Postos 15%)"
                    value={newPartnerLabel}
                    onChange={(e) => setNewPartnerLabel(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold"
                  />
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2">
                    <span className="text-slate-400">% Rec:</span>
                    <input
                      type="number"
                      value={newPartnerShare}
                      onChange={(e) => setNewPartnerShare(Number(e.target.value))}
                      className="w-full bg-transparent text-white font-bold py-1 text-right"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2">
                    <span className="text-slate-400">Fixo R$:</span>
                    <input
                      type="number"
                      value={newPartnerFixed}
                      onChange={(e) => setNewPartnerFixed(Number(e.target.value))}
                      className="w-full bg-transparent text-white font-bold py-1 text-right"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={newPartnerBasis}
                    onChange={(e) => setNewPartnerBasis(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                  >
                    <option value="gross">Calcular % sobre Receita Bruta</option>
                    <option value="net_margin">Calcular % sobre Margem Pós-Energia</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newPartnerLabel.trim()) return;
                      const id = 'custom_' + Date.now();
                      const nextModels = [
                        ...customRealEstateModels,
                        {
                          id,
                          label: newPartnerLabel.trim(),
                          fixedRentBRL: newPartnerFixed,
                          revenueSharePercent: newPartnerShare,
                          basis: newPartnerBasis
                        }
                      ];
                      setCustomRealEstateModels(nextModels);
                      setRealEstateModel(id);
                      setFixedRentBRL(newPartnerFixed);
                      setRevenueSharePercent(newPartnerShare);
                      setNewPartnerLabel("");
                      setShowCustomPartnerModal(false);
                      if (onAhpStateChange) {
                        onAhpStateChange({
                          ahpCustomRealEstateModels: nextModels,
                          ahpRealEstateModel: id,
                          ahpFixedRentBRL: newPartnerFixed,
                          ahpRevenueSharePercent: newPartnerShare
                        });
                      }
                    }}
                    className="bg-[#00B356] hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg cursor-pointer"
                  >
                    Salvar e Selecionar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Painel de Premissas de Entrada Editáveis para Auditoria da Projeção */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-xs font-mono">
          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Potência (kW):</label>
            <input
              type="number"
              min="3.7"
              max="1000"
              step="1"
              value={chargerPowerKW}
              onChange={(e) => setChargerPowerKW(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-[#00B356] focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Passo 1A</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Venda (R$/kWh):</label>
            <input
              type="number"
              min="0.50"
              max="10.00"
              step="0.05"
              value={tariffPerKWh}
              onChange={(e) => {
                const val = Math.max(0.1, Number(e.target.value));
                setTariffPerKWh(val);
                if (onAhpStateChange) onAhpStateChange({ ahpTariffBRL: val });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-orange-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Padrão: R$ 2,10</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Rede (R$/kWh):</label>
            <input
              type="number"
              min="0.10"
              max="5.00"
              step="0.05"
              value={energyCostPerKWh}
              onChange={(e) => {
                const val = Math.max(0.05, Number(e.target.value));
                setEnergyCostPerKWh(val);
                if (onAhpStateChange) onAhpStateChange({ ahpEnergyCostBRL: val });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Padrão: R$ 0,85</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Solar (R$/kWh):</label>
            <input
              type="number"
              min="0.05"
              max="3.00"
              step="0.05"
              value={solarEnergyCostPerKWh}
              onChange={(e) => {
                const val = Math.max(0.05, Number(e.target.value));
                setSolarEnergyCostPerKWh(val);
                if (onAhpStateChange) onAhpStateChange({ ahpSolarEnergyCostBRL: val });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Padrão: R$ 0,39</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">OPEX Fixo (R$):</label>
            <input
              type="number"
              min="0"
              max="20000"
              step="50"
              value={fixedOpexBRL}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                setFixedOpexBRL(val);
                if (onAhpStateChange) onAhpStateChange({ ahpFixedOpexBRL: val });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Padrão: R$ 350</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">OPEX Var. (%):</label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={variableOpexPercent}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                setVariableOpexPercent(val);
                if (onAhpStateChange) onAhpStateChange({ ahpVariableOpexPercent: val });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Padrão: 12%</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">Sessão (min):</label>
            <input
              type="number"
              min="10"
              max="600"
              step="5"
              value={avgSessionMinutes}
              onChange={(e) => {
                const val = Math.max(10, Number(e.target.value));
                setAvgSessionMinutes(val);
                if (onAhpStateChange) onAhpStateChange({ ahpSessionMinutes: val });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-purple-400 focus:outline-none focus:border-purple-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Duração média</span>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 uppercase block mb-1">CAPEX Total (R$):</label>
            <input
              type="number"
              min="5000"
              max="5000000"
              step="1000"
              value={estimatedCapexBRL}
              onChange={(e) => {
                const val = Math.max(1000, Number(e.target.value));
                setEstimatedCapexBRL(val);
                if (onAhpStateChange) onAhpStateChange({ ahpCapexBRL: val });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[8px] text-slate-500 block mt-0.5">Carregador + BOM</span>
          </div>
        </div>

        {/* Os 3 Cards de Cenários com Memória de Cálculo Visível e Payback em Meses + Anos e Meses (FOTO 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scenarios.map((sc, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                sc.name === 'Realista'
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold uppercase text-white block">{sc.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    Captura: {sc.captureRatePercent}% dos {sc.passingEvsPerDay} VEs/dia da via
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {sc.operatingHoursPerDay}h/dia úteis
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Sessões Diárias ({sc.operatingHoursPerDay}h ÷ {(sc.averageSessionMinutes / 60).toFixed(2)}h):</span>
                  <span className="text-white font-bold">{sc.dailySessions} recargas</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Energia Diária ({chargerPowerKW}kW × {sc.operatingHoursPerDay}h × 0.82):</span>
                  <span className="text-slate-200">{sc.dailyKWh.toLocaleString('pt-BR')} kWh/dia</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Energia Faturada Mensal (×30d):</span>
                  <span className="text-white font-bold">{sc.monthlyKWh.toLocaleString('pt-BR')} kWh</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800/70">
                  <span>(+) Receita Bruta (× R$ {sc.tariffPerKWh.toFixed(2)}):</span>
                  <span className="text-emerald-400 font-bold">R$ {sc.monthlyGrossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-rose-300/90 text-[10px]">
                  <span>(-) Custo Energia ({sc.energySourceLabel} • R$ {sc.energyCostPerKWh.toFixed(2)}):</span>
                  <span>- R$ {sc.monthlyEnergyCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-amber-300/90 text-[10px]">
                  <span>(-) OPEX ({variableOpexPercent}% OCPP + R$ {fixedOpexBRL} fixo):</span>
                  <span>- R$ {sc.monthlyOpex.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {sc.monthlyRealEstateCost > 0 && (
                  <div className="flex justify-between text-purple-300/90 text-[10px]">
                    <span>(-) Ponto ({sc.realEstateLabel}):</span>
                    <span>- R$ {sc.monthlyRealEstateCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-200 pt-1 border-t border-slate-800">
                  <span className="font-bold">(=) Lucro Líquido Operacional:</span>
                  <span className="text-[#00B356] font-black">R$ {sc.monthlyNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</span>
                </div>
                <div className="flex flex-col gap-0.5 text-slate-300 pt-1.5 border-t border-slate-900 bg-slate-900/60 p-2 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Payback (R$ {sc.totalCapexBRL.toLocaleString('pt-BR')} ÷ Lucro):</span>
                    <span className="text-amber-400 font-black text-xs">{formatPaybackMonthsAndYears(sc.paybackMonths)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quadro de Auditoria das Fórmulas da Projeção Financeira (Foto 2) */}
        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-2 text-[11px]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-slate-200 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              Memória de Cálculo &amp; Origem dos Dados das Projeções (Auditoria Fotos 01 &amp; 02):
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Fonte: Motor <code className="text-emerald-400">calculateScenarioProjections()</code>
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-[10px] text-slate-300">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
              <strong className="text-emerald-400 block">1. Funil de Tráfego VE &amp; Sessões Diárias:</strong>
              <p>• Frota VE na Via = VDM ({vdm.toLocaleString('pt-BR')}) × Frota VE ({fleetDensity}%) = <strong>{Math.max(1, Math.round(vdm * (fleetDensity / 100)))} VEs/dia</strong> passando em frente ao ponto.</p>
              <p>• Sessões/dia = Horas Úteis (3h, 6h ou 9h) ÷ Tempo Médio de Sessão ({avgSessionMinutes} min = {(avgSessionMinutes / 60).toFixed(2)}h).</p>
              <p>• Energia Diária = Potência ({chargerPowerKW} kW) × Horas Úteis × <strong>0.82</strong> (fator real da curva de recarga CC/CV da bateria).</p>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
              <strong className="text-amber-400 block">2. DRE Mensal da Estação &amp; Payback (Anos e Meses):</strong>
              <p>• Receita Bruta = Energia Mensal (kWh) × Tarifa de Venda (R$ {tariffPerKWh.toFixed(2)}/kWh).</p>
              <p>• Custo de Energia Ativo ({scenarios[1]?.energySourceLabel}): <strong>R$ {(scenarios[1]?.energyCostPerKWh ?? energyCostPerKWh).toFixed(2)}/kWh</strong> (Concessionária R$ {energyCostPerKWh.toFixed(2)} vs. Solar R$ {solarEnergyCostPerKWh.toFixed(2)}).</p>
              <p>• OPEX + Ponto Comercial: <strong>{variableOpexPercent}% OCPP/Tributos</strong> + <strong>R$ {fixedOpexBRL.toFixed(2)}/mês</strong> + Parceria Ponto (<strong>{scenarios[1]?.realEstateLabel}</strong>).</p>
              <p>• Payback Realista = <strong>{formatPaybackMonthsAndYears(scenarios[1]?.paybackMonths || 0)}</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
    /* ─── ABA DE AUDITORIA & DISCRETIZAÇÃO DINÂMICA DO PROJETO ATIVO ─── */
    <div className="space-y-6 text-xs font-sans">
      {/* Banner de Identificação do Ponto Real Auditado */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-purple-500/30 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <FileText className="w-3 h-3 text-purple-400" />
                Auditoria de Inteligência Territorial
              </span>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                Projeto Ativo: {projectName || "Dimensionamento em Curso"}
              </span>
              {isNewConnection && (
                <span className="text-orange-400 font-bold bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-md">
                  ⚡ Ligação Nova ({targetNewCategory || standardCategory || "BT"})
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              Memória de Cálculo & Rastreabilidade de Dados — {projectName || "Projeto Ativo"}
            </h3>
            <p className="text-slate-400 text-[11px]">
              Discretização dinâmica das variáveis reais de entrada do projeto atual, equações de normalização AHP e consulta espacial Haversine/DuckDB.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800 shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Score Calculado:</span>
              <span className={`text-xl font-black font-mono ${
                scoreResult.totalScore >= 80 ? 'text-[#00B356]' : scoreResult.totalScore >= 60 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {scoreResult.totalScore.toFixed(1)} / 100
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Classificação:</span>
              <span className={`text-xs font-bold uppercase ${
                scoreResult.totalScore >= 80 ? 'text-[#00B356]' : scoreResult.totalScore >= 60 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {scoreResult.rating}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Veto Fatal:</span>
              <span className={`text-xs font-bold uppercase ${scoreResult.fatalFlawMultiplier === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {scoreResult.fatalFlawMultiplier.toFixed(1)} ({scoreResult.fatalFlawMultiplier === 1 ? 'Aprovado' : 'Vetado'})
              </span>
            </div>
          </div>
        </div>

        {/* Metadados Geodésicos e Elétricos Reais do Projeto Ativo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Endereço do Projeto:</span>
            <strong className="text-white font-sans text-xs block truncate" title={currentAddress}>
              {currentAddress || "Endereço em definição"}
            </strong>
            <span className="text-slate-400 block text-[10px] truncate">
              {projectName || "Unidade Consumidora"}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Coordenadas WGS84:</span>
            <strong className="text-purple-400 text-xs">Lat: {currentLat.toFixed(6)} | Lon: {currentLon.toFixed(6)}</strong>
            <span className="text-slate-400 block text-[10px]">Geocodificação OpenStreetMap</span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Padrão Concessionária:</span>
            <strong className="text-amber-400 text-xs">
              {utility || 'CEMIG'} {isNewConnection ? `Novo ${targetNewCategory || standardCategory || 'BT'}` : `Padrão ${standardCategory || 'BT'}`} {standardBreakerA ? `${standardBreakerA}A` : 'Subestação MT'}
            </strong>
            <span className="text-slate-400 block text-[10px]">
              {isNewConnection
                ? 'Ligação Nova (Orçamento Incluso no CAPEX)'
                : (installationNumber ? `Instalação ${installationNumber}` : `Capacidade: ${availablePowerKW.toFixed(1)} kW`)}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Potência dos Carregadores:</span>
            <strong className="text-[#00B356] text-xs block truncate" title={projectChargerDescription}>
              {projectChargerDescription || `${chargerPowerKW} kW (${chargerPowerKW >= 30 ? 'DC Rápido' : 'Wallbox AC'})`}
            </strong>
            <span className="text-slate-400 block text-[10px]">
              Folga Líquida: {(projectHeadroomKW !== undefined ? projectHeadroomKW : Math.max(0, availablePowerKW - (projectExistingLoadKW || 0))).toFixed(1)} kW disponível
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SEÇÃO 1: DISCRETIZAÇÃO COMPLETA DOS 5 PILARES AHP DO PROJETO ATIVO
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E45318]" />
              Discretização Matemática: Como cada Nota dos 5 Pilares foi Calculada
            </h4>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Metodologia Analytic Hierarchy Process (AHP): soma ponderada dos 5 pilares calibrados para o nicho selecionado, multiplicada pelos filtros eliminatórios.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/30">
            Nicho: {activeProfile.title}
          </span>
        </div>

        {/* Equação Matemática Global */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300">
          <span className="text-slate-400 font-bold block text-[10px] uppercase mb-1">Equação Matemática Geral de Scoring:</span>
          <div className="p-2 bg-slate-950 rounded-lg text-emerald-400 font-bold overflow-x-auto">
            Score = [(w_grid × S_grid) + (w_traffic × S_traffic) + (w_fleet × S_fleet) + (w_dwell × S_dwell) + (w_comp × S_comp)] × ∏(Fj)
          </div>
          <div className="mt-2 text-slate-400 text-[10px] space-y-0.5">
            <p>• w_i: Vetor de pesos AHP do perfil ({activeProfile.title}): [Grid: {Math.round(weights.grid * 100)}%, Tráfego: {Math.round(weights.traffic * 100)}%, Frota: {Math.round(weights.fleet * 100)}%, Dwell: {Math.round(weights.dwell * 100)}%, Concorrência: {Math.round(weights.comp * 100)}%].</p>
            <p>• S_i: Sub-scores normalizados de 0 a 100 de cada dimensão com base nas métricas reais do projeto ({projectName || "Projeto Ativo"}).</p>
            <p>• ∏(Fj): Produtório dos 4 filtros fatais booleanos (Conectividade, APP, Acesso 24h, Concessionária) = {scoreResult.fatalFlawMultiplier.toFixed(1)}.</p>
          </div>
        </div>

        {/* Tabela de Auditoria dos 5 Pilares */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase bg-slate-900/50">
                <th className="py-2.5 px-3">Pilar Analisado</th>
                <th className="py-2.5 px-3 text-center">Peso Nicho</th>
                <th className="py-2.5 px-3">Valor de Entrada Real ({projectName || "Projeto"})</th>
                <th className="py-2.5 px-3">Fonte / Origem do Dado</th>
                <th className="py-2.5 px-3">Fórmula / Regra de Cálculo</th>
                <th className="py-2.5 px-3 text-right">Nota (0-100)</th>
                <th className="py-2.5 px-3 text-right">Pontos Efetivos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
              {/* Pilar 1: Rede Elétrica */}
              <tr className="hover:bg-slate-900/40">
                <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  1. Rede Elétrica
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400">
                  {Math.round(weights.grid * 100)}% ({weights.grid.toFixed(2)})
                </td>
                <td className="py-2.5 px-3 font-mono">
                  {isNewConnection
                    ? `Ligação Nova ${targetNewCategory || standardCategory || 'BT'} (${availablePowerKW.toFixed(1)} kW disp. p/ ${chargerPowerKW} kW VE)`
                    : `Padrão ${standardCategory || 'BT'} ${standardBreakerA ? `${standardBreakerA}A` : ''} (${availablePowerKW.toFixed(1)} kW disp., carga atual ${(projectExistingLoadKW || 0).toFixed(1)} kW)`}
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-300">
                    {isNewConnection
                      ? `Ligação Nova ${utility || 'CEMIG'} Passo 1A`
                      : (installationNumber ? `Conta ${utility || 'CEMIG'} ${installationNumber}` : `Vistoria ${utility || 'CEMIG'} Passo 1A`)}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                  {gridCategory === 'ligacao_nova_bt'
                    ? 'Ligação Nova BT Homologada (Nota Base 88 - CAPEX moderado incluso)'
                    : gridCategory === 'ligacao_nova_mt'
                    ? 'Ligação Nova Subestação MT (Nota Base 55 - Alto CAPEX incluso)'
                    : gridCategory === 'bt_grupo_f_disponivel'
                    ? `BT Existente Adequada c/ folga p/ ${chargerPowerKW} kW (Dispensa obra de entrada)`
                    : gridCategory === 'mt_subestacao_existente'
                    ? 'Subestação MT Existente c/ folga de transformador'
                    : 'Padrão existente requer upgrade / aumento de carga'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                  {scoreResult.gridReadinessScore} / 100
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                  +{(scoreResult.gridReadinessScore * weights.grid).toFixed(1)} pts
                </td>
              </tr>

              {/* Pilar 2: Tráfego & Fluxo */}
              <tr className="hover:bg-slate-900/40">
                <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  2. Tráfego & Fluxo
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-400">
                  {Math.round(weights.traffic * 100)}% ({weights.traffic.toFixed(2)})
                </td>
                <td className="py-2.5 px-3 font-mono text-[10px]">
                  <strong className="text-white">VDM = {vdm.toLocaleString('pt-BR')} veíc/dia</strong>{' '}
                  {vdmSourceMode === 'osm_hcm'
                    ? `(${currentRoadSpec.shortLabel}, ${roadLanes} faixas × ${currentRoadSpec.baseDailyVolumePerLane.toLocaleString('pt-BR')} × ${cityScaleFactor.toFixed(2)}x)`
                    : vdmSourceMode === 'dnit_corridor'
                    ? `(${currentOfficialCorridor.name})`
                    : vdmSourceMode === 'field_count'
                    ? `(Amostra: ${fieldCountVehicles} veíc/${fieldCountMinutes}min = ${fieldHourlyFlow}/h ÷ K=${(fieldKFactor * 100).toFixed(1)}%)`
                    : `(${currentAddress.split(',')[0] || 'Via Principal'})`}
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border inline-block ${
                    vdmSourceMode === 'osm_hcm'
                      ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                      : vdmSourceMode === 'dnit_corridor'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                      : vdmSourceMode === 'field_count'
                      ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                      : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                  }`}>
                    {vdmSourceMode === 'osm_hcm'
                      ? `Engenharia Viária OSM/HCM (${currentRoadSpec.shortLabel})`
                      : vdmSourceMode === 'dnit_corridor'
                      ? `Base Oficial: ${currentOfficialCorridor.agencySource}`
                      : vdmSourceMode === 'field_count'
                      ? `Aferição Física em Campo (${fieldCountMinutes} min)`
                      : `Ajuste Manual Projetista (Slider VDM)`}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                  Normalização linear VDM ({vdm.toLocaleString('pt-BR')} veíc/dia) para o perfil {activeProfile.id}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-400">
                  {scoreResult.trafficScore} / 100
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-400">
                  +{(scoreResult.trafficScore * weights.traffic).toFixed(1)} pts
                </td>
              </tr>

              {/* Pilar 3: Frota Alvo */}
              <tr className="hover:bg-slate-900/40">
                <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-400" />
                  3. Frota Alvo
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                  {Math.round(weights.fleet * 100)}% ({weights.fleet.toFixed(2)})
                </td>
                <td className="py-2.5 px-3 font-mono text-[10px]">
                  <strong className="text-white">{fleetDensity.toFixed(2)}% na via</strong> ({cityEvVehicles.toLocaleString('pt-BR')} VEs ÷ {cityTotalVehicles.toLocaleString('pt-BR')} leves = {baseMunicipalEvPercent.toFixed(2)}% × {corridorFactor.toFixed(1)}x) {isVerticalHousing ? '+ Habitação Vertical ativa' : ''}
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border inline-block ${
                    fleetSourceMode === 'censo_municipal'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                  }`}>
                    {fleetSourceMode === 'censo_municipal'
                      ? `Censo IBGE/Senatran — ${currentCityCensus.cityName} (Oficial)`
                      : `Ajuste Manual Projetista (${currentCityCensus.cityName})`}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                  Base: ({fleetDensity.toFixed(2)} / 4.0) × 100 {isVerticalHousing ? 'c/ bônus de verticalização (+20%)' : 'sem bônus vertical'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                  {scoreResult.fleetScore} / 100
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                  +{(scoreResult.fleetScore * weights.fleet).toFixed(1)} pts
                </td>
              </tr>

              {/* Pilar 4: Dwell Time */}
              <tr className="hover:bg-slate-900/40">
                <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  4. Dwell Time
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-400">
                  {Math.round(weights.dwell * 100)}% ({weights.dwell.toFixed(2)})
                </td>
                <td className="py-2.5 px-3 font-mono text-[10px]">
                  <strong className="text-white">{dwellEvaluation.anchorSpec.shortLabel}</strong> ({avgSessionMinutes} min × {chargerPowerKW} kW = <strong className="text-emerald-400">{dwellEvaluation.deliveredKWh} kWh</strong> / +{dwellEvaluation.addedRangeKM} km)
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  <span className="bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-purple-300 inline-block">
                    {dwellEvaluation.anchorSpec.benchmarkSource}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                  Meta da âncora: {dwellEvaluation.anchorSpec.targetSessionKWh} kWh ({dwellEvaluation.anchorSpec.idealMinKW}–{dwellEvaluation.anchorSpec.idealMaxKW} kW). Entregue: {dwellEvaluation.deliveredKWh} kWh (+{dwellEvaluation.recoveredSocPercent}% SoC)
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-400">
                  {scoreResult.dwellTimeMatchScore} / 100
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-400">
                  +{(scoreResult.dwellTimeMatchScore * weights.dwell).toFixed(1)} pts
                </td>
              </tr>

              {/* Pilar 5: Concorrência */}
              <tr className="hover:bg-slate-900/40">
                <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                  5. Concorrência
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-400">
                  {Math.round(weights.comp * 100)}% ({weights.comp.toFixed(2)})
                </td>
                <td className="py-2.5 px-3 font-mono">
                  {competitorDistanceKM.toFixed(2)} km até o concorrente mais próximo
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-300">
                    DuckDB OLAP Haversine ({currentLat.toFixed(4)}, {currentLon.toFixed(4)})
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                  {competitorDistanceKM < 1.0
                    ? 'Distância < 1.0 km gera alerta de sobreposição/canibalização'
                    : competitorDistanceKM <= 5.0
                    ? 'Distância competitiva equilibrada (1.0 a 5.0 km)'
                    : 'Oceano Azul (> 5.0 km sem concorrente direto)'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-400">
                  {scoreResult.competitionAndAccessScore} / 100
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-400">
                  +{(scoreResult.competitionAndAccessScore * weights.comp).toFixed(1)} pts
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-slate-900 font-mono text-xs">
                <td colSpan={5} className="py-2.5 px-3 font-bold text-white uppercase text-right">
                  Score Total Ponderado (Soma das Contribuições × Fatores Fatais {scoreResult.fatalFlawMultiplier.toFixed(1)}):
                </td>
                <td colSpan={2} className={`py-2.5 px-3 text-right font-black text-sm ${
                  scoreResult.totalScore >= 80 ? 'text-emerald-400' : scoreResult.totalScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {scoreResult.totalScore.toFixed(1)} / 100 ({scoreResult.rating})
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Detalhamento Individual Dinâmico dos 5 Pilares */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Card Detalhe 1 */}
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Pilar 1: Rede Elétrica ({scoreResult.gridReadinessScore}/100 | +{(scoreResult.gridReadinessScore * weights.grid).toFixed(1)} pts)
              </span>
              <span className="font-mono text-white">Disp.: {availablePowerKW.toFixed(1)} kW</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isNewConnection ? (
                <>
                  O projeto <strong>{projectName || "Ativo"}</strong> está configurado como <strong>Ligação Nova (Sem Padrão Existente)</strong>, prevendo a instalação de um padrão <strong>{utility || 'CEMIG'} {targetNewCategory || standardCategory || 'BT'} ({standardBreakerA ? `${standardBreakerA}A` : 'Subestação MT'})</strong> com capacidade de <strong>{availablePowerKW.toFixed(1)} kW</strong> para alimentar <strong>{chargerPowerKW} kW</strong> de recarga VE. O custo integral do novo padrão já é contabilizado automaticamente na planilha orçamentária (BOM).
                </>
              ) : (
                <>
                  O ponto em <strong>{currentAddress}</strong> possui padrão <strong>{utility || 'CEMIG'} {standardCategory || 'BT'} {standardBreakerA ? `de ${standardBreakerA}A` : ''}</strong> com capacidade nominal de <strong>{availablePowerKW.toFixed(1)} kW</strong> e demanda existente de <strong>{(projectExistingLoadKW || 0).toFixed(1)} kW</strong>, resultando em folga líquida de <strong>{(projectHeadroomKW !== undefined ? projectHeadroomKW : Math.max(0, availablePowerKW - (projectExistingLoadKW || 0))).toFixed(1)} kW</strong> frente aos <strong>{chargerPowerKW} kW</strong> dos carregadores projetados.
                </>
              )}
            </p>
          </div>

          {/* Card Detalhe 2 */}
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-blue-400">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Pilar 2: Tráfego & Fluxo ({scoreResult.trafficScore}/100 | +{(scoreResult.trafficScore * weights.traffic).toFixed(1)} pts)
              </span>
              <span className="font-mono text-white">VDM: {vdm.toLocaleString('pt-BR')} veíc/dia</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Para o endereço <strong>{currentAddress}</strong>, o Volume Diário Médio (VDM) apurado é de <strong>{vdm.toLocaleString('pt-BR')} veículos/dia</strong> via{' '}
              <strong>
                {vdmSourceMode === 'osm_hcm'
                  ? `Engenharia Viária HCM (${currentRoadSpec.shortLabel}, ${roadLanes} faixas, fator urbano ${cityScaleFactor.toFixed(2)}x)`
                  : vdmSourceMode === 'dnit_corridor'
                  ? `Base Oficial (${currentOfficialCorridor.name} — ${currentOfficialCorridor.agencySource})`
                  : vdmSourceMode === 'field_count'
                  ? `Aferição Física em Campo (${fieldCountVehicles} veículos em ${fieldCountMinutes} min = ${fieldHourlyFlow} veíc/h ÷ K=${(fieldKFactor * 100).toFixed(1)}%)`
                  : 'Ajuste Manual do Projetista'}
              </strong>. No nicho <strong>{activeProfile.title}</strong> (peso {Math.round(weights.traffic * 100)}%), resulta na nota <strong>{scoreResult.trafficScore}/100</strong> (+{(scoreResult.trafficScore * weights.traffic).toFixed(1)} pts).
            </p>
          </div>

          {/* Card Detalhe 3 */}
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Car className="w-4 h-4" />
                Pilar 3: Frota Alvo & Demanda ({scoreResult.fleetScore}/100 | +{(scoreResult.fleetScore * weights.fleet).toFixed(1)} pts)
              </span>
              <span className="font-mono text-white">Penetração: {fleetDensity.toFixed(2)}% ({currentCityCensus.cityName})</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Município de <strong>{currentCityCensus.cityName} ({currentCityCensus.uf})</strong>: frota de <strong>{cityEvVehicles.toLocaleString('pt-BR')} veículos plug-in (BEV+PHEV)</strong> sobre <strong>{cityTotalVehicles.toLocaleString('pt-BR')} veículos leves (IBGE)</strong> = <strong>{baseMunicipalEvPercent.toFixed(2)}%</strong> de base municipal, multiplicada pelo fator de concentração da via (<strong>{corridorFactor.toFixed(1)}x</strong>) = <strong>{fleetDensity.toFixed(2)}%</strong>{isVerticalHousing ? ', com bônus de verticalização (+20%)' : ''}. Origem do dado: <strong>{fleetSourceMode === 'censo_municipal' ? 'Censo Oficial IBGE/Senatran' : 'Ajustado Manualmente pelo Projetista'}</strong>.
            </p>
          </div>

          {/* Card Detalhe 4 */}
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-purple-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Pilar 4: Dwell Time & Âncora ({scoreResult.dwellTimeMatchScore}/100 | +{(scoreResult.dwellTimeMatchScore * weights.dwell).toFixed(1)} pts)
              </span>
              <span className="font-mono text-white">{anchor.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              A âncora comercial selecionada (<strong>{anchor.replace(/_/g, ' ')}</strong>) combinada com a potência total projetada de <strong>{chargerPowerKW} kW</strong> entrega aproximadamente <strong>{(chargerPowerKW * 0.5).toFixed(0)} kWh em 30 minutos</strong> de parada, atingindo <strong>{scoreResult.dwellTimeMatchScore}/100</strong> de aderência com o perfil de permanência do usuário ({activeProfile.typicalDwellTime}).
            </p>
          </div>
        </div>

        {/* Card Detalhe 5 e Filtros Fatais */}
        <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400 flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4" />
              Pilar 5: Concorrência Geodésica ({scoreResult.competitionAndAccessScore}/100 | +{(scoreResult.competitionAndAccessScore * weights.comp).toFixed(1)} pts) & Filtros Fatais
            </span>
            <span className="font-mono text-cyan-300">
              Concorrente mais próximo: {competitorDistanceKM.toFixed(2)} km
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            A varredura espacial Haversine centrada em <strong>({currentLat.toFixed(5)}, {currentLon.toFixed(5)})</strong> identificou o concorrente externo mais próximo a <strong>{competitorDistanceKM.toFixed(2)} km</strong>, resultando no sub-score de <strong>{scoreResult.competitionAndAccessScore}/100</strong>. Recomendações automáticas do motor AHP: <strong>{scoreResult.executiveSummary}</strong>
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SEÇÃO 2: DISCRETIZAÇÃO GEODÉSICA DUCKDB OLAP & CONCORRENTES REAIS DA REGIÃO
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Mapeamento Geodésico Haversine & Estações no Raio de {searchRadiusKM.toFixed(0)} km ({projectName || "Projeto Ativo"})
            </h4>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Estações consultadas em tempo real para as coordenadas ({currentLat.toFixed(5)}, {currentLon.toFixed(5)}) via rota <code className="text-purple-300">/api/ev/geo</code>.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/30">
            {(geoData?.estacoes || []).filter(st => st.distancia_km >= 0.05).length} concorrentes no raio de {searchRadiusKM.toFixed(0)} km
          </span>
        </div>

        {/* Bloco SQL Haversine Executado no DuckDB */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase">
            <span className="font-bold text-slate-300">Consulta SQL Executada (Rota /api/ev/geo):</span>
            <span className="text-emerald-400">Raio Ativo: {searchRadiusKM.toFixed(1)} km</span>
          </div>
          <pre className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[10px] overflow-x-auto leading-relaxed border border-slate-800">
{`SELECT 
  nome,
  potencia_kw,
  status,
  conectores,
  latitude,
  longitude,
  ROUND(
    6371 * acos(
      cos(radians(${currentLat.toFixed(6)})) * cos(radians(latitude)) * 
      cos(radians(longitude) - radians(${currentLon.toFixed(6)})) + 
      sin(radians(${currentLat.toFixed(6)})) * sin(radians(latitude))
    ), 2
  ) AS distancia_km
FROM 'dados_locais/estacoes_brasil.parquet'
WHERE distancia_km <= ${searchRadiusKM.toFixed(1)}
ORDER BY distancia_km ASC;`}
          </pre>
        </div>

        {/* Tabela Dinâmica Real das Estações Mapeadas para o Projeto Atual */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase bg-slate-900/50">
                <th className="py-2.5 px-3">Estação Identificada</th>
                <th className="py-2.5 px-3">Endereço / Localidade</th>
                <th className="py-2.5 px-3 text-center">Coordenadas (Lat, Lon)</th>
                <th className="py-2.5 px-3 text-center">Tecnologia & Conector</th>
                <th className="py-2.5 px-3 text-right">Potência</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Linha Reta</th>
                <th className="py-2.5 px-3 text-right">Trajeto Est.</th>
                <th className="py-2.5 px-3">Operador / Fonte</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px] font-mono">
              {/* Ponto Proposto do Projeto Ativo */}
              <tr className="hover:bg-slate-900/40 bg-emerald-950/20">
                <td className="py-2.5 px-3 font-bold text-white font-sans flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  {projectName || "Ponto Proposto Cordeiro Energia"} (Alvo)
                </td>
                <td className="py-2.5 px-3 text-slate-300 font-sans text-[10px]">
                  {currentAddress || "Endereço do Projeto"}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-400 text-[10px]">
                  {currentLat.toFixed(6)}, {currentLon.toFixed(6)}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-300 text-[10px]">
                  {projectChargerDescription || (chargerPowerKW >= 30 ? 'DC Rápido (CCS2)' : 'AC (Tipo 2)')}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{chargerPowerKW} kW</td>
                <td className="py-2.5 px-3 text-center">
                  <span className="bg-emerald-500/10 text-[#00B356] border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                    Ponto Proposto
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">0.00 km (No Ponto)</td>
                <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                <td className="py-2.5 px-3 text-slate-400 text-[10px]">Projeto Ativo</td>
                <td className="py-2.5 px-3 text-center text-slate-600 text-[10px] font-mono">-</td>
              </tr>

              {/* Lista Dinâmica de Estações Concorrentes da Região */}
              {allRenderedStations.filter(st => (st.distancia_km ?? 0) >= 0.05).length > 0 ? (
                allRenderedStations.filter(st => (st.distancia_km ?? 0) >= 0.05).map((st: any, idx: number) => (
                  <tr key={st.id || st.id_estacao || idx} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-bold text-white font-sans flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        st.origem === 'MANUAL_PLUGSHARE' ? 'bg-purple-400 ring-2 ring-purple-400/30' : 'bg-purple-400'
                      }`} />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{st.nome}</span>
                        {st.origem === 'MANUAL_PLUGSHARE' && (
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                            PlugShare
                          </span>
                        )}
                        {st.isCalibrated && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                            GPS Calibrado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans text-[10px]">
                      {st.endereco ? `${st.endereco}${st.cidade ? ` (${st.cidade})` : ''}` : (st.cidade || 'Região Mapeada')}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 text-[10px]">
                      {Number(st.latitude).toFixed(5)}, {Number(st.longitude).toFixed(5)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300 text-[10px]">
                      {Array.isArray(st.conectores) ? st.conectores.join(' + ') : (st.potencia_kw >= 30 ? 'DC Rápido (CCS2)' : 'AC Semi-Rápido (Tipo 2)')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-400 font-bold">{st.potencia_kw} kW</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        st.status === 'Disponível'
                          ? 'bg-emerald-500/10 text-[#00B356] border-emerald-500/30'
                          : st.status === 'Ocupado'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {st.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-purple-400 font-bold">{Number(st.distancia_km).toFixed(2)} km</td>
                    <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                      ~{(st.distancia_rota_km || (st.distancia_km * 1.28)).toFixed(2)} km
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                      {st.operador || (st.origem === 'MANUAL_PLUGSHARE' ? 'PlugShare / Vistoria' : 'OpenChargeMap / OSM')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {st.origem === 'MANUAL_PLUGSHARE' ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveManualCompetitor(st.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remover concorrente manual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-mono">Auto</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-400 font-sans">
                    Nenhum eletroposto concorrente mapeado num raio de {searchRadiusKM.toFixed(0)} km ao redor de {currentAddress} (Oceano Azul Territorial).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}
</div>
);
}

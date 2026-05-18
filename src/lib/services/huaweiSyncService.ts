import { prisma } from "../prisma";
import { HuaweiIntegration } from "./huaweiIntegration";
import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), 'sync_log_huawei.txt');

export class HuaweiSyncService {
  static async syncAll() {
    fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Início Huawei Sync (Motor Isolado)\n`);
    
    try {
      const usinas = await prisma.usina.findMany({
        where: { apiFornecedor: { equals: 'HUAWEI', mode: 'insensitive' } }
      });
      fs.appendFileSync(logFile, `Usinas Huawei encontradas no banco: ${usinas.length}\n`);

      const manufacturers = await prisma.manufacturerAPI.findMany();
      const globalHuawei = manufacturers.find(m => m.name === "HUAWEI");

      // Agrupar por credenciais para otimizar login, validando e limpando segredos com asteriscos
      const accounts = new Map<string, any[]>();
      usinas.forEach(u => {
        const uKey = (u.apiKey && u.apiKey !== '********' && u.apiKey.trim() !== '') 
          ? u.apiKey.trim() 
          : (globalHuawei?.userKey || 'default').trim();
          
        const uSecret = (u.apiSecret && u.apiSecret !== '********' && u.apiSecret.trim() !== '') 
          ? u.apiSecret.trim() 
          : (globalHuawei?.secretKey || 'default').trim();

        const key = `${uKey}:${uSecret}`;
        if (!accounts.has(key)) accounts.set(key, []);
        accounts.get(key)!.push(u);
      });

      for (const [creds, group] of accounts.entries()) {
        const [user, pass] = creds.split(":");
        fs.appendFileSync(logFile, `Processando conta Huawei: '${user}'\n`);
        
        if (user === "default" || pass === "default" || user === "" || pass === "") {
          fs.appendFileSync(logFile, `Ignorado: Sem credenciais válidas configuradas.\n`);
          continue;
        }

        try {
          // Efetua login na FusionSolar Northbound API
          const login = await HuaweiIntegration.login(user, pass);
          fs.appendFileSync(logFile, `Login efetuado com sucesso para usuário: ${user}\n`);
          
          // 1. Lote de KPIs das Estações
          const codes = group.map(u => u.apiId.startsWith("NE=") ? u.apiId : `NE=${u.apiId}`).join(",");
          const allStationKpi = await HuaweiIntegration.getPlantData(codes, login.token, login.cookie);
          
          // 2. Lote de Dispositivos (Inversores devTypeId=1)
          const allDevices = await HuaweiIntegration.getDeviceList(codes, login.token, login.cookie);
          const inverters = (allDevices || []).filter((d: any) => d.devTypeId === 1);
          
          // 3. Lote de KPIs em tempo real dos dispositivos
          let allDevKpis: any[] = [];
          if (inverters.length > 0) {
            const allDevIds = inverters.map((i: any) => i.id || i.devId).filter(Boolean).join(",");
            fs.appendFileSync(logFile, `Consultando KPIs para ${inverters.length} inversores: ${allDevIds}\n`);
            allDevKpis = await HuaweiIntegration.getDeviceRealData(allDevIds, login.token, login.cookie);
            fs.appendFileSync(logFile, `Retornados ${allDevKpis.length} KPIs de dispositivos.\n`);
          }

          for (const usina of group) {
            try {
              const usinaCode = usina.apiId.startsWith("NE=") ? usina.apiId : `NE=${usina.apiId}`;
              const stationData = allStationKpi.find((s: any) => s.stationCode === usinaCode)?.dataItemMap || {};
              
              // Geração Diária (kWh) - Prioriza dados da estação
              let energyKWh = parseFloat(String(stationData.day_power ?? "0"));
              let powerFinal = parseFloat(String(stationData.active_power ?? "0"));

              const usinaInverters = inverters.filter((i: any) => i.stationCode === usinaCode);
              const stringsAcc: Record<string, { V: number; I: number }> = {};
              let v = { a: 0, b: 0, c: 0 }, cur = { a: 0, b: 0, c: 0 }, t = 45;

              if (usinaInverters.length > 0) {
                let totalP_DC = 0, totalE_Daily = 0;
                const invIds = usinaInverters.map((i: any) => i.id || i.devId);
                const usinaDevKpis = allDevKpis.filter((k: any) => invIds.includes(k.devId) || invIds.includes(Number(k.devId)) || invIds.includes(String(k.id)));
                fs.appendFileSync(logFile, `${usina.nome}: Match de ${usinaDevKpis.length} KPIs de inversores.\n`);

                usinaDevKpis.forEach((k: any, idx: number) => {
                  const map = k.dataItemMap || {};
                  
                  // Prioriza dia_cap (diário) sobre acumulado total de vida útil
                  const energyDaily = parseFloat(String(map.day_cap || map.day_power || "0"));
                  const pDC = parseFloat(String(map.mppt_power ?? map.active_power ?? "0"));
                  
                  totalP_DC += pDC;
                  totalE_Daily += energyDaily;
                  
                  fs.appendFileSync(logFile, `  - Inversor ${k.devId}: CC=${pDC}kW, E(Dia)=${energyDaily}kWh\n`);
                  
                  const invLabel = k.sn || `Inv${idx+1}`;
                  for (let i = 1; i <= 24; i++) {
                    const vol = parseFloat(String(map[`pv${i}_u`] || "0"));
                    const amp = parseFloat(String(map[`pv${i}_i`] || "0"));
                    if (vol > 0) stringsAcc[`${invLabel}_S${i}`] = { V: vol, I: amp };
                  }
                  
                  // Mapeamento Robusto de Tensão e Corrente CA (Fases A/B/C ou Line AB/BC/CA)
                  if (idx === 0) {
                    v = { 
                      a: parseFloat(String(map.ab_u ?? map.u_ab ?? map.a_u ?? map.u_a ?? "0")), 
                      b: parseFloat(String(map.bc_u ?? map.u_bc ?? map.b_u ?? map.u_b ?? "0")), 
                      c: parseFloat(String(map.ca_u ?? map.u_ca ?? map.c_u ?? map.u_c ?? "0")) 
                    };
                    cur = { 
                      a: parseFloat(String(map.a_i ?? map.i_a ?? "0")), 
                      b: parseFloat(String(map.b_i ?? map.i_b ?? "0")), 
                      c: parseFloat(String(map.c_i ?? map.i_c ?? "0")) 
                    };
                    t = parseFloat(String(map.temperature ?? map.tempIGBT ?? "45"));
                  }
                });

                if (totalP_DC > 0) powerFinal = totalP_DC;
                if (energyKWh <= 0) energyKWh = totalE_Daily;
              }

              fs.appendFileSync(logFile, `[HUAWEI-SYNC] Gravando ${usina.nome}: Potência=${powerFinal.toFixed(2)}kW, Energia Dia=${energyKWh}kWh, Tensão=[${v.a}V, ${v.b}V, ${v.c}V]\n`);

              const alignedTime = new Date(Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000));

              const existing = await prisma.telemetria.findFirst({
                where: {
                  usinaId: usina.id,
                  timestamp: alignedTime
                }
              });

              if (existing) {
                await prisma.telemetria.update({
                  where: { id: existing.id },
                  data: {
                    potenciaAtivaKW: powerFinal,
                    energiaAcumuladaKWh: energyKWh,
                    tensaoCA_A: v.a,
                    tensaoCA_B: v.b,
                    tensaoCA_C: v.c,
                    correnteCA_A: cur.a,
                    correnteCA_B: cur.b,
                    correnteCA_C: cur.c,
                    tempIGBT: t,
                    dadosStrings: stringsAcc
                  }
                });
                fs.appendFileSync(logFile, `[HUAWEI-SYNC] Telemetria atualizada para o balde de 5min (${alignedTime.toISOString()})\n`);
              } else {
                await prisma.telemetria.create({
                  data: {
                    usinaId: usina.id,
                    potenciaAtivaKW: powerFinal,
                    energiaAcumuladaKWh: energyKWh,
                    timestamp: alignedTime,
                    tensaoCA_A: v.a,
                    tensaoCA_B: v.b,
                    tensaoCA_C: v.c,
                    correnteCA_A: cur.a,
                    correnteCA_B: cur.b,
                    correnteCA_C: cur.c,
                    tempIGBT: t,
                    dadosStrings: stringsAcc
                  }
                });
                fs.appendFileSync(logFile, `[HUAWEI-SYNC] Nova telemetria criada para o balde de 5min (${alignedTime.toISOString()})\n`);
              }
              
              // Executa cálculo de perdas da IA
              await HuaweiIntegration.calculateLosses(usina.id).catch(() => {});

            } catch (uErr) {
              fs.appendFileSync(logFile, `[HUAWEI-SYNC] Erro no processamento de telemetria da usina ${usina.nome}: ${uErr}\n`);
            }
          }
        } catch (batchErr) {
          fs.appendFileSync(logFile, `[HUAWEI-SYNC] Falha no processamento do lote do usuário ${user}: ${batchErr}\n`);
        }
      }
    } catch (dbErr) {
      fs.appendFileSync(logFile, `[HUAWEI-SYNC] Falha ao consultar usinas no banco: ${dbErr}\n`);
    }
    
    fs.appendFileSync(logFile, `[HUAWEI-SYNC] Motor Finalizado com Sucesso.\n`);
  }
}

import { prisma } from "../prisma";
import { SolisService } from "./solisService";
import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), 'sync_log_solis.txt');

export class SolisSyncService {
  static async syncAll() {
    fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Início Solis Sync (Motor Isolado)\n`);

    try {
      const usinas = await prisma.usina.findMany({
        where: { apiFornecedor: { equals: 'SOLIS', mode: 'insensitive' } }
      });
      fs.appendFileSync(logFile, `Usinas Solis encontradas no banco: ${usinas.length}\n`);

      const manufacturers = await prisma.manufacturerAPI.findMany();
      const globalSolis = manufacturers.find(m => m.name === "SOLIS");

      for (const usina of usinas) {
        fs.appendFileSync(logFile, `Processando Solis: ${usina.nome}\n`);
        try {
          const key = (usina.apiKey && usina.apiKey !== '********' && usina.apiKey.trim() !== '') 
            ? usina.apiKey.trim() 
            : (globalSolis?.userKey || '').trim();
            
          const secret = (usina.apiSecret && usina.apiSecret !== '********' && usina.apiSecret.trim() !== '') 
            ? usina.apiSecret.trim() 
            : (globalSolis?.secretKey || '').trim();

          if (!key || !secret || key === "" || secret === "") {
            fs.appendFileSync(logFile, `Sem credenciais válidas configuradas para Solis ${usina.nome}\n`);
            continue;
          }

          // 1. Dados da Estação (para Energia do Dia)
          const station = await SolisService.getStationData(usina.apiId, key, secret);
          if (!station) {
            fs.appendFileSync(logFile, `[SOLIS-SYNC] Falha ao obter dados da estação ${usina.apiId}\n`);
            continue;
          }

          const energyKWh = parseFloat(String(station.dayEnergy ?? station.eToday ?? "0"));
          fs.appendFileSync(logFile, `[SOLIS-SYNC] Dados Estação: Power=${station.power}kW, Energy=${energyKWh}kWh\n`);
          
          // 2. Dados dos Inversores (para Potência CC Real)
          let totalPowerDC = 0;
          const stringsAcc: Record<string, { V: number; I: number }> = {};
          let vAc = { a: 0, b: 0, c: 0 }, iAc = { a: 0, b: 0, c: 0 }, temp = 45;

          const inverters = await SolisService.getInverterList(usina.apiId, key, secret);
          
          for (const inv of inverters) {
            const sn = inv.sn || inv.inverterSn;
            if (!sn) continue;

            const detail = await SolisService.getInverterDetailBySn(sn, key, secret);
            if (detail) {
              // Soma potência CC das strings: P = V1*I1 + V2*I2 + ...
              let invPowerDC = 0;
              for (let i = 1; i <= 24; i++) {
                const u = parseFloat(String(detail[`uPv${i}`] || "0"));
                const amp = parseFloat(String(detail[`iPv${i}`] || "0"));
                if (u > 0) {
                  invPowerDC += (u * amp) / 1000; // Converte W para kW
                  stringsAcc[`${sn}_S${i}`] = { V: u, I: amp };
                }
              }
              totalPowerDC += invPowerDC;
              
              // Pega dados CA do primeiro inversor como referência
              if (vAc.a === 0) {
                vAc = { a: detail.uAc1 || 0, b: detail.uAc2 || 0, c: detail.uAc3 || 0 };
                iAc = { a: detail.iAc1 || 0, b: detail.iAc2 || 0, c: detail.iAc3 || 0 };
                temp = detail.inverterTemperature || 45;
              }
            }
          }

          // Se a soma das strings falhou ou deu 0, usa o power da estação como fallback (AC)
          const powerFinal = totalPowerDC > 0 ? totalPowerDC : parseFloat(String(station.power || "0"));

          fs.appendFileSync(logFile, `[SOLIS-SYNC] ${usina.nome}: Final Power=${powerFinal.toFixed(2)}kW, Energy=${energyKWh}kWh\n`);

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
                tensaoCA_A: vAc.a,
                tensaoCA_B: vAc.b,
                tensaoCA_C: vAc.c,
                correnteCA_A: iAc.a,
                correnteCA_B: iAc.b,
                correnteCA_C: iAc.c,
                tempIGBT: temp,
                dadosStrings: stringsAcc
              }
            });
            fs.appendFileSync(logFile, `[SOLIS-SYNC] Telemetria atualizada para o balde de 5min (${alignedTime.toISOString()})\n`);
          } else {
            await prisma.telemetria.create({
              data: {
                usinaId: usina.id,
                potenciaAtivaKW: powerFinal,
                energiaAcumuladaKWh: energyKWh,
                timestamp: alignedTime,
                tensaoCA_A: vAc.a,
                tensaoCA_B: vAc.b,
                tensaoCA_C: vAc.c,
                correnteCA_A: iAc.a,
                correnteCA_B: iAc.b,
                correnteCA_C: iAc.c,
                tempIGBT: temp,
                dadosStrings: stringsAcc
              }
            });
            fs.appendFileSync(logFile, `[SOLIS-SYNC] Nova telemetria criada para o balde de 5min (${alignedTime.toISOString()})\n`);
          }

          // 3. Sincronização de Histórico de 24h (para preencher curvas de carga)
          try {
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            
            const formatDate = (date: Date) => {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            };
            
            const todayStr = formatDate(today);
            const yesterdayStr = formatDate(yesterday);
            const datesToSync: string[] = [];

            // Sincronização delta: Verifica se ontem tem menos de 100 pontos no banco
            const countYesterday = await prisma.telemetria.count({
              where: {
                usinaId: usina.id,
                timestamp: {
                  gte: new Date(`${yesterdayStr}T00:00:00-03:00`),
                  lt: new Date(`${todayStr}T00:00:00-03:00`)
                }
              }
            });

            if (countYesterday < 100) {
              datesToSync.push(yesterdayStr);
            } else {
              fs.appendFileSync(logFile, `[SOLIS-SYNC] Pulando backfill para ${yesterdayStr} pois já existem ${countYesterday} registros no banco.\n`);
            }

            // Sempre adiciona o dia atual para sincronização incremental
            datesToSync.push(todayStr);

            fs.appendFileSync(logFile, `[SOLIS-SYNC] Iniciando backfill histórico para as datas: ${datesToSync.join(", ")}\n`);
            
            for (const dateStr of datesToSync) {
              const histData = await SolisService.getStationDay(usina.apiId, dateStr, key, secret);
              if (histData && Array.isArray(histData) && histData.length > 0) {
                fs.appendFileSync(logFile, `[SOLIS-SYNC] Histórico retornado para ${dateStr}: ${histData.length} pontos.\n`);
                
                // Ordena por tempo crescente para cálculo de energia integrada
                const sortedPoints = histData.sort((a: any, b: any) => Number(a.time) - Number(b.time));
                
                const timestampsInHist = sortedPoints.map(p => new Date(Math.floor((Number(p.time) + 11 * 60 * 60 * 1000) / (5 * 60 * 1000)) * (5 * 60 * 1000)));
                const minTime = timestampsInHist[0];
                const maxTime = timestampsInHist[timestampsInHist.length - 1];
                
                const existingTeles = await prisma.telemetria.findMany({
                  where: {
                    usinaId: usina.id,
                    timestamp: { gte: minTime, lte: maxTime }
                  },
                  select: { id: true, timestamp: true }
                });
                
                const existingMap = new Map<string, string>();
                existingTeles.forEach(t => {
                  existingMap.set(t.timestamp.toISOString(), t.id);
                });
                
                const creations: any[] = [];
                const updates: { id: string, power: number, energy: number }[] = [];
                
                let runningEnergy = 0;
                let lastTime = 0;
                
                for (const p of sortedPoints) {
                  const pTime = Number(p.time);
                  const pTimeLocalMs = pTime + 11 * 60 * 60 * 1000;
                  const powerKW = parseFloat(String(p.power || "0")) / 1000;
                  
                  if (lastTime > 0) {
                    const diffHours = (pTime - lastTime) / (1000 * 60 * 60);
                    if (diffHours > 0 && diffHours < 1) {
                      runningEnergy += powerKW * diffHours;
                    }
                  }
                  lastTime = pTime;
                  
                  const pAlignedTime = new Date(Math.floor(pTimeLocalMs / (5 * 60 * 1000)) * (5 * 60 * 1000));
                  const isoStr = pAlignedTime.toISOString();
                  
                  if (existingMap.has(isoStr)) {
                    updates.push({
                      id: existingMap.get(isoStr)!,
                      power: powerKW,
                      energy: parseFloat(runningEnergy.toFixed(2))
                    });
                  } else {
                    creations.push({
                      usinaId: usina.id,
                      timestamp: pAlignedTime,
                      potenciaAtivaKW: powerKW,
                      energiaAcumuladaKWh: parseFloat(runningEnergy.toFixed(2))
                    });
                  }
                }
                
                if (creations.length > 0) {
                  await prisma.telemetria.createMany({ data: creations });
                  fs.appendFileSync(logFile, `[SOLIS-SYNC] Criadas ${creations.length} novas telemetrias.\n`);
                }
                
                if (updates.length > 0) {
                  await Promise.all(updates.map(u => 
                    prisma.telemetria.update({
                      where: { id: u.id },
                      data: {
                        potenciaAtivaKW: u.power,
                        energiaAcumuladaKWh: u.energy
                      }
                    })
                  ));
                  fs.appendFileSync(logFile, `[SOLIS-SYNC] Atualizadas ${updates.length} telemetrias.\n`);
                }
              } else {
                fs.appendFileSync(logFile, `[SOLIS-SYNC] Sem histórico ou erro no retorno para a data ${dateStr}.\n`);
              }
            }
          } catch (histErr) {
            fs.appendFileSync(logFile, `[SOLIS-SYNC] Erro no backfill histórico de ${usina.nome}: ${histErr}\n`);
          }


        } catch (err) {
          fs.appendFileSync(logFile, `[SOLIS-SYNC] Erro fatal em ${usina.nome}: ${err}\n`);
        }
      }
    } catch (dbErr) {
      fs.appendFileSync(logFile, `[SOLIS-SYNC] Falha ao ler do banco: ${dbErr}\n`);
    }
    
    fs.appendFileSync(logFile, `[SOLIS-SYNC] Motor Finalizado com Sucesso.\n`);
  }
}

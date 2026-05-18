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

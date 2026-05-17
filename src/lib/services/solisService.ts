/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * SolisCloud API Service
 *
 * CAMPOS REAIS confirmados 16/05/2026 (stationDetail):
 *   power       → potência atual em kW
 *   dayEnergy   → energia do dia em kWh   ← usar este!
 *   monthEnergy → energia do mês em MWh
 *   allEnergy1  → energia total em kWh
 *   timeZone    → offset UTC (ex: -3 para BRT)
 *
 * Inversores: SNs ficam em extraInfo.invs[].sn
 */

// Usa require para garantir Node.js crypto/https mesmo no contexto do Next.js Turbopack
const nodeCrypto = require("crypto");
const nodeHttps  = require("https");

const SOLIS_HOST    = "www.soliscloud.com";
const SOLIS_PORT    = 13333;
const DEFAULT_KEY   = "1300319277300416147";
const DEFAULT_SEC   = "f5ad8e6d759d469fb8610e2155f9a20c";

function buildHeaders(path: string, body: string, keyId: string, keySecret: string) {
  const date = new Date().toUTCString();
  const md5  = nodeCrypto.createHash("md5").update(body).digest("base64");
  const sign = ["POST", md5, "application/json", date, path].join("\n");
  const sig  = nodeCrypto.createHmac("sha1", keySecret).update(sign).digest("base64");
  return {
    "Content-Type" : "application/json",
    "Content-MD5"  : md5,
    "Date"         : date,
    "Authorization": `API ${keyId}:${sig}`,
    "Content-Length": Buffer.byteLength(body),
  };
}

function solisRequest(path: string, bodyObj: object, keyId: string, keySecret: string): Promise<any> {
  const body = JSON.stringify(bodyObj);
  const headers = buildHeaders(path, body, keyId, keySecret);

  return new Promise((resolve) => {
    const req = nodeHttps.request(
      { hostname: SOLIS_HOST, port: SOLIS_PORT, path, method: "POST", headers, rejectUnauthorized: false },
      (res: any) => {
        let raw = "";
        res.on("data", (c: any) => { raw += c; });
        res.on("end", () => {
          try {
            const j = JSON.parse(raw);
            const logFile = require('path').join(process.cwd(), 'sync_log.txt');
            const fs = require('fs');
            if (j.code !== "0") {
              fs.appendFileSync(logFile, `[SOLIS] API Error em ${path}: code=${j.code} msg="${j.msg}"\n`);
              resolve(null);
            } else {
              resolve(j.data ?? null);
            }
          } catch {
            const logFile = require('path').join(process.cwd(), 'sync_log.txt');
            const fs = require('fs');
            fs.appendFileSync(logFile, `[SOLIS] JSON Parse Error em ${path}: ${raw.slice(0,100)}\n`);
            resolve(null);
          }
        });
      }
    );

    req.setTimeout(15000, () => {
      req.destroy();
      const logFile = require('path').join(process.cwd(), 'sync_log.txt');
      const fs = require('fs');
      fs.appendFileSync(logFile, `[SOLIS] Timeout em ${path}\n`);
      resolve(null);
    });

    req.on("error", (e: any) => {
      const logFile = require('path').join(process.cwd(), 'sync_log.txt');
      const fs = require('fs');
      fs.appendFileSync(logFile, `[SOLIS] Rede erro em ${path}: ${e.message}\n`);
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

export class SolisService {
  /**
   * Dados da usina - stationDetail
   * Campos úteis: power (kW), dayEnergy (kWh), monthEnergy (MWh), allEnergy1 (kWh total)
   */
  static async getStationData(stationId: string, keyId?: string, keySecret?: string) {
    const kid  = keyId    || DEFAULT_KEY;
    const ksec = keySecret || DEFAULT_SEC;
    console.log(`[SOLIS] getStationData stationId=${stationId}`);
    const d = await solisRequest("/v1/api/stationDetail", { id: stationId }, kid, ksec);
    if (d) console.log(`[SOLIS] power=${d.power}kW  dayEnergy=${d.dayEnergy}kWh  inversores=${d.inverterCount} (online=${d.inverterOnlineCount})`);
    return d;
  }

  /**
   * Lista inversores da usina
   * Retorna registros com: sn, model, state, etc.
   */
  static async getInverterList(stationId: string, keyId?: string, keySecret?: string): Promise<any[]> {
    const kid  = keyId    || DEFAULT_KEY;
    const ksec = keySecret || DEFAULT_SEC;
    const d = await solisRequest("/v1/api/inverterList", { stationId, pageNo: 1, pageSize: 20 }, kid, ksec);
    if (!d) return [];
    const records = d?.page?.records ?? d?.records ?? d ?? [];
    return Array.isArray(records) ? records : [];
  }

  /**
   * Detalhe de inversor individual por SN
   */
  static async getInverterDetailBySn(sn: string, keyId?: string, keySecret?: string): Promise<any | null> {
    const kid  = keyId    || DEFAULT_KEY;
    const ksec = keySecret || DEFAULT_SEC;
    return await solisRequest("/v1/api/inverterDetail", { sn }, kid, ksec);
  }

  /**
   * Detalhe do primeiro inversor online de uma usina (legado/fallback)
   */
  static async getInverterDetail(stationId: string, keyId?: string, keySecret?: string): Promise<any | null> {
    const kid  = keyId    || DEFAULT_KEY;
    const ksec = keySecret || DEFAULT_SEC;
    const inverters = await this.getInverterList(stationId, kid, ksec);
    
    for (const inv of inverters) {
      const sn = inv.sn || inv.inverterSn;
      if (sn) {
        const d = await this.getInverterDetailBySn(sn, kid, ksec);
        if (d) return d;
      }
    }
    return null;
  }

  /**
   * Lista todas as usinas da conta
   */
  static async listStations(keyId?: string, keySecret?: string): Promise<any[]> {
    const kid  = keyId    || DEFAULT_KEY;
    const ksec = keySecret || DEFAULT_SEC;
    const d = await solisRequest("/v1/api/userStationList", { pageNo: 1, pageSize: 100 }, kid, ksec);
    if (!d) return [];
    const records = d?.page?.records ?? d?.records ?? d ?? [];
    return Array.isArray(records) ? records : (records.records ?? []);
  }
}

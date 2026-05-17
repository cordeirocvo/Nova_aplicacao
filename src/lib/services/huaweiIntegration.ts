import { prisma } from "../prisma";
import fs from "fs";
import path from "path";
const https = require('https');
const logFile = path.join(process.cwd(), 'sync_log.txt');

/**
 * Serviço de Integração Huawei FusionSolar Northbound API
 * Implementação Robusta com Processamento em Lote (Batch) e Delays
 */
export class HuaweiIntegration {
  private static hostname = "la5.fusionsolar.huawei.com";

  /**
   * Requisição base usando módulo https nativo (evita problemas de TLS e headers no Next.js)
   */
  private static async hwRequest(path: string, body: any, token: string = '', cookie: string = '') {
    return new Promise<any>((resolve, reject) => {
      const data = JSON.stringify(body);
      const headers: any = { 
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      };
      if (token)  headers['XSRF-TOKEN'] = token;
      if (cookie) headers['Cookie'] = cookie;

      const options = {
        hostname: this.hostname,
        port: 443,
        path: '/thirdData' + path,
        method: 'POST',
        headers,
        rejectUnauthorized: false
      };

      const req = https.request(options, (res: any) => {
        let raw = '';
        res.on('data', (c: any) => raw += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(raw);
            resolve({ 
              ...j, 
              _xsrf: res.headers['xsrf-token'] || '', 
              _cookies: (res.headers['set-cookie'] || []).join('; ') 
            });
          } catch (e) {
            fs.appendFileSync(logFile, `[HW API] Falha JSON de ${path}: ${raw.slice(0,100)}\n`);
            reject(new Error(`Invalid JSON response from Huawei: ${path}`));
          }
        });
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error(`Huawei Timeout (${path})`));
      });

      req.on('error', (err: any) => {
        console.error(`[HW API] Erro na requisição ${path}:`, err);
        reject(err);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Login com Gerenciamento de Sessão (Cache em arquivo)
   */
  static async login(user?: string, pass?: string) {
    const userName = user || "Cordeiroapihuawei";
    const systemCode = pass || "Cordeiroapi123";
    
    const userHash = Buffer.from(userName).toString('hex').slice(0, 8);
    const sessionPath = path.join(process.cwd(), `.huawei-session-${userHash}.json`);

    // Tenta carregar do cache
    if (fs.existsSync(sessionPath)) {
      try {
        const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
        if (Date.now() < session.expiry) return session;
      } catch (e) {}
    }

    try {
      console.log(`[HW API] Fazendo novo login para usuário: ${userName}`);
      const res = await this.hwRequest('/login', { userName, systemCode });
      
      if (!res.success && res.failCode !== 0) {
        throw new Error(`Login Huawei falhou: ${res.message || res.failCode}`);
      }

      const session = {
        token: res._xsrf,
        cookie: res._cookies,
        expiry: Date.now() + 25 * 60 * 1000 // Expira em 25 min (Huawei expira em 30)
      };

      fs.writeFileSync(sessionPath, JSON.stringify(session));
      return session;
    } catch (error) {
      console.error("Huawei Login Error:", error);
      throw error;
    }
  }

  /**
   * Lista todas as usinas (stations) associadas à conta
   */
  static async listStations(user?: string, pass?: string): Promise<any[]> {
    try {
      const login = await this.login(user, pass);
      const res = await this.hwRequest('/getStationList', { pageNo: 1 }, login.token, login.cookie);
      return res.data?.list || res.data || [];
    } catch (error) {
      console.error("Huawei listStations Error:", error);
      return [];
    }
  }

  /**
   * Busca KPIs de múltiplas usinas em uma única chamada (Batch)
   */
  static async getPlantData(stationCodes: string, token: string, cookie: string) {
    try {
      const res = await this.hwRequest('/getStationRealKpi', { stationCodes }, token, cookie);
      return res.data || [];
    } catch (error) {
      console.error("Huawei getPlantData Error:", error);
      return [];
    }
  }

  /**
   * Busca lista de dispositivos de múltiplas usinas em uma única chamada (Batch)
   */
  static async getDeviceList(stationCodes: string, token: string, cookie: string) {
    try {
      const res = await this.hwRequest('/getDevList', { stationCodes }, token, cookie);
      return res.data || [];
    } catch (error) {
      console.error("Huawei getDeviceList Error:", error);
      return [];
    }
  }

  /**
   * Busca KPIs em tempo real de múltiplos dispositivos (Batch)
   */
  static async getDeviceRealData(devIds: string, token: string, cookie: string) {
    try {
      const ids = devIds.split(',');
      const results: any[] = [];
      
      // Processa em lotes de 50 para evitar limites de buffer da API
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50).join(',');
        const res = await this.hwRequest('/getDevRealKpi', { devIds: batch, devTypeId: 1 }, token, cookie);
        if (res.data) results.push(...res.data);
        if (ids.length > 50) await new Promise(r => setTimeout(r, 1000));
      }
      
      return results;
    } catch (error) {
      console.error("Huawei getDeviceRealData Error:", error);
      return [];
    }
  }

  /**
   * Cálculo de perdas AI (Mantido para compatibilidade com Dashboard)
   */
  static async calculateLosses(usinaId: string) {
    const usina = await prisma.usina.findUnique({ where: { id: usinaId } });
    if (!usina) throw new Error("Usina não encontrada");

    return await prisma.analisePerda.create({
      data: {
        usinaId,
        performanceRatio: 0.82,
        perdaSujidade: (usina.coefSujidade * 100) * 1.15,
        perdaClipping: 0.5,
        perdaTemperatura: 2.1,
        perdaDowntime: 0,
        insightsAI: `Análise baseada em calibração local (${(usina.coefSujidade * 100).toFixed(1)}% sujidade/mês). Recomendamos inspeção térmica preventiva.`
      }
    });
  }
}

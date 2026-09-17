import { spawn } from 'child_process';
import path from 'path';

export interface PvlibMeteoRecord {
  timestamp: string | Date;
  ghi?: number | null;
  poa?: number | null;
  tempAmbiente?: number | null;
  tempModulos?: number | null;
  velocidadeVento?: number | null;
}

export interface PvlibSimulationInput {
  date: string; // YYYY-MM-DD
  latitude?: number;
  longitude?: number;
  timezone?: string;
  capacidadeKWp?: number;
  capacidadeCA?: number;
  tilt?: number;
  azimuth?: number;
  gamma_temp?: number;
  eta_inv?: number;
  meteo_data?: PvlibMeteoRecord[];
}

export interface PvlibCurvePoint {
  time: string; // HH:mm
  expectedKW: number;
  unclippedKW: number;
  poa: number;
  cellTemp: number;
}

export interface PvlibSimulationResult {
  date: string;
  capacidadeKWp: number;
  capacidadeCA: number;
  energiaEsperadaKWh: number;
  energiaSemCeifamentoKWh: number;
  perdaCeifamentoKWh: number;
  perdaTemperaturaKWh: number;
  prEsperado: number;
  curvaEsperada: PvlibCurvePoint[];
  fonte: 'PVLIB_PYTHON' | 'ANALYTIC_FALLBACK';
}

export class PvlibService {
  /**
   * Executa a simulação científica pvlib via subprocesso Python
   */
  public static async simulate(input: PvlibSimulationInput): Promise<PvlibSimulationResult> {
    try {
      const pythonResult = await this.runPythonEngine(input);
      return {
        ...pythonResult,
        fonte: 'PVLIB_PYTHON',
      };
    } catch (err: any) {
      console.warn('pvlib Python indisponível ou falhou, acionando fallback analítico TS:', err.message);
      return this.runAnalyticFallback(input);
    }
  }

  private static runPythonEngine(input: PvlibSimulationInput): Promise<any> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.resolve(process.cwd(), 'src/lib/services/pvlib_engine.py');
      const pyProcess = spawn('python', [scriptPath]);

      let stdoutData = '';
      let stderrData = '';

      pyProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pyProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pyProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`pvlib_engine.py finalizou com código ${code}: ${stderrData}`));
        }
        try {
          const parsed = JSON.parse(stdoutData);
          if (parsed.error) return reject(new Error(parsed.error));
          resolve(parsed);
        } catch (e: any) {
          reject(new Error(`Erro ao interpretar saída JSON do pvlib: ${e.message}\nRaw: ${stdoutData}`));
        }
      });

      pyProcess.on('error', (err) => {
        reject(err);
      });

      pyProcess.stdin.write(JSON.stringify(input));
      pyProcess.stdin.end();
    });
  }

  /**
   * Fallback analítico em TypeScript de alta fidelidade
   * Garante funcionamento autônomo mesmo em Vercel/Serverless sem Python
   */
  private static runAnalyticFallback(input: PvlibSimulationInput): PvlibSimulationResult {
    const kwp_dc = input.capacidadeKWp || 1400.0;
    const kw_ac_max = input.capacidadeCA || 1000.0;
    const gamma = input.gamma_temp || -0.0035; // -0.35%/°C
    const eta_inv = input.eta_inv || 0.985;
    const dateStr = input.date;

    const meteoMap = new Map<string, PvlibMeteoRecord>();
    if (input.meteo_data && input.meteo_data.length > 0) {
      for (const m of input.meteo_data) {
        const d = new Date(m.timestamp);
        const hh = String(d.getUTCHours() - 3 + (d.getUTCHours() - 3 < 0 ? 24 : 0)).padStart(2, '0');
        const mm = String(Math.floor(d.getUTCMinutes() / 5) * 5).padStart(2, '0');
        meteoMap.set(`${hh}:${mm}`, m);
      }
    }

    const curvePoints: PvlibCurvePoint[] = [];
    let totalClippedKWh = 0;
    let totalUnclippedKWh = 0;
    let totalSTCKWh = 0;
    let totalPoaIntegral = 0;
    const dt = 5.0 / 60.0; // 5 minutos em horas

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const hourFloat = h + m / 60;

        let poa = 0;
        let cellTemp = 25;

        // Se houver medição na estação solarimétrica para este minuto
        const meteo = meteoMap.get(timeStr);
        if (meteo && (meteo.poa != null || meteo.ghi != null)) {
          poa = meteo.poa ?? (meteo.ghi ? meteo.ghi * 1.05 : 0);
          cellTemp = meteo.tempModulos ?? (meteo.tempAmbiente ? meteo.tempAmbiente + (poa / 800) * 20 : 25 + (poa / 800) * 25);
        } else if (hourFloat >= 5.5 && hourFloat <= 18.0) {
          // Curva Clear-Sky analítica padrão Brasil central
          const solarDuration = 12.5;
          const peakHour = 11.75;
          const x = (hourFloat - (peakHour - solarDuration / 2)) / solarDuration;
          if (x > 0 && x < 1) {
            poa = 1020 * Math.sin(x * Math.PI);
            poa = Math.max(0, poa);
            cellTemp = 24 + 32 * Math.sin(x * Math.PI);
          }
        }

        const p_dc_stc = (poa / 1000.0) * kwp_dc;
        const tempFactor = Math.max(0.7, Math.min(1.1, 1.0 + gamma * (cellTemp - 25.0)));
        const p_dc_real = p_dc_stc * tempFactor;
        const p_ac_unclipped = p_dc_real * eta_inv;
        const p_ac_clipped = Math.min(kw_ac_max, p_ac_unclipped);

        if (poa > 5) {
          totalPoaIntegral += poa * dt;
          totalSTCKWh += p_dc_stc * eta_inv * dt;
          totalUnclippedKWh += p_ac_unclipped * dt;
          totalClippedKWh += p_ac_clipped * dt;
        }

        curvePoints.push({
          time: timeStr,
          expectedKW: parseFloat(p_ac_clipped.toFixed(2)),
          unclippedKW: parseFloat(p_ac_unclipped.toFixed(2)),
          poa: parseFloat(poa.toFixed(1)),
          cellTemp: parseFloat(cellTemp.toFixed(1)),
        });
      }
    }

    const lossClipping = Math.max(0, totalUnclippedKWh - totalClippedKWh);
    const lossTemp = Math.max(0, totalSTCKWh - totalUnclippedKWh);
    const prEsperado = totalPoaIntegral > 0 ? (totalClippedKWh / ((kwp_dc * totalPoaIntegral) / 1000)) * 100 : 82.0;

    return {
      date: dateStr,
      capacidadeKWp: kwp_dc,
      capacidadeCA: kw_ac_max,
      energiaEsperadaKWh: parseFloat(totalClippedKWh.toFixed(2)),
      energiaSemCeifamentoKWh: parseFloat(totalUnclippedKWh.toFixed(2)),
      perdaCeifamentoKWh: parseFloat(lossClipping.toFixed(2)),
      perdaTemperaturaKWh: parseFloat(lossTemp.toFixed(2)),
      prEsperado: parseFloat(prEsperado.toFixed(1)),
      curvaEsperada: curvePoints,
      fonte: 'ANALYTIC_FALLBACK',
    };
  }
}

import * as fs from "node:fs";

const envPath = "./.env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const index = trimmed.indexOf("=");
      if (index !== -1) {
        const key = trimmed.substring(0, index).trim();
        let value = trimmed.substring(index + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
}

import { pvlibSimulate } from "./src/lib/engenharia/solarEngine";

const lat = -19.29;
const lon = -44.42;
const cap = 1399.99;

async function getSatelliteHSP(lat: number, lon: number, month: number): Promise<number> {
  try {
    const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${lat}&lon=${lon}&peakpower=1&loss=14&outputformat=json`;
    const res = await fetch(url);
    const data = await res.json();
    const monthlyList = data.outputs?.monthly?.fixed || [];
    const item = monthlyList.find((x: any) => x.month === month);
    return item ? item.E_d : 5.2;
  } catch (e) {
    return 5.2;
  }
}

async function run() {
  const hsp = await getSatelliteHSP(lat, lon, 6);
  const peakIrr = hsp / 0.005317;

  const targetPoints = [
    { time: "06:20", target: 0.20 },
    { time: "06:45", target: 18.59 },
    { time: "07:00", target: 41.36 },
    { time: "07:15", target: 91.23 },
    { time: "07:20", target: 114.59 }
  ];

  console.log("=== OPTIMIZING LOW-SUN CORRECTION ===");
  
  let bestCap = 10;
  let bestExp = 1.0;
  let bestShift = -8;
  let minError = Infinity;

  // Search grid
  for (let shift = -12; shift <= 0; shift += 2) {
    for (let capAngle = 8; capAngle <= 16; capAngle += 1) {
      for (let exp = 0.5; exp <= 2.5; exp += 0.1) {
        let totalError = 0;
        
        targetPoints.forEach(pt => {
          const [h, m] = pt.time.split(":").map(Number);
          const t = new Date(2026, 5, 19, h, m, 0);
          const shiftedTime = new Date(t.getTime() + shift * 60 * 1000);
          const hour = shiftedTime.getHours() + shiftedTime.getMinutes() / 60;

          let irr = 0;
          if (hour >= 6 && hour <= 18) {
            const x = (hour - 12) / 3;
            irr = Math.max(0, peakIrr * Math.exp(-x * x));
          }

          // We mock the astronomical calculation to get the elevation
          const dateObj = new Date(shiftedTime);
          const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
          const diffMs = dateObj.getTime() - startOfYear.getTime();
          const dayOfYear = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
          const delta = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) * (Math.PI / 180);
          const EoT = 9.87 * Math.sin(2 * (360 * (dayOfYear - 81)) / 365 * (Math.PI / 180)) - 7.53 * Math.cos((360 * (dayOfYear - 81)) / 365 * (Math.PI / 180));
          const localHours = dateObj.getHours() + dateObj.getMinutes() / 60;
          const LSTM = -45;
          const TC = 4 * (lon - LSTM) + EoT;
          const LST = localHours + TC / 60;
          const H = 15 * (LST - 12) * (Math.PI / 180);
          const latRad = lat * (Math.PI / 180);
          const sinElevation = Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.cos(H);
          const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation)));
          const elDeg = elevation * (180 / Math.PI);

          let rawPower = pvlibSimulate({
            timestamp: shiftedTime,
            irradianciaGHI: irr,
            tempAmbiente: 20,
            capacidadeKWp: cap,
            latitude: lat,
            longitude: lon,
            inclinacao: 10,
            orientacao: 180
          });

          // Apply correction
          let correctedPower = rawPower;
          if (elDeg > 0 && elDeg < capAngle) {
            const factor = Math.pow(Math.sin((elDeg / capAngle) * Math.PI / 2), exp);
            correctedPower = rawPower * factor;
          } else if (elDeg <= 0) {
            // Give a tiny value if elevation is slightly below 0 but we want some twilight power
            correctedPower = elDeg >= -2 ? 0.20 : 0;
          }

          totalError += Math.abs(correctedPower - pt.target);
        });

        if (totalError < minError) {
          minError = totalError;
          bestCap = capAngle;
          bestExp = exp;
          bestShift = shift;
        }
      }
    }
  }

  console.log(`\nBest Parameters found:`);
  console.log(`Time Shift: ${bestShift} minutes`);
  console.log(`Cap Angle: ${bestCap} degrees`);
  console.log(`Exponent: ${bestExp.toFixed(2)}`);
  console.log(`Min Absolute Error: ${minError.toFixed(2)} kW`);

  // Print optimized values
  console.log("\nOptimized curve matching:");
  targetPoints.forEach(pt => {
    const [h, m] = pt.time.split(":").map(Number);
    const t = new Date(2026, 5, 19, h, m, 0);
    const shiftedTime = new Date(t.getTime() + bestShift * 60 * 1000);
    const hour = shiftedTime.getHours() + shiftedTime.getMinutes() / 60;

    let irr = 0;
    if (hour >= 6 && hour <= 18) {
      const x = (hour - 12) / 3;
      irr = Math.max(0, peakIrr * Math.exp(-x * x));
    }

    // Elevation calculation
    const dateObj = new Date(shiftedTime);
    const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
    const diffMs = dateObj.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
    const delta = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) * (Math.PI / 180);
    const EoT = 9.87 * Math.sin(2 * (360 * (dayOfYear - 81)) / 365 * (Math.PI / 180)) - 7.53 * Math.cos((360 * (dayOfYear - 81)) / 365 * (Math.PI / 180));
    const localHours = dateObj.getHours() + dateObj.getMinutes() / 60;
    const LSTM = -45;
    const TC = 4 * (lon - LSTM) + EoT;
    const LST = localHours + TC / 60;
    const H = 15 * (LST - 12) * (Math.PI / 180);
    const latRad = lat * (Math.PI / 180);
    const sinElevation = Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.cos(H);
    const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation)));
    const elDeg = elevation * (180 / Math.PI);

    let rawPower = pvlibSimulate({
      timestamp: shiftedTime,
      irradianciaGHI: irr,
      tempAmbiente: 20,
      capacidadeKWp: cap,
      latitude: lat,
      longitude: lon,
      inclinacao: 10,
      orientacao: 180
    });

    let correctedPower = rawPower;
    if (elDeg > 0 && elDeg < bestCap) {
      const factor = Math.pow(Math.sin((elDeg / bestCap) * Math.PI / 2), bestExp);
      correctedPower = rawPower * factor;
    } else if (elDeg <= 0) {
      correctedPower = elDeg >= -2 ? 0.20 : 0;
    }

    console.log(`Time: ${pt.time} | Real: ${pt.target.toFixed(2)} kW | Calibrated: ${correctedPower.toFixed(2)} kW | Error: ${Math.abs(correctedPower - pt.target).toFixed(2)} kW`);
  });
}

run().catch(console.error);

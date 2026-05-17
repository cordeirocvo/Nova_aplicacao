import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';

/* ── Solis HMAC inline (sem importar SolisService — evita cache do Turbopack) ── */
function solisPost(path: string, bodyObj: object): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const https  = require("https");

  const KEY_ID  = "1300319277300416147";
  const KEY_SEC = "f5ad8e6d759d469fb8610e2155f9a20c";
  const HOST    = "www.soliscloud.com";
  const PORT    = 13333;

  const body = JSON.stringify(bodyObj);
  const date = new Date().toUTCString();
  const md5  = crypto.createHash("md5").update(body).digest("base64");
  const sign = ["POST", md5, "application/json", date, path].join("\n");
  const sig  = crypto.createHmac("sha1", KEY_SEC).update(sign).digest("base64");

  const headers = {
    "Content-Type" : "application/json",
    "Content-MD5"  : md5,
    "Date"         : date,
    "Authorization": `API ${KEY_ID}:${sig}`,
    "Content-Length": Buffer.byteLength(body),
  };

  return new Promise((resolve) => {
    const req = https.request(
      { hostname: HOST, port: PORT, path, method: "POST", headers, rejectUnauthorized: false },
      (res: any) => {
        let raw = "";
        res.on("data", (c: any) => { raw += c; });
        res.on("end", () => {
          try {
            const j = JSON.parse(raw);
            resolve({ httpStatus: res.statusCode, ...j });
          } catch {
            resolve({ httpStatus: res.statusCode, rawBody: raw.slice(0, 500) });
          }
        });
      }
    );
    req.on("error", (e: any) => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "diagnose";

  /* ── Busca usina Solis no banco ── */
  const globalSolis = await prisma.manufacturerAPI.findFirst({ where: { name: "SOLIS" } });
  const usina = await prisma.usina.findFirst({
    where : { apiFornecedor: { in: ["SOLIS", "Solis", "solis"] } },
    include: { telemetria: { orderBy: { timestamp: "desc" }, take: 3 } },
  });

  if (!usina) return NextResponse.json({ error: "Nenhuma usina Solis encontrada" });

  /* ── CLEAN: apaga tudo e grava dados reais ── */
  if (action === "clean") {
    const deleted = await prisma.telemetria.deleteMany({ where: { usinaId: usina.id } });

    const stationRaw = await solisPost("/v1/api/stationDetail", { id: usina.apiId });
    if (!stationRaw || stationRaw.code !== "0") {
      return NextResponse.json({ deletedFakeRecords: deleted.count, apiError: stationRaw });
    }

    const d       = stationRaw.data ?? {};
    const powerKW = parseFloat(String(d.power     ?? "0"));
    const energy  = parseFloat(String(d.dayEnergy  ?? d.eToday ?? "0"));

    // Inversor
    const invListRaw = await solisPost("/v1/api/inverterList", { stationId: usina.apiId, pageNo: 1, pageSize: 20 });
    const invRecords = invListRaw?.data?.page?.records ?? invListRaw?.data?.records ?? [];
    const firstSN    = Array.isArray(invRecords) && invRecords.length ? (invRecords[0].sn ?? invRecords[0].inverterSn) : null;
    const invDetail  = firstSN ? await solisPost("/v1/api/inverterDetail", { sn: firstSN }) : null;
    const inv        = invDetail?.data ?? {};

    const strings: Record<string, { V: number; I: number }> = {};
    for (let i = 1; i <= 8; i++) {
      const v   = parseFloat(String(inv[`uPv${i}`] ?? "0"));
      const amp = parseFloat(String(inv[`iPv${i}`] ?? "0"));
      if (v > 0 || amp > 0) strings[`S${i}`] = { V: v, I: amp };
    }

    const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const saved = await prisma.telemetria.create({
      data: {
        usinaId            : usina.id,
        potenciaAtivaKW    : powerKW,
        energiaAcumuladaKWh: energy,
        irradiancia        : 0,
        tempAmbiente       : 0,
        tempModulos        : 0,
        timestamp          : brt,
        tensaoCA_A         : parseFloat(String(inv.uAc1 ?? "0")),
        tensaoCA_B         : parseFloat(String(inv.uAc2 ?? "0")),
        tensaoCA_C         : parseFloat(String(inv.uAc3 ?? "0")),
        correnteCA_A       : parseFloat(String(inv.iAc1 ?? "0")),
        correnteCA_B       : parseFloat(String(inv.iAc2 ?? "0")),
        correnteCA_C       : parseFloat(String(inv.iAc3 ?? "0")),
        tempIGBT           : parseFloat(String(inv.inverterTemperature ?? "0")),
        dadosStrings       : strings,
      },
    });

    return NextResponse.json({
      success         : true,
      deletedFakeRecords: deleted.count,
      gravado         : { powerKW, energy, tensaoCA_A: saved.tensaoCA_A, stringsCount: Object.keys(strings).length },
    });
  }

  /* ── DIAGNOSE: mostra dados sem alterar ── */
  const stationRaw = await solisPost("/v1/api/stationDetail", { id: usina.apiId });

  return NextResponse.json({
    usina: { id: usina.id, nome: usina.nome, apiId: usina.apiId },
    banco: usina.telemetria.map(t => ({
      timestamp           : t.timestamp,
      potenciaAtivaKW     : t.potenciaAtivaKW,
      energiaAcumuladaKWh : t.energiaAcumuladaKWh,
      tensaoCA_A          : t.tensaoCA_A,
      ehFake              : t.tensaoCA_A === 798.5 || t.tensaoCA_A === 801.2,
    })),
    solis_raw : stationRaw,
    campos_energia: stationRaw?.data ? {
      power     : stationRaw.data.power,
      dayEnergy : stationRaw.data.dayEnergy,
      monthEnergy: stationRaw.data.monthEnergy,
      allEnergy : stationRaw.data.allEnergy,
      todos_campos: Object.keys(stationRaw.data),
    } : null,
  });
}

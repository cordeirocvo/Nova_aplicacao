import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_MANUFACTURERS = [
  {
    name: "HUAWEI",
    userKey: "Cordeiroapihuawei",
    secretKey: "Cordeiroapi123",
    apiUrl: "https://la5.fusionsolar.huawei.com/thirdData"
  },
  {
    name: "SOLIS",
    userKey: "1300319277300416147",
    secretKey: "Z23F3H297P0K0X38",
    apiUrl: "https://www.soliscloud.com:13333"
  },
  {
    name: "CANADIAN_SOLAR",
    userKey: "",
    secretKey: "",
    apiUrl: "https://csi.monitoring.com/api"
  },
  {
    name: "HOYMILES",
    userKey: "",
    secretKey: "",
    apiUrl: "https://global.hoymiles.com/api/portal/v1"
  },
  {
    name: "FRONIUS",
    userKey: "",
    secretKey: "",
    apiUrl: "https://api.solarweb.com/sw/solarweb/v1"
  },
  {
    name: "FOXESS",
    userKey: "",
    secretKey: "",
    apiUrl: "https://www.foxesscloud.com/op/v0"
  },
  {
    name: "SOLAX",
    userKey: "",
    secretKey: "",
    apiUrl: "https://www.solaxcloud.com/proxy/api"
  },
  {
    name: "SUNGROW",
    userKey: "",
    secretKey: "",
    apiUrl: "https://gateway.isolarcloud.com"
  },
  {
    name: "NEP",
    userKey: "",
    secretKey: "",
    apiUrl: "https://api.nepviewer.com/v1"
  },
  {
    name: "SMA",
    userKey: "",
    secretKey: "",
    apiUrl: "https://api.sunnyportal.com"
  },
  {
    name: "DEYE",
    userKey: "",
    secretKey: "",
    apiUrl: "https://globalapi.solarmanpv.com"
  },
  {
    name: "GROWATT",
    userKey: "",
    secretKey: "",
    apiUrl: "https://openapi.growatt.com"
  },
  {
    name: "OUTROS",
    userKey: "",
    secretKey: "",
    apiUrl: ""
  }
];

export async function GET() {
  try {
    const results = [];
    for (const m of DEFAULT_MANUFACTURERS) {
      const item = await prisma.manufacturerAPI.upsert({
        where: { name: m.name },
        update: {
          ...(m.userKey ? { userKey: m.userKey } : {}),
          ...(m.secretKey ? { secretKey: m.secretKey } : {}),
          ...(m.apiUrl ? { apiUrl: m.apiUrl } : {})
        },
        create: {
          name: m.name,
          userKey: m.userKey,
          secretKey: m.secretKey,
          apiUrl: m.apiUrl,
          active: true
        }
      });
      results.push(item);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${results.length} fabricantes semeados com sucesso!`,
      manufacturers: results
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao semear dados", details: error.message }, { status: 500 });
  }
}

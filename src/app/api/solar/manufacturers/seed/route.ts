import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Huawei
    await prisma.manufacturerAPI.upsert({
      where: { name: "HUAWEI" },
      update: {
        userKey: "Cordeiroapihuawei",
        secretKey: "Cordeiroapi123",
        apiUrl: "https://la5.fusionsolar.huawei.com/thirdData"
      },
      create: {
        name: "HUAWEI",
        userKey: "Cordeiroapihuawei",
        secretKey: "Cordeiroapi123",
        apiUrl: "https://la5.fusionsolar.huawei.com/thirdData"
      }
    });

    // Solis
    await prisma.manufacturerAPI.upsert({
      where: { name: "SOLIS" },
      update: {
        userKey: "1300319277300416147",
        secretKey: "Z23F3H297P0K0X38",
        apiUrl: "https://www.soliscloud.com:13333"
      },
      create: {
        name: "SOLIS",
        userKey: "1300319277300416147",
        secretKey: "Z23F3H297P0K0X38",
        apiUrl: "https://www.soliscloud.com:13333"
      }
    });

    return NextResponse.json({ success: true, message: "Huawei e Solis cadastradas com sucesso!" });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao semear dados" }, { status: 500 });
  }
}

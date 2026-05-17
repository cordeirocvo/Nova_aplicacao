import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const manufacturers = await prisma.manufacturerAPI.findMany();
    const huawei = manufacturers.find(m => m.name === "HUAWEI");
    const solis = manufacturers.find(m => m.name === "SOLIS");

    return NextResponse.json({
      huawei: {
        user: huawei?.userKey || "",
        pass: huawei?.secretKey ? "********" : "" // Proteção visual
      },
      solis: {
        key: solis?.userKey || "",
        secret: solis?.secretKey ? "********" : ""
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar chaves" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { huawei, solis } = body;

    // Buscamos as configurações atuais para não sobrescrever o que for "********"
    const currentHuawei = await prisma.manufacturerAPI.findUnique({ where: { name: "HUAWEI" } });
    const currentSolis = await prisma.manufacturerAPI.findUnique({ where: { name: "SOLIS" } });

    await prisma.manufacturerAPI.upsert({
      where: { name: "HUAWEI" },
      create: {
        name: "HUAWEI",
        userKey: huawei.user,
        secretKey: huawei.pass && !huawei.pass.includes("*") ? huawei.pass : currentHuawei?.secretKey,
      },
      update: {
        userKey: huawei.user,
        secretKey: huawei.pass && !huawei.pass.includes("*") ? huawei.pass : currentHuawei?.secretKey,
      }
    });

    await prisma.manufacturerAPI.upsert({
      where: { name: "SOLIS" },
      create: {
        name: "SOLIS",
        userKey: solis.key,
        secretKey: solis.secret && !solis.secret.includes("*") ? solis.secret : currentSolis?.secretKey,
      },
      update: {
        userKey: solis.key,
        secretKey: solis.secret && !solis.secret.includes("*") ? solis.secret : currentSolis?.secretKey,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Config Error:", error);
    return NextResponse.json({ error: "Erro ao salvar chaves" }, { status: 500 });
  }
}

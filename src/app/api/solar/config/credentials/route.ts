import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findFirst({
      where: { id: "default" }
    });

    return NextResponse.json({
      huawei: {
        user: settings?.huaweiUser || "",
        pass: settings?.huaweiPass ? "********" : "" // Proteção visual
      },
      solis: {
        key: settings?.solisKey || "",
        secret: settings?.solisSecret ? "********" : ""
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
    const current = await prisma.systemSettings.findFirst({ where: { id: "default" } });

    await prisma.systemSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        huaweiUser: huawei.user,
        huaweiPass: huawei.pass && !huawei.pass.includes("*") ? huawei.pass : current?.huaweiPass,
        solisKey: solis.key,
        solisSecret: solis.secret && !solis.secret.includes("*") ? solis.secret : current?.solisSecret,
      },
      update: {
        huaweiUser: huawei.user,
        huaweiPass: huawei.pass && !huawei.pass.includes("*") ? huawei.pass : current?.huaweiPass,
        solisKey: solis.key,
        solisSecret: solis.secret && !solis.secret.includes("*") ? solis.secret : current?.solisSecret,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Config Error:", error);
    return NextResponse.json({ error: "Erro ao salvar chaves" }, { status: 500 });
  }
}

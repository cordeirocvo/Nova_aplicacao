import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CryptoService } from "@/lib/security/cryptoService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ENGENHEIRO")) {
      return NextResponse.json({ error: "Acesso não autorizado às credenciais de API" }, { status: 401 });
    }

    const manufacturers = await prisma.manufacturerAPI.findMany();
    const huawei = manufacturers.find(m => m.name === "HUAWEI");
    const solis = manufacturers.find(m => m.name === "SOLIS");

    return NextResponse.json({
      huawei: {
        user: huawei?.userKey ? (CryptoService.isEncrypted(huawei.userKey) ? CryptoService.decrypt(huawei.userKey) : huawei.userKey) : "",
        pass: huawei?.secretKey ? "********" : "" // Proteção visual
      },
      solis: {
        key: solis?.userKey ? (CryptoService.isEncrypted(solis.userKey) ? CryptoService.decrypt(solis.userKey) : solis.userKey) : "",
        secret: solis?.secretKey ? "********" : ""
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar chaves" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem atualizar credenciais de fabricantes" }, { status: 403 });
    }

    const body = await req.json();
    const { huawei, solis } = body;

    // Buscamos as configurações atuais para não sobrescrever o que for "********"
    const currentHuawei = await prisma.manufacturerAPI.findUnique({ where: { name: "HUAWEI" } });
    const currentSolis = await prisma.manufacturerAPI.findUnique({ where: { name: "SOLIS" } });

    const finalHuaweiSecret = huawei?.pass && !huawei.pass.includes("*")
      ? CryptoService.encrypt(huawei.pass)
      : currentHuawei?.secretKey;

    const finalHuaweiUser = huawei?.user
      ? CryptoService.encrypt(huawei.user)
      : currentHuawei?.userKey;

    await prisma.manufacturerAPI.upsert({
      where: { name: "HUAWEI" },
      create: {
        name: "HUAWEI",
        userKey: finalHuaweiUser,
        secretKey: finalHuaweiSecret,
      },
      update: {
        userKey: finalHuaweiUser,
        secretKey: finalHuaweiSecret,
      }
    });

    const finalSolisSecret = solis?.secret && !solis.secret.includes("*")
      ? CryptoService.encrypt(solis.secret)
      : currentSolis?.secretKey;

    const finalSolisKey = solis?.key
      ? CryptoService.encrypt(solis.key)
      : currentSolis?.userKey;

    await prisma.manufacturerAPI.upsert({
      where: { name: "SOLIS" },
      create: {
        name: "SOLIS",
        userKey: finalSolisKey,
        secretKey: finalSolisSecret,
      },
      update: {
        userKey: finalSolisKey,
        secretKey: finalSolisSecret,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Config Error:", error);
    return NextResponse.json({ error: "Erro ao salvar chaves" }, { status: 500 });
  }
}

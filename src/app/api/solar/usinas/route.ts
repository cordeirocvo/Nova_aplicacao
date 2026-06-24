import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';

export async function GET() {
  try {
    const usinas = await prisma.usina.findMany({
      orderBy: { nome: "asc" }
    });
    return NextResponse.json(usinas);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar usinas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      nome, 
      apiFornecedor, 
      apiId, 
      apiKey,
      apiSecret,
      estacaoId,
      latitude,
      longitude,
      modoIrradiancia,
      localizacao,
      inclinacao,
      orientacao
    } = body;

    // Função auxiliar para limpar e converter números (suporta vírgula e ponto)
    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === "") return 0;
      const clean = val.toString().replace(",", ".");
      return parseFloat(clean) || 0;
    };

    const parseNullableNum = (val: any) => {
      if (val === undefined || val === null || val === "") return null;
      const clean = val.toString().replace(",", ".");
      const res = parseFloat(clean);
      return isNaN(res) ? null : res;
    };

    const capacidadeKWp = parseNum(body.capacidadeKWp);
    const coefSujidade = parseNum(body.coefSujidade || "0.03");
    const coefTemperatura = parseNum(body.coefTemperatura || "-0.0035");
    const taxaDegradacao = parseNum(body.taxaDegradacao || "0.005");
    const lat = parseNullableNum(latitude);
    const lng = parseNullableNum(longitude);
    const inc = parseNullableNum(inclinacao) ?? 10;
    const modeIrr = modoIrradiancia || "ESTACAO";

    console.log("[DEBUG API] Tentando criar usina com dados:", {
      nome,
      capacidadeKWp,
      apiFornecedor,
      apiId,
      estacaoId,
      lat,
      lng,
      modeIrr
    });

    const usina = await prisma.usina.create({
      data: {
        nome,
        capacidadeKWp,
        apiFornecedor,
        apiId,
        apiKey,
        apiSecret: apiSecret === "Cordeiroapi123" || apiSecret.includes("...") ? "Cordeiroapi123" : apiSecret,
        coefSujidade,
        coefTemperatura,
        taxaDegradacao,
        estacaoId: estacaoId || null,
        latitude: lat,
        longitude: lng,
        modoIrradiancia: modeIrr,
        localizacao: localizacao || null,
        inclinacao: inc,
        orientacao: orientacao || "180"
      }
    });

    console.log("[DEBUG API] Usina criada com sucesso:", usina.id);
    return NextResponse.json(usina);
  } catch (error: any) {
    console.error("[CRITICAL API ERROR] Falha ao criar usina:", error);
    return NextResponse.json({ 
      error: error.message || "Erro interno ao cadastrar usina",
      details: error.code
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const data = await req.json();

    console.log("[DEBUG PUT] ID da usina para atualizar:", id);
    console.log("[DEBUG PUT] Corpo da requisição recebida:", data);

    if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === "") return 0;
      const clean = val.toString().replace(",", ".");
      return parseFloat(clean) || 0;
    };

    const parseNullableNum = (val: any) => {
      if (val === undefined || val === null || val === "") return null;
      const clean = val.toString().replace(",", ".");
      const res = parseFloat(clean);
      return isNaN(res) ? null : res;
    };

    const lat = parseNullableNum(data.latitude);
    const lng = parseNullableNum(data.longitude);
    const inc = parseNullableNum(data.inclinacao) ?? 10;
    const modeIrr = data.modoIrradiancia || "ESTACAO";

    const usina = await prisma.usina.update({
      where: { id },
      data: {
        nome: data.nome,
        capacidadeKWp: parseNum(data.capacidadeKWp),
        apiFornecedor: data.apiFornecedor,
        apiId: data.apiId,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        coefSujidade: parseNum(data.coefSujidade),
        coefTemperatura: parseNum(data.coefTemperatura),
        taxaDegradacao: parseNum(data.taxaDegradacao),
        estacaoId: data.estacaoId || null,
        latitude: lat,
        longitude: lng,
        modoIrradiancia: modeIrr,
        localizacao: data.localizacao || null,
        inclinacao: inc,
        orientacao: data.orientacao || "180"
      }
    });

    return NextResponse.json(usina);
  } catch (error: any) {
    console.error("Erro ao atualizar usina:", error);
    return NextResponse.json({ 
      error: `Falha ao atualizar usina: ${error.message || String(error)}` 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    console.log(`[DEBUG API] Tentando excluir usina ID: ${id}`);
    
    if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    const deleted = await prisma.usina.delete({ 
      where: { id } 
    });
    
    console.log(`[DEBUG API] Usina ${id} excluída com sucesso.`);
    return NextResponse.json({ success: true, deleted: deleted.id });
  } catch (error: any) {
    console.error("[CRITICAL API ERROR] Falha ao excluir usina:", error);
    return NextResponse.json({ 
      error: "Erro ao excluir usina no banco de dados",
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}

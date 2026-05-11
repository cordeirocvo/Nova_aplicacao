import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const usinaId = searchParams.get("usinaId");
    const id = searchParams.get("id");
    
    if (id) {
      const report = await prisma.relatorioTermografia.findUnique({
        where: { id },
        include: { 
          profissional: true,
          itens: true 
        },
      });
      return NextResponse.json(report);
    }

    if (!usinaId) return NextResponse.json({ error: "usinaId or id required" }, { status: 400 });

    const data = await prisma.relatorioTermografia.findMany({
      where: { usinaId },
      include: { 
        profissional: true,
        itens: true 
      },
      orderBy: { dataInspecao: "desc" },
    });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /termografia error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log("POST /termografia payload keys:", Object.keys(data));

    const reportDate = data.dataInspecao ? new Date(data.dataInspecao) : new Date();
    
    const relatorio = await prisma.relatorioTermografia.create({
      data: {
        usinaId: data.usinaId,
        profissionalId: data.profissionalId || null,
        dataInspecao: reportDate,
        equipamentoCamera: data.equipamentoCamera || "",
        temperaturaAmbiente: parseFloat(data.temperaturaAmbiente) || 0,
        irradiacao: parseFloat(data.irradiacao) || 0,
        velocidadeVento: parseFloat(data.velocidadeVento) || 0,
        umidadeRelativa: parseFloat(data.umidadeRelativa) || 0,
        emissividade: parseFloat(data.emissividade) || 0.95,
        distanciaRef: parseFloat(data.distanciaRef) || 1.0,
        itens: {
          create: (data.itens || []).map((item: any) => ({
            tipoEquipamento: item.tipoEquipamento,
            tag: item.tag,
            localizacao: item.localizacao,
            temperaturaMedida: parseFloat(item.temperaturaMedida) || 0,
            temperaturaReferencia: parseFloat(item.temperaturaReferencia) || 0,
            deltaT: parseFloat(item.deltaT) || 0,
            severidade: item.severidade,
            causaProvavel: item.causaProvavel,
            recomendacao: item.recomendacao,
            imagemTermicaUrl: item.imagemTermicaUrl,
            imagemVisualUrl: item.imagemVisualUrl,
          }))
        }
      },
      include: { itens: true }
    });
    
    return NextResponse.json(relatorio);
  } catch (error: any) {
    console.error("POST /termografia CRITICAL ERROR:", error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    console.log("PATCH /termografia id:", data.id);
    
    // Deleta itens antigos e recria (abordagem simples para atualização total)
    if (data.itens) {
      await prisma.itemTermografia.deleteMany({
        where: { relatorioId: data.id }
      });
    }

    const relatorio = await prisma.relatorioTermografia.update({
      where: { id: data.id },
      data: {
        profissionalId: data.profissionalId,
        dataInspecao: data.dataInspecao ? new Date(data.dataInspecao) : undefined,
        equipamentoCamera: data.equipamentoCamera,
        temperaturaAmbiente: data.temperaturaAmbiente !== undefined ? (parseFloat(data.temperaturaAmbiente) || 0) : undefined,
        irradiacao: data.irradiacao !== undefined ? (parseFloat(data.irradiacao) || 0) : undefined,
        velocidadeVento: data.velocidadeVento !== undefined ? (parseFloat(data.velocidadeVento) || 0) : undefined,
        umidadeRelativa: data.umidadeRelativa !== undefined ? (parseFloat(data.umidadeRelativa) || 0) : undefined,
        emissividade: data.emissividade !== undefined ? (parseFloat(data.emissividade) || 0.95) : undefined,
        distanciaRef: data.distanciaRef !== undefined ? (parseFloat(data.distanciaRef) || 1.0) : undefined,
        itens: data.itens ? {
          create: data.itens.map((item: any) => ({
            tipoEquipamento: item.tipoEquipamento,
            tag: item.tag,
            localizacao: item.localizacao,
            temperaturaMedida: parseFloat(item.temperaturaMedida) || 0,
            temperaturaReferencia: parseFloat(item.temperaturaReferencia) || 0,
            deltaT: parseFloat(item.deltaT) || 0,
            severidade: item.severidade,
            causaProvavel: item.causaProvavel,
            recomendacao: item.recomendacao,
            imagemTermicaUrl: item.imagemTermicaUrl,
            imagemVisualUrl: item.imagemVisualUrl,
          }))
        } : undefined
      }
    });
    
    return NextResponse.json(relatorio);
  } catch (error: any) {
    console.error("PATCH /termografia error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.relatorioTermografia.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /termografia error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

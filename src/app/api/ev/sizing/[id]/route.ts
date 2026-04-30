import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSizing } from "@/lib/ev/sizingEngine";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.projetoDimensionamento.findUnique({
      where: { id },
      include: { charger: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("GET_PROJECT_ERROR", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    
    // Buscar projeto e carregador para recalcular
    const existingProject = await prisma.projetoDimensionamento.findUnique({
      where: { id },
      include: { charger: true }
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    const charger = existingProject.charger;
    // @ts-ignore
    const hasTransformer = data.hasTransformer ?? existingProject.hasTransformer;
    
    console.log(`Updating project ${id}, hasTransformer: ${hasTransformer}`);
    const result = calculateSizing({
      powerkW: charger.power,
      voltage: hasTransformer ? (data.transformerSecondaryVoltage || 380) : charger.voltage,
      phases: charger.phases as 1 | 3,
      distance: hasTransformer ? (data.chargerDistance || data.distance || 10) : (data.distance || existingProject.distance),
      method: data.installationMethod || existingProject.installationMethod,
      hasTransformer,
      primaryVoltage: data.transformerPrimaryVoltage,
      primaryDistance: data.transformerDistance,
      groundingType: data.groundingType
    });

    const updated = await prisma.projetoDimensionamento.update({
      where: { id },
      data: {
        projectName: data.projectName,
        clientName: data.clientName,
        distance: hasTransformer ? (data.chargerDistance || data.distance || 10) : (data.distance || existingProject.distance),
        installationMethod: data.installationMethod,
        calculatedCurrent: result.current,
        calculatedCableGauge: result.cableGauge,
        calculatedBreaker: result.breaker,
        calculatedDR: result.idrType,
        // @ts-ignore
        calculatedIDR: result.idrType,
        calculatedDPS: result.dpsType,
        calculatedConduit: result.conduitSize,
        voltageDrop: result.voltageDrop,
        groundingAnalysis: result.groundingAnalysis,
        groundingType: data.groundingType,
        hasTransformer,
        transformerPrimaryVoltage: data.transformerPrimaryVoltage,
        transformerSecondaryVoltage: data.transformerSecondaryVoltage,
        transformerDistance: data.transformerDistance,
        chargerDistance: data.chargerDistance,
        calculatedPrimaryCable: result.primary?.cableGauge,
        calculatedPrimaryBreaker: result.primary?.breaker,
        analysisNotes: data.analysisNotes,
        existingLoadKW: data.existingLoadKW,
        simultaneityFactor: data.simultaneityFactor,
        isCollective: data.isCollective,
        location: data.location
      }
    });

    console.log("Project updated successfully:", updated.id);
    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("PUT_PROJECT_ERROR", error);
    return NextResponse.json({ error: "Erro ao atualizar projeto" }, { status: 500 });
  }
}

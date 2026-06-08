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
    const project = await prisma.eVProject.findUnique({
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
    const existingProject = await prisma.eVProject.findUnique({
      where: { id },
      include: { charger: true }
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    const charger = existingProject.charger;
    // @ts-ignore
    const hasTransformer = data.hasTransformer !== undefined ? Boolean(data.hasTransformer) : existingProject.hasTransformer;
    const safeCosPhi = data.cosPhi !== undefined ? Number(data.cosPhi) : (existingProject.cosPhi || 1.0);
    
    console.log(`Updating project ${id}, hasTransformer: ${hasTransformer}, cosPhi: ${safeCosPhi}`);
    const result = calculateSizing({
      powerkW: charger.power,
      voltage: hasTransformer ? (Number(data.transformerSecondaryVoltage) || 380) : charger.voltage,
      phases: charger.phases as 1 | 3,
      distance: hasTransformer ? (Number(data.chargerDistance) || Number(data.distance) || 10) : (Number(data.distance) || existingProject.distance),
      method: data.installationMethod || existingProject.installationMethod,
      cosPhi: safeCosPhi,
      hasTransformer,
      primaryVoltage: data.transformerPrimaryVoltage !== undefined ? Number(data.transformerPrimaryVoltage) : undefined,
      primaryDistance: data.transformerDistance !== undefined ? Number(data.transformerDistance) : undefined,
      groundingType: data.groundingType || undefined,
      chargerDistance: data.chargerDistance !== undefined ? Number(data.chargerDistance) : undefined,
      demandControlEnabled: data.demandControlEnabled !== undefined ? Boolean(data.demandControlEnabled) : (existingProject.demandControlEnabled ?? undefined),
      demandControlLimit: data.demandControlLimit !== undefined ? Number(data.demandControlLimit) : (existingProject.demandControlLimit ?? undefined),
      existingLoadKW: data.existingLoadKW !== undefined ? Number(data.existingLoadKW) : (existingProject.existingLoadKW ?? undefined),
      simultaneityFactor: data.simultaneityFactor !== undefined ? Number(data.simultaneityFactor) : (existingProject.simultaneityFactor ?? undefined)
    });

    const updated = await prisma.eVProject.update({
      where: { id },
      data: {
        projectName: data.projectName,
        clientName: data.clientName,
        clientDocument: data.clientDocument,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        clientAddress: data.clientAddress,
        projectDescription: data.projectDescription,
        utility: data.utility || existingProject.utility,
        distance: hasTransformer ? (Number(data.chargerDistance) || Number(data.distance) || 10) : (Number(data.distance) || existingProject.distance),
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
        transformerPrimaryVoltage: data.transformerPrimaryVoltage !== undefined ? Number(data.transformerPrimaryVoltage) : null,
        transformerSecondaryVoltage: data.transformerSecondaryVoltage !== undefined ? Number(data.transformerSecondaryVoltage) : null,
        transformerDistance: data.transformerDistance !== undefined ? Number(data.transformerDistance) : null,
        chargerDistance: data.chargerDistance !== undefined ? Number(data.chargerDistance) : null,
        calculatedPrimaryCable: result.primary?.cableGauge,
        calculatedPrimaryBreaker: result.primary?.breaker,
        analysisNotes: data.analysisNotes || existingProject.analysisNotes,
        existingLoadKW: data.existingLoadKW !== undefined ? Number(data.existingLoadKW) : null,
        simultaneityFactor: data.simultaneityFactor !== undefined ? Number(data.simultaneityFactor) : null,
        isCollective: data.isCollective !== undefined ? Boolean(data.isCollective) : existingProject.isCollective,
        location: data.location,
        cosPhi: safeCosPhi,
        existingEntrancePhases: data.existingEntrancePhases !== undefined ? Math.round(Number(data.existingEntrancePhases)) : existingProject.existingEntrancePhases,
        existingEntranceBreaker: data.existingEntranceBreaker !== undefined ? Number(data.existingEntranceBreaker) : existingProject.existingEntranceBreaker,
        existingEntranceCable: data.existingEntranceCable !== undefined ? Number(data.existingEntranceCable) : existingProject.existingEntranceCable,
        existingEntranceCategory: data.existingEntranceCategory !== undefined ? data.existingEntranceCategory : existingProject.existingEntranceCategory,
        demandControlEnabled: data.demandControlEnabled !== undefined ? Boolean(data.demandControlEnabled) : existingProject.demandControlEnabled,
        demandControlLimit: data.demandControlLimit !== undefined ? Number(data.demandControlLimit) : existingProject.demandControlLimit,
        
        // Novos campos de segurança
        fireExtinguisherType: data.fireExtinguisherType || result.fireExtinguisher,
        hasEmergencyButton5m: data.hasEmergencyButton5m !== undefined ? Boolean(data.hasEmergencyButton5m) : existingProject.hasEmergencyButton5m,
        requiresWarningSigns: data.requiresWarningSigns !== undefined ? Boolean(data.requiresWarningSigns) : existingProject.requiresWarningSigns,
        fireDeptStandards: data.fireDeptStandards || "IT 41/2023 - CBMG",
        abntStandards: data.abntStandards || result.applicableStandards.join(", "),
        specificSafetyNotes: data.specificSafetyNotes || "Instalação exige sinalização visual e botão de emergência externo a 5 metros conforme norma de Bombeiros."
      }
    });

    console.log("Project updated successfully:", updated.id);
    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("PUT_PROJECT_ERROR", error);
    return NextResponse.json({ error: "Erro ao atualizar projeto" }, { status: 500 });
  }
}

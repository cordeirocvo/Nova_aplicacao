import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: "default" }
    });

    if (!settings) {
       settings = await prisma.systemSettings.create({
          data: { id: "default", limiteVerde: 40, limiteAmarelo: 20, limiteParecer: 30 }
       });
    }

    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar config" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
     const body = await req.json();
     
     const updated = await prisma.systemSettings.update({
       where: { id: "default" },
       data: { 
         limiteVerde: Number(body.limiteVerde),
         limiteAmarelo: Number(body.limiteAmarelo),
         limiteParecer: Number(body.limiteParecer)
       }
     });
     
     return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
     return NextResponse.json({ success: false, error: "Falha na atualização de config" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.statusOption.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
   try {
     const { id } = await params;
     const { name } = await req.json();
     if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

     const updated = await prisma.statusOption.update({ 
         where: { id },
         data: { name }
     });
     
     return NextResponse.json(updated);
   } catch (error) {
     return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
   }
 }

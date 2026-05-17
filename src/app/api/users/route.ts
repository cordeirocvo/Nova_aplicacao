import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions as any);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        canAccessBudgets: true,
        canEditBudgets: true,
        canAccessAppLeads: true,
        canManageCRM: true,
        canAccessSIE: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error?.message 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, name, password, role, canAccessBudgets, canEditBudgets, canAccessAppLeads, canManageCRM, canAccessSIE } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password, // Em produção, usar hash! Mas aqui segue o padrão da app.
        role,
        canAccessBudgets: !!canAccessBudgets,
        canEditBudgets: !!canEditBudgets,
        canAccessAppLeads: !!canAccessAppLeads,
        canManageCRM: !!canManageCRM,
        canAccessSIE: !!canAccessSIE,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

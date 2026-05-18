import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { email, name, password, role, allowedRoutes } = await req.json();

    const routesArray = Array.isArray(allowedRoutes) ? allowedRoutes : [];

    // Sync legacy permission flags:
    const canAccessBudgets = routesArray.includes('/orcamentos');
    const canEditBudgets = routesArray.includes('canEditBudgets');
    const canAccessAppLeads = routesArray.includes('/app-vendedor');
    const canManageCRM = routesArray.includes('/crm');
    const canAccessSIE = routesArray.includes('/engenharia/solar/monitoramento');

    const data: any = { 
      email, 
      name, 
      role,
      canAccessBudgets,
      canEditBudgets,
      canAccessAppLeads,
      canManageCRM,
      canAccessSIE,
      allowedRoutes: routesArray,
    };
    
    if (password && password.trim() !== "") {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions as any);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    // Prevent self-deletion
    if (id === session.user.id) {
       return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    // 1. Delete associated leads first to satisfy foreign key constraints (cascade)
    await prisma.lead.deleteMany({
      where: { vendedorId: id },
    });

    // 2. Delete the user
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error?.message || "Failed to delete user" 
    }, { status: 500 });
  }
}

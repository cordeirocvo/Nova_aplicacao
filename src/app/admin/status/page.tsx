import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import StatusManager from "./StatusManager";

export const dynamic = "force-dynamic";

export default async function StatusAdminPage() {
  const session: any = await getServerSession(authOptions as any);
  
  if (session?.user?.role !== "ADMIN") {
    return notFound();
  }

  const statuses = await prisma.statusOption.findMany({
    orderBy: { createdAt: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1E3A8A] to-[#00BFA5]">
          Gestão de Status
        </h1>
        <p className="text-slate-500">Adicione, edite ou remova as opções de status da sua planilha.</p>
      </div>
      
      <StatusManager initialStatuses={statuses} />
    </div>
  );
}

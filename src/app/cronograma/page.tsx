import { prisma } from "@/lib/prisma";
import CronogramaClient from "./CronogramaClient";

export const metadata = {
  title: "Cronograma Semanal | Cordeiro Energia",
};

export const dynamic = "force-dynamic";

export default async function CronogramaPage() {
  // Buscar todas as atividades de instalação que não estão concluídas
  const atividades = await prisma.planilhaInstalacao.findMany({
    where: {
      NOT: {
        status: { contains: "Conclu", mode: "insensitive" }
      }
    }
  });

  // Buscar todas as manutenções que não estão concluídas
  const manutencoes = await prisma.manutencaoUsina.findMany({
    where: {
      NOT: {
        status: "Concluida"
      }
    },
    include: {
      usina: true,
      equipamento: true
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
          Cronograma Geral de Atividades
        </h1>
        <p className="text-sm text-slate-500 font-medium italic">
          Visão consolidada de Instalações, Pareceres e Manutenções O&M
        </p>
      </div>

      <CronogramaClient 
        atividades={JSON.parse(JSON.stringify(atividades))} 
        manutencoes={JSON.parse(JSON.stringify(manutencoes))} 
      />
    </div>
  );
}

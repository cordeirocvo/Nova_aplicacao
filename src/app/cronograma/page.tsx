import { prisma } from "@/lib/prisma";
import CronogramaClient from "./CronogramaClient";

export const metadata = {
  title: "Calendário de Atividades | Cordeiro Energia",
};

export const dynamic = "force-dynamic";

export default async function CronogramaPage() {
  // Buscar todas as atividades de instalação e manutenções O&M sequencialmente para evitar concorrência no pooler
  const atividades = await prisma.planilhaInstalacao.findMany();
  const manutencoes = await prisma.manutencaoUsina.findMany({
    include: {
      usina: true,
      equipamento: true
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
          Calendário de Atividades
        </h1>
        <p className="text-sm text-slate-500 font-medium italic">
          Instalações, Pareceres e Manutenções O&amp;M — arraste para reagendar, duplo clique para gerar OS
        </p>
      </div>

      <CronogramaClient 
        atividades={JSON.parse(JSON.stringify(atividades))} 
        manutencoes={JSON.parse(JSON.stringify(manutencoes))} 
      />
    </div>
  );
}

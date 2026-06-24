import { prisma } from "@/lib/prisma";
import CronogramaClient from "./CronogramaClient";

export const metadata = {
  title: "Calendário de Atividades | Cordeiro Energia",
};

export const dynamic = "force-dynamic";

export default async function CronogramaPage() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Buscar atividades e manutenções em paralelo, filtrando históricos concluídos antigos para performance
  const [atividades, manutencoes] = await Promise.all([
    prisma.planilhaInstalacao.findMany({
      where: {
        OR: [
          { status: { notIn: ["Concluído", "Finalizado", "Executado"] } },
          { createdAt: { gte: sixMonthsAgo } }
        ]
      },
      select: {
        id: true,
        instalacao: true,
        automaticoPrevInstala: true,
        dataPrevista: true,
        vencimentoParecer: true,
        prioridade: true,
        atividadeExtra: true,
        status: true,
        cidade: true,
        cidadeSheet: true,
        inversor: true,
        numMod: true,
        modulo: true,
        obsInstalacao: true,
        observacao: true,
        vendedor: true,
        telefoneCliente: true,
        anexoFotos: true,
        anexoArquivos: true,
      }
    }),
    prisma.manutencaoUsina.findMany({
      where: {
        OR: [
          { status: { notIn: ["Concluído", "Finalizado"] } },
          { dataAgendada: { gte: sixMonthsAgo } }
        ]
      },
      select: {
        id: true,
        usinaId: true,
        tipo: true,
        dataAgendada: true,
        descricao: true,
        responsavel: true,
        status: true,
        usina: {
          select: {
            nome: true,
            localizacao: true
          }
        }
      }
    })
  ]);

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

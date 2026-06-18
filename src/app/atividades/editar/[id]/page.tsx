import { prisma } from "@/lib/prisma";
import EditForm from "./EditForm";
import { notFound } from "next/navigation";

export default async function EditarAtividadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [atividade, statuses] = await Promise.all([
    prisma.planilhaInstalacao.findUnique({
      where: { id },
    }),
    prisma.statusOption.findMany({
      orderBy: { name: 'asc' }
    })
  ]);

  if (!atividade) {
    return notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <EditForm initialData={atividade} statuses={statuses} />
    </div>
  );
}

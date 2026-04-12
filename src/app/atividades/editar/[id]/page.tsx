import { prisma } from "@/lib/prisma";
import EditForm from "./EditForm";
import { notFound } from "next/navigation";

export default async function EditarAtividadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const atividade = await prisma.planilhaInstalacao.findUnique({
    where: { id },
  });

  if (!atividade) {
    return notFound();
  }

  const statuses = await prisma.statusOption.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="container mx-auto py-8">
      <EditForm initialData={atividade} statuses={statuses} />
    </div>
  );
}

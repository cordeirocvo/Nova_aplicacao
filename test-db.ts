import { prisma } from "./src/lib/prisma";

async function run() {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        vendedor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    console.log("Retrieved", leads.length, "leads");
    
    // Simulate frontend filter:
    const filter = "";
    const filtered = leads.filter(l => {
      const query = filter.toLowerCase();
      const vendedorNome = l.vendedor?.name || "";
      return (
        l.nome.toLowerCase().includes(query) ||
        (l.endereco && l.endereco.toLowerCase().includes(query)) ||
        l.telefone.includes(query) ||
        vendedorNome.toLowerCase().includes(query)
      );
    });
    
    console.log("Filtered leads count with empty query:", filtered.length);
  } catch (error: any) {
    console.error("Filter logic crashed:", error);
  }
}

run();

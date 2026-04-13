import { redirect } from "next/navigation";

export default function Home() {
  // Redireciona usuários da tela inicial vazia diretamente para o portal de login
  redirect("/login");
  
  return null;
}

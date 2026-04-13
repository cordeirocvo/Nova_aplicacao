import { execSync } from "child_process";

const run = (cmd) => {
  try {
    console.log(`\n⏳ Executando: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
  } catch (error) {
    console.error(`\n❌ Falha ao executar: ${cmd}`);
    process.exit(1);
  }
};

const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const commitMessage = process.argv[2] || `Deploy automático - ${date}`;

console.log("🚀 Iniciando envio automático para GitHub e Vercel...");

run("git add .");
run(`git commit -m "${commitMessage}"`);
run("git push origin main");

console.log("\n✅ Tudo certo! O código foi enviado para o GitHub.");
console.log("✨ A Vercel já deve estar recebendo esta atualização automaticamente.");

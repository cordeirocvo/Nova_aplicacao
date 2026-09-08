import { execSync } from "child_process";

const run = (cmd, ignoreError = false) => {
  try {
    console.log(`\n⏳ Executando: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (error) {
    if (ignoreError) {
      console.warn(`\n⚠️ Aviso ao executar: ${cmd}`);
      return false;
    }
    console.error(`\n❌ Falha ao executar: ${cmd}`);
    process.exit(1);
  }
};

const date = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const commitMessage = process.argv[2] || `Deploy automático - ${date}`;

console.log("🚀 Iniciando envio automático para GitHub e Vercel...");

run("git add .");

// Tenta fazer commit apenas se houver alterações
const hasChanges = execSync("git status --porcelain").toString().trim().length > 0;
if (hasChanges) {
  run(`git commit -m "${commitMessage}"`);
} else {
  console.log("ℹ️ Nenhuma alteração pendente para commit no Git.");
}

run("git push origin main");

console.log("\n📦 Disparando deploy na Vercel via CLI...");
const vercelOk = run("npx vercel --prod --yes", true);

if (!vercelOk) {
  console.log("\n💡 Dica: Se a Vercel estiver conectada ao GitHub, o deploy já foi iniciado automaticamente pelo git push.");
  console.log("   Para autorizar o Vercel CLI no terminal local, execute: npx vercel login");
} else {
  console.log("\n✅ Tudo certo! O código foi enviado para o GitHub e implantado na Vercel com sucesso! 🚀");
}


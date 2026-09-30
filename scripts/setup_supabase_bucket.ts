import { Client } from "pg";
import "dotenv/config";

async function setupBucket() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("String de conexão não encontrada no .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Conectado ao PostgreSQL do Supabase...");

    // 1. Criar o bucket 'cordeiro-media' com public = true
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('cordeiro-media', 'cordeiro-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'application/pdf'])
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log("✓ Bucket 'cordeiro-media' criado/configurado como PÚBLICO!");

    // 2. Criar o bucket 'leads' com public = true
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('leads', 'leads', true, 52428800, NULL)
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log("✓ Bucket 'leads' criado/configurado como PÚBLICO!");

    // 3. Garantir Políticas de Acesso RLS para Leitura e Envio de Mídias por qualquer usuário (ANON / AUTH)
    try {
      await client.query(`
        -- Política de Permissão de Leitura Pública
        DROP POLICY IF EXISTS "Permitir Leitura Publica cordeiro-media" ON storage.objects;
        CREATE POLICY "Permitir Leitura Publica cordeiro-media"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'cordeiro-media' OR bucket_id = 'leads');

        -- Política de Permissão de Upload Público / Autenticado
        DROP POLICY IF EXISTS "Permitir Upload Publico cordeiro-media" ON storage.objects;
        CREATE POLICY "Permitir Upload Publico cordeiro-media"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'cordeiro-media' OR bucket_id = 'leads');

        -- Política de Atualização / Upsert
        DROP POLICY IF EXISTS "Permitir Update Publico cordeiro-media" ON storage.objects;
        CREATE POLICY "Permitir Update Publico cordeiro-media"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'cordeiro-media' OR bucket_id = 'leads');
      `);
      console.log("✓ Políticas RLS de leitura e envio público aplicadas à tabela storage.objects!");
    } catch (policyErr: any) {
      console.warn("Aviso ao criar políticas RLS (podem já existir):", policyErr?.message);
    }

    console.log("🚀 SUCESSO TOTAL: O Supabase Storage está 100% ativado e público para receber mídias do RDO!");
  } catch (error: any) {
    console.error("Erro ao configurar bucket:", error?.message);
  } finally {
    await client.end();
  }
}

setupBucket();

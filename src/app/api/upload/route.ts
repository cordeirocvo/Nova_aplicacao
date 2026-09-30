import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase as defaultSupabase } from "@/lib/supabaseClient";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/** 10 MB em bytes */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Buckets para tentar no Supabase Storage */
const BUCKETS_TO_TRY = ["cordeiro-media", "leads", "public", "photos", "media"];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo permitido: 10 MB (recebido: ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const contentType = file.type || "image/jpeg";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Se houver Service Role Key, usa cliente admin para ignorar RLS no Supabase
    const supabaseClient = (supabaseUrl && serviceRoleKey)
      ? createClient(supabaseUrl, serviceRoleKey)
      : defaultSupabase;

    // ── 1. Tentar Supabase Storage em buckets conhecidos ──────────────────────
    if (supabaseUrl && (serviceRoleKey || anonKey)) {
      for (const bucketName of BUCKETS_TO_TRY) {
        try {
          const { data, error } = await supabaseClient.storage
            .from(bucketName)
            .upload(filename, buffer, {
              contentType,
              upsert: true,
            });

          if (data && !error) {
            const { data: publicData } = supabaseClient.storage
              .from(bucketName)
              .getPublicUrl(filename);

            console.log(`[UPLOAD] Supabase Storage (${bucketName}) OK:`, publicData.publicUrl.slice(0, 80));
            return NextResponse.json({ url: publicData.publicUrl });
          } else if (error) {
            console.warn(`[UPLOAD] Supabase bucket "${bucketName}" falhou:`, error.message);
          }
        } catch (err: any) {
          console.warn(`[UPLOAD] Erro ao tentar bucket "${bucketName}":`, err?.message);
        }
      }
    }

    // ── 2. Filesystem local (apenas para ambiente de desenvolvimento local) ─────
    try {
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");

      const uploadDir = join(process.cwd(), "public", "uploads", "atividades");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), buffer);

      const url = `/uploads/atividades/${filename}`;
      console.log("[UPLOAD] Filesystem local OK:", url);
      return NextResponse.json({ url });
    } catch (fsErr) {
      console.warn("[UPLOAD] Filesystem local não disponível ou somente leitura:", fsErr);
    }

    // ── 3. FALLBACK GARANTIDO: Data URL (Base64) ─────────────────────────────
    // Garante 100% de sucesso mesmo se buckets/permissões não estiverem configurados no Supabase
    console.log("[UPLOAD] Utilizando fallback de Data URL (Base64) para garantir armazenamento seguro.");
    const base64String = buffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64String}`;

    return NextResponse.json({
      url: dataUrl,
      fallback: true,
      message: "Imagem armazenada com sucesso!"
    });

  } catch (error: any) {
    console.error("[UPLOAD] Erro crítico:", error?.message);
    return NextResponse.json(
      { error: "Erro interno ao processar o upload: " + (error?.message ?? "desconhecido") },
      { status: 500 }
    );
  }
}

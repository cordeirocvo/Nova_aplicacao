import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/** 10 MB em bytes */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Bucket universal para mídias da Cordeiro */
const SUPABASE_BUCKET = "cordeiro-media";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Limite de tamanho — rejeita antes de carregar em memória
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

    // ── 1. Supabase Storage (bucket "cordeiro-media") ────────────────────────
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { data, error } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(filename, buffer, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });

        if (data && !error) {
          const { data: publicData } = supabase.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(filename);

          console.log("[UPLOAD] Supabase OK:", publicData.publicUrl.slice(0, 80));
          return NextResponse.json({ url: publicData.publicUrl });
        }

        if (error) {
          console.warn(`[UPLOAD] Supabase bucket "${SUPABASE_BUCKET}" erro:`, error.message);
          // Tenta bucket legado "leads" como fallback de bucket
          const { data: dataLegacy, error: errLegacy } = await supabase.storage
            .from("leads")
            .upload(filename, buffer, {
              contentType: file.type || "image/jpeg",
              upsert: false,
            });

          if (dataLegacy && !errLegacy) {
            const { data: pub } = supabase.storage.from("leads").getPublicUrl(filename);
            console.log("[UPLOAD] Supabase fallback bucket 'leads' OK");
            return NextResponse.json({ url: pub.publicUrl });
          }
          console.warn("[UPLOAD] Supabase bucket 'leads' também falhou:", errLegacy?.message);
        }
      } catch (supabaseErr) {
        console.warn("[UPLOAD] Supabase exception:", supabaseErr);
      }
    }

    // ── 2. Filesystem local (apenas desenvolvimento) ─────────────────────────
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
      console.warn("[UPLOAD] Filesystem local falhou (esperado em produção):", fsErr);
    }

    // ── 3. ERRO EXPLÍCITO — NÃO retornar base64 silenciosamente ─────────────
    console.error("[UPLOAD] Todos os métodos de upload falharam. Configure o bucket Supabase.");
    return NextResponse.json(
      {
        error:
          "Não foi possível armazenar o arquivo. Configure o bucket 'cordeiro-media' no Supabase com acesso público.",
      },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("[UPLOAD] Erro crítico:", error?.message);
    return NextResponse.json(
      { error: "Erro interno ao processar o upload: " + (error?.message ?? "desconhecido") },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extension = file.name.split(".").pop() || "jpg";
    const filename = `${crypto.randomUUID()}.${extension}`;

    // 1. Tenta fazer upload para o Supabase Storage (bucket "leads")
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const { data, error } = await supabase.storage
          .from("leads")
          .upload(filename, buffer, {
            contentType: file.type || "image/jpeg"
          });

        if (data) {
          const { data: publicData } = supabase.storage.from("leads").getPublicUrl(filename);
          return NextResponse.json({ url: publicData.publicUrl });
        }
        if (error) {
          console.warn("Supabase Storage error (bucket leads might not exist):", error.message);
        }
      }
    } catch (supabaseError) {
      console.warn("Falha no upload do Supabase, tentando fallback local:", supabaseError);
    }

    // 2. Fallback local (útil para desenvolvimento local)
    try {
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      
      const uploadDir = join(process.cwd(), "public", "uploads", "leads");
      
      // Garante a existência do diretório
      await mkdir(uploadDir, { recursive: true });
      
      const localPath = join(uploadDir, filename);
      await writeFile(localPath, buffer);
      
      const url = `/uploads/leads/${filename}`;
      return NextResponse.json({ url });
    } catch (fsError) {
      // 3. Fallback absoluto para base64 Data URL (para ambientes serverless read-only como Vercel)
      console.warn("Falha no filesystem local. Retornando Data URL base64:", fsError);
      const base64 = buffer.toString("base64");
      const url = `data:${file.type || "image/jpeg"};base64,${base64}`;
      return NextResponse.json({ url });
    }
  } catch (error) {
    console.error("Erro crítico no upload:", error);
    return NextResponse.json({ error: "Erro ao processar upload" }, { status: 500 });
  }
}

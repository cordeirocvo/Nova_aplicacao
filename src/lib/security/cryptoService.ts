import crypto from "crypto";

/**
 * Serviço de Criptografia em Repouso AES-256-GCM
 * Garante que segredos de API (chaves, senhas, tokens) sejam armazenados
 * de forma criptografada no banco de dados com autenticação de integridade (Auth Tag).
 */
export class CryptoService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly IV_LENGTH = 12; // 96 bits recomendado para GCM
  private static readonly PREFIX = "enc:v1:";

  /**
   * Obtém a chave mestra de 32 bytes derivada via SHA-256
   */
  private static getMasterKey(): Buffer {
    const rawKey =
      process.env.ENCRYPTION_KEY ||
      process.env.NEXTAUTH_SECRET ||
      "cordeiro-energia-telemetry-master-secret-key-2026-production-salt";
    return crypto.createHash("sha256").update(rawKey).digest();
  }

  /**
   * Criptografa uma string em texto plano usando AES-256-GCM.
   * Se a string já estiver criptografada (prefixo enc:v1:), ela não é re-criptografada (idempotente).
   */
  static encrypt(plainText?: string | null): string {
    if (!plainText || typeof plainText !== "string") {
      return plainText || "";
    }

    const trimmed = plainText.trim();
    if (!trimmed) return "";

    // Se já estiver criptografado ou for valor mascarado visual, mantém
    if (this.isEncrypted(trimmed) || trimmed === "********" || trimmed.includes("...")) {
      return trimmed;
    }

    try {
      const key = this.getMasterKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      const encrypted = Buffer.concat([
        cipher.update(trimmed, "utf8"),
        cipher.final(),
      ]);

      const tag = cipher.getAuthTag();

      // Formato: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
      return `${this.PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
    } catch (error) {
      console.error("[CryptoService] Erro ao criptografar segredo:", error);
      return trimmed;
    }
  }

  /**
   * Descriptografa uma string gravada em AES-256-GCM.
   * Caso o valor não tenha o prefixo enc:v1: (legado em texto puro), ele é retornado diretamente.
   */
  static decrypt(cipherTextOrPlain?: string | null): string {
    if (!cipherTextOrPlain || typeof cipherTextOrPlain !== "string") {
      return cipherTextOrPlain || "";
    }

    const trimmed = cipherTextOrPlain.trim();
    if (!trimmed) return "";

    // Retrocompatibilidade: se não estiver no formato criptografado, é texto plano legado
    if (!this.isEncrypted(trimmed)) {
      return trimmed;
    }

    try {
      const parts = trimmed.split(":");
      // [ "enc", "v1", ivHex, tagHex, cipherHex ]
      if (parts.length !== 5) {
        console.warn("[CryptoService] Formato criptográfico inválido:", trimmed);
        return trimmed;
      }

      const iv = Buffer.from(parts[2], "hex");
      const tag = Buffer.from(parts[3], "hex");
      const cipherData = Buffer.from(parts[4], "hex");

      const key = this.getMasterKey();
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(cipherData),
        decipher.final(),
      ]);

      return decrypted.toString("utf8");
    } catch (error) {
      console.error("[CryptoService] Falha de autenticidade ao descriptografar segredo:", error);
      return "";
    }
  }

  /**
   * Verifica se a string já está cifrada no formato do CryptoService
   */
  static isEncrypted(val?: string | null): boolean {
    return typeof val === "string" && val.startsWith(this.PREFIX);
  }

  /**
   * Mascara um segredo para exibição segura na interface (evita vazamento em telas/logs)
   */
  static maskSecret(val?: string | null): string {
    if (!val || typeof val !== "string" || val.trim() === "") {
      return "";
    }
    return "********";
  }
}

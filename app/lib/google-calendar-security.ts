import "server-only";
import crypto from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";

export async function verificarAdministrador() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  const adminId = process.env.ADMIN_USER_ID;

  if (
    error ||
    !data.user ||
    !adminId ||
    data.user.id !== adminId
  ) {
    return false;
  }

  return true;
}

export function obtenerSupabasePrivado() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Falta la configuración privada de Supabase.");
  }

  return createAdminClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function obtenerClave() {
  const valor = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;

  if (!valor || !/^[a-fA-F0-9]{64}$/.test(valor)) {
    throw new Error("Clave de cifrado no válida.");
  }

  return Buffer.from(valor, "hex");
}

export function cifrarToken(token: string) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    obtenerClave(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
}

export function descifrarToken(valor: string) {
  const partes = valor.split(".");

  if (partes.length !== 3) {
    throw new Error("Token cifrado no válido.");
  }

  const [iv, tag, encrypted] = partes;

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    obtenerClave(),
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(tag, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { createUserSession, destroyUserSession } from "@/server/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    redirect("/login?error=formato");
  }

  const user = await db.user.findUnique({
    where: {
      email: parsed.data.email,
    },
  });

  if (!user) {
    redirect("/login?error=credenciais");
  }

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!isValid) {
    redirect("/login?error=credenciais");
  }

  await createUserSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroyUserSession();
  redirect("/login");
}

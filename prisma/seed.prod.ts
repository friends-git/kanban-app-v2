import { GlobalRole, PrismaClient } from "@prisma/client";
import { PLATFORM_RESET_PASSWORD } from "../src/lib/auth";
import { hashPassword } from "../src/server/auth/password";

const prisma = new PrismaClient();

function getBootstrapAdminConfig() {
  const name = process.env.PROD_BOOTSTRAP_ADMIN_NAME?.trim();
  const email = process.env.PROD_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const title =
    process.env.PROD_BOOTSTRAP_ADMIN_TITLE?.trim() || "Admin do workspace";
  const password =
    process.env.PROD_BOOTSTRAP_ADMIN_PASSWORD?.trim() || PLATFORM_RESET_PASSWORD;

  if (!name || !email) {
    return null;
  }

  return {
    name,
    email,
    title,
    password,
  };
}

export async function main() {
  const bootstrapAdmin = getBootstrapAdminConfig();

  if (!bootstrapAdmin) {
    console.log(
      "Seed de produção executada sem bootstrap operacional. Banco mantido limpo.",
    );
    await prisma.$disconnect();
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: bootstrapAdmin.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        name: bootstrapAdmin.name,
        role: GlobalRole.ADMIN,
        title: bootstrapAdmin.title,
        active: true,
      },
    });

    console.log(
      `Admin bootstrap já existia e foi mantido com o e-mail ${bootstrapAdmin.email}.`,
    );
    await prisma.$disconnect();
    return;
  }

  await prisma.user.create({
    data: {
      name: bootstrapAdmin.name,
      email: bootstrapAdmin.email,
      passwordHash: await hashPassword(bootstrapAdmin.password),
      role: GlobalRole.ADMIN,
      title: bootstrapAdmin.title,
      active: true,
    },
  });

  console.log(`Admin bootstrap criado: ${bootstrapAdmin.email}`);
  console.log(
    "Se a senha padrão estiver em uso, o primeiro login exigirá troca imediata.",
  );

  await prisma.$disconnect();
}

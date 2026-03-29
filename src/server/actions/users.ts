"use server";

import { GlobalRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MIN_PASSWORD_LENGTH, PLATFORM_RESET_PASSWORD } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { canAccessAdmin } from "@/server/permissions";

const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      ),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .superRefine((input, context) => {
    if (input.newPassword !== input.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "A confirmação precisa ser igual à nova senha.",
      });
    }
  });

const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(GlobalRole),
});

const resetUserPasswordSchema = z.object({
  userId: z.string().min(1),
});

const deleteUserSchema = z.object({
  userId: z.string().min(1),
});

const createUserSchema = z.object({
  firstName: z.string().trim().min(2, "Informe o nome."),
  lastName: z.string().trim().min(2, "Informe o sobrenome."),
  role: z.nativeEnum(GlobalRole),
});

const completeDefaultPasswordChangeSchema = z
  .object({
    newPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      ),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .superRefine((input, context) => {
    if (input.newPassword !== input.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "A confirmação precisa ser igual à nova senha.",
      });
    }
  });

type UserActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

type CreateUserActionResult =
  | { ok: true; message: string; userId: string; email: string }
  | { ok: false; error: string };

function slugifyUserSegment(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .replace(/\.{2,}/g, ".") || "usuario"
  );
}

async function createUniquePlatformEmail(firstName: string, lastName: string) {
  const localBase = `${slugifyUserSegment(firstName)}.${slugifyUserSegment(lastName)}`;
  const domain = "rolezito.com";
  const baseEmail = `${localBase}@${domain}`;
  const existingUsers = await db.user.findMany({
    where: {
      email: {
        startsWith: localBase,
      },
    },
    select: {
      email: true,
    },
  });

  if (!existingUsers.some((user) => user.email === baseEmail)) {
    return baseEmail;
  }

  const occupiedEmails = new Set(existingUsers.map((user) => user.email));
  let suffix = 2;

  while (occupiedEmails.has(`${localBase}.${suffix}@${domain}`)) {
    suffix += 1;
  }

  return `${localBase}.${suffix}@${domain}`;
}

function getDefaultTitleForRole(role: GlobalRole) {
  return {
    ADMIN: "Admin do workspace",
    MEMBER: "Membro do grupo",
    COLLABORATOR: "Colaborador",
    ADVISOR: "Orientadora",
  }[role];
}

function revalidateUserViews() {
  revalidatePath("/profile");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function changeOwnPasswordAction(
  input: z.input<typeof changeOwnPasswordSchema>,
): Promise<UserActionResult> {
  const user = await requireUser();
  const parsed = changeOwnPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para atualizar a senha.",
    };
  }

  const currentUser = await db.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!currentUser) {
    return {
      ok: false,
      error: "Usuário não encontrado.",
    };
  }

  const currentPasswordMatches = await verifyPassword(
    parsed.data.currentPassword,
    currentUser.passwordHash,
  );

  if (!currentPasswordMatches) {
    return {
      ok: false,
      error: "A senha atual informada não confere.",
    };
  }

  const sameAsCurrent = await verifyPassword(
    parsed.data.newPassword,
    currentUser.passwordHash,
  );

  if (sameAsCurrent) {
    return {
      ok: false,
      error: "Escolha uma nova senha diferente da atual.",
    };
  }

  await db.user.update({
    where: {
      id: currentUser.id,
    },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
    },
  });

  revalidateUserViews();

  return {
    ok: true,
    message: "Senha atualizada com sucesso.",
  };
}

export async function completeDefaultPasswordChangeAction(
  input: z.input<typeof completeDefaultPasswordChangeSchema>,
): Promise<UserActionResult> {
  const user = await requireUser();
  const parsed = completeDefaultPasswordChangeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Dados inválidos para definir a nova senha.",
    };
  }

  const currentUser = await db.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!currentUser) {
    return {
      ok: false,
      error: "Usuário não encontrado.",
    };
  }

  const usesDefaultPassword = await verifyPassword(
    PLATFORM_RESET_PASSWORD,
    currentUser.passwordHash,
  );

  if (!usesDefaultPassword) {
    return {
      ok: false,
      error: "Sua senha já foi atualizada. Atualize a página para continuar.",
    };
  }

  if (parsed.data.newPassword === PLATFORM_RESET_PASSWORD) {
    return {
      ok: false,
      error: "Escolha uma senha diferente da senha temporária.",
    };
  }

  await db.user.update({
    where: {
      id: currentUser.id,
    },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
    },
  });

  revalidateUserViews();

  return {
    ok: true,
    message: "Senha definida com sucesso. Seu acesso já está liberado.",
  };
}

export async function updateUserRoleAction(
  input: z.input<typeof updateUserRoleSchema>,
): Promise<UserActionResult> {
  const user = await requireUser();

  if (!canAccessAdmin(user)) {
    return {
      ok: false,
      error: "Você não tem permissão para atualizar papéis de usuário.",
    };
  }

  const parsed = updateUserRoleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para atualizar o papel.",
    };
  }

  const targetUser = await db.user.findUnique({
    where: {
      id: parsed.data.userId,
    },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
    },
  });

  if (!targetUser) {
    return {
      ok: false,
      error: "Usuário não encontrado.",
    };
  }

  if (targetUser.role === parsed.data.role) {
    return {
      ok: true,
      message: "Papel mantido sem alterações.",
    };
  }

  if (targetUser.role === GlobalRole.ADMIN && parsed.data.role !== GlobalRole.ADMIN) {
    const activeAdminCount = await db.user.count({
      where: {
        role: GlobalRole.ADMIN,
        active: true,
      },
    });

    if (activeAdminCount <= 1) {
      return {
        ok: false,
        error: "Mantenha pelo menos um admin ativo no workspace.",
      };
    }
  }

  await db.user.update({
    where: {
      id: targetUser.id,
    },
    data: {
      role: parsed.data.role,
    },
  });

  revalidateUserViews();

  return {
    ok: true,
    message: `Papel de ${targetUser.name} atualizado com sucesso.`,
  };
}

export async function resetUserPasswordAction(
  input: z.input<typeof resetUserPasswordSchema>,
): Promise<UserActionResult> {
  const user = await requireUser();

  if (!canAccessAdmin(user)) {
    return {
      ok: false,
      error: "Você não tem permissão para redefinir senhas.",
    };
  }

  const parsed = resetUserPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Usuário inválido para redefinição de senha.",
    };
  }

  const targetUser = await db.user.findUnique({
    where: {
      id: parsed.data.userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!targetUser) {
    return {
      ok: false,
      error: "Usuário não encontrado.",
    };
  }

  await db.user.update({
    where: {
      id: targetUser.id,
    },
    data: {
      passwordHash: await hashPassword(PLATFORM_RESET_PASSWORD),
    },
  });

  revalidateUserViews();

  return {
    ok: true,
    message: `Senha de ${targetUser.name} redefinida para ${PLATFORM_RESET_PASSWORD}.`,
  };
}

export async function deleteUserAction(
  input: z.input<typeof deleteUserSchema>,
): Promise<UserActionResult> {
  const user = await requireUser();

  if (!canAccessAdmin(user)) {
    return {
      ok: false,
      error: "Você não tem permissão para excluir usuários.",
    };
  }

  const parsed = deleteUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Usuário inválido para exclusão.",
    };
  }

  if (parsed.data.userId === user.id) {
    return {
      ok: false,
      error: "Não é possível excluir o próprio usuário enquanto você está logado.",
    };
  }

  const targetUser = await db.user.findUnique({
    where: {
      id: parsed.data.userId,
    },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      _count: {
        select: {
          ownedProjects: true,
          createdTasks: true,
        },
      },
    },
  });

  if (!targetUser) {
    return {
      ok: false,
      error: "Usuário não encontrado.",
    };
  }

  if (targetUser.role === GlobalRole.ADMIN) {
    const activeAdminCount = await db.user.count({
      where: {
        role: GlobalRole.ADMIN,
        active: true,
      },
    });

    if (activeAdminCount <= 1) {
      return {
        ok: false,
        error: "Mantenha pelo menos um admin ativo no workspace.",
      };
    }
  }

  await db.$transaction(async (transaction) => {
    await transaction.project.updateMany({
      where: {
        ownerId: targetUser.id,
      },
      data: {
        ownerId: user.id,
      },
    });

    await transaction.task.updateMany({
      where: {
        creatorId: targetUser.id,
      },
      data: {
        creatorId: user.id,
      },
    });

    await transaction.user.delete({
      where: {
        id: targetUser.id,
      },
    });
  });

  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/teams");
  revalidateUserViews();

  const transferSummary =
    targetUser._count.ownedProjects || targetUser._count.createdTasks
      ? " Projetos e tarefas de autoria foram transferidos para o admin responsável."
      : "";

  return {
    ok: true,
    message: `${targetUser.name} foi removido do workspace.${transferSummary}`,
  };
}

export async function createUserAction(
  input: z.input<typeof createUserSchema>,
): Promise<CreateUserActionResult> {
  const user = await requireUser();

  if (!canAccessAdmin(user)) {
    return {
      ok: false,
      error: "Você não tem permissão para cadastrar usuários.",
    };
  }

  const parsed = createUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para criar o usuário.",
    };
  }

  const fullName = `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`.replace(
    /\s+/g,
    " ",
  );
  const email = await createUniquePlatformEmail(
    parsed.data.firstName,
    parsed.data.lastName,
  );

  const createdUser = await db.user.create({
    data: {
      name: fullName,
      email,
      passwordHash: await hashPassword(PLATFORM_RESET_PASSWORD),
      role: parsed.data.role,
      title: getDefaultTitleForRole(parsed.data.role),
    },
    select: {
      id: true,
      email: true,
    },
  });

  revalidateUserViews();

  return {
    ok: true,
    userId: createdUser.id,
    email: createdUser.email,
    message: `Usuário criado com login ${createdUser.email} e senha inicial ${PLATFORM_RESET_PASSWORD}.`,
  };
}

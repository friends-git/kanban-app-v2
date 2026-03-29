"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { createUniqueTeamSlug, normalizeText } from "@/server/actions/utils";
import { canCreateTeam } from "@/server/permissions";

const createTeamSchema = z.object({
  name: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres."),
  summary: z
    .string()
    .trim()
    .min(12, "Descreva rapidamente a responsabilidade da equipe."),
  focus: z.string().trim().max(120, "O foco pode ter no máximo 120 caracteres.").optional(),
  memberIds: z.array(z.string()).default([]),
  leadIds: z.array(z.string()).default([]),
});

type TeamMutationResult =
  | { ok: true; teamId: string; message: string }
  | { ok: false; error: string };

function revalidateTeamViews() {
  revalidatePath("/teams");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function createTeamAction(
  input: z.input<typeof createTeamSchema>,
): Promise<TeamMutationResult> {
  const user = await requireUser();

  if (!canCreateTeam(user)) {
    return {
      ok: false,
      error: "Você não tem permissão para criar equipes.",
    };
  }

  const parsed = createTeamSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para criar a equipe.",
    };
  }

  const memberIds = Array.from(new Set([user.id, ...parsed.data.memberIds]));
  const additionalLeadIds = Array.from(new Set(parsed.data.leadIds));
  const leadIds = Array.from(new Set([user.id, ...additionalLeadIds]));
  const selectedUserIds = Array.from(new Set([...memberIds, ...leadIds]));

  const users = await db.user.findMany({
    where: {
      id: {
        in: selectedUserIds,
      },
      active: true,
    },
    select: {
      id: true,
    },
  });

  if (users.length !== selectedUserIds.length) {
    return {
      ok: false,
      error: "Uma ou mais pessoas selecionadas não estão disponíveis.",
    };
  }

  const validUserIds = new Set(users.map((selectedUser) => selectedUser.id));
  const finalMemberIds = memberIds.filter((memberId) => validUserIds.has(memberId));
  const finalLeadIds = new Set(
    leadIds.filter((leadId) => validUserIds.has(leadId) && finalMemberIds.includes(leadId)),
  );
  const slug = await createUniqueTeamSlug(parsed.data.name);

  const team = await db.team.create({
    data: {
      name: parsed.data.name.trim(),
      slug,
      summary: parsed.data.summary.trim(),
      focus: normalizeText(parsed.data.focus),
      members: {
        create: finalMemberIds.map((memberId) => ({
          userId: memberId,
          isLead: finalLeadIds.has(memberId),
        })),
      },
    },
    select: {
      id: true,
    },
  });

  revalidateTeamViews();

  return {
    ok: true,
    teamId: team.id,
    message: "Equipe criada com sucesso.",
  };
}

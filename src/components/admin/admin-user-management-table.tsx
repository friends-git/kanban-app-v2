"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { GlobalRole } from "@prisma/client";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { PLATFORM_RESET_PASSWORD } from "@/lib/auth";
import { roleLabels } from "@/lib/domain";
import {
  deleteUserAction,
  resetUserPasswordAction,
  updateUserRoleAction,
} from "@/server/actions/users";
import { DataTable } from "@/components/ui/data-table";

type AdminUserManagementTableProps = {
  currentUserId: string;
  users: Array<{
    id: string;
    name: string;
    email: string;
    title: string | null;
    role: GlobalRole;
    _count: {
      projectMemberships: number;
      teamMemberships: number;
      taskAssignments: number;
    };
  }>;
};

type FeedbackState =
  | { type: "success"; text: string }
  | { type: "error"; text: string }
  | null;

const roleOptions = Object.values(GlobalRole);

export function AdminUserManagementTable({
  currentUserId,
  users,
}: AdminUserManagementTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, GlobalRole>>(() =>
    Object.fromEntries(users.map((user) => [user.id, user.role])),
  );

  useEffect(() => {
    setDraftRoles(Object.fromEntries(users.map((user) => [user.id, user.role])));
  }, [users]);

  const currentRoleMap = useMemo(
    () => Object.fromEntries(users.map((user) => [user.id, user.role])),
    [users],
  );

  const handleRoleSave = (userId: string) => {
    setFeedback(null);
    setPendingUserId(userId);

    startTransition(async () => {
      const result = await updateUserRoleAction({
        userId,
        role: draftRoles[userId] ?? currentRoleMap[userId],
      });

      if (!result.ok) {
        setFeedback({ type: "error", text: result.error });
        setPendingUserId(null);
        return;
      }

      setFeedback({ type: "success", text: result.message });
      setPendingUserId(null);
      router.refresh();
    });
  };

  const handlePasswordReset = (userId: string) => {
    setFeedback(null);
    setPendingUserId(userId);

    startTransition(async () => {
      const result = await resetUserPasswordAction({ userId });

      if (!result.ok) {
        setFeedback({ type: "error", text: result.error });
        setPendingUserId(null);
        return;
      }

      setFeedback({ type: "success", text: result.message });
      setPendingUserId(null);
      router.refresh();
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (
      !window.confirm(
        `Excluir ${userName} do workspace? Projetos e tarefas de autoria serão transferidos para o admin responsável.`,
      )
    ) {
      return;
    }

    setFeedback(null);
    setPendingUserId(userId);

    startTransition(async () => {
      const result = await deleteUserAction({ userId });

      if (!result.ok) {
        setFeedback({ type: "error", text: result.error });
        setPendingUserId(null);
        return;
      }

      setFeedback({ type: "success", text: result.message });
      setPendingUserId(null);
      router.refresh();
    });
  };

  return (
    <Stack spacing={2}>
      {feedback ? <Alert severity={feedback.type}>{feedback.text}</Alert> : null}

      <Typography color="text.secondary" variant="body2">
        Use esta tabela para ajustar o papel global de cada pessoa e redefinir o
        acesso quando alguém esquecer a senha. A redefinição volta a senha para{" "}
        <strong>{PLATFORM_RESET_PASSWORD}</strong>. Se precisar remover alguém,
        a exclusão também pode ser feita por aqui.
      </Typography>

      <DataTable
        columns={["Nome", "Contato", "Papel global", "Projetos", "Equipes", "Tarefas", "Ações"]}
      >
        {users.map((workspaceUser) => {
          const selectedRole = draftRoles[workspaceUser.id] ?? currentRoleMap[workspaceUser.id];
          const roleChanged = selectedRole !== currentRoleMap[workspaceUser.id];
          const userPending = isPending && pendingUserId === workspaceUser.id;

          return (
            <TableRow key={workspaceUser.id} hover>
              <TableCell>
                <Box>
                  <Typography fontWeight={700}>{workspaceUser.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {workspaceUser.title ?? "Sem função definida"}
                    {workspaceUser.id === currentUserId ? " • Você" : ""}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>{workspaceUser.email}</TableCell>
              <TableCell sx={{ minWidth: 220 }}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={selectedRole}
                  onChange={(event) =>
                    setDraftRoles((current) => ({
                      ...current,
                      [workspaceUser.id]: event.target.value as GlobalRole,
                    }))
                  }
                >
                  {roleOptions.map((role) => (
                    <MenuItem key={role} value={role}>
                      {roleLabels[role]}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>{workspaceUser._count.projectMemberships}</TableCell>
              <TableCell>{workspaceUser._count.teamMemberships}</TableCell>
              <TableCell>{workspaceUser._count.taskAssignments}</TableCell>
              <TableCell sx={{ minWidth: 250 }}>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={1}>
                  <Button
                    variant={roleChanged ? "contained" : "outlined"}
                    color={roleChanged ? "primary" : "inherit"}
                    disabled={userPending || !roleChanged}
                    onClick={() => handleRoleSave(workspaceUser.id)}
                  >
                    Salvar papel
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    disabled={userPending}
                    onClick={() => handlePasswordReset(workspaceUser.id)}
                  >
                    Resetar senha
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={userPending || workspaceUser.id === currentUserId}
                    onClick={() => handleDeleteUser(workspaceUser.id, workspaceUser.name)}
                  >
                    Excluir
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>
    </Stack>
  );
}

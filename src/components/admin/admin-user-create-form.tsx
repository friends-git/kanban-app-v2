"use client";

import { useState, useTransition } from "react";
import { GlobalRole } from "@prisma/client";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { PLATFORM_RESET_PASSWORD } from "@/lib/auth";
import { roleLabels } from "@/lib/domain";
import { createUserAction } from "@/server/actions/users";

type FeedbackState =
  | { type: "success"; text: string }
  | { type: "error"; text: string }
  | null;

const roleOptions = Object.values(GlobalRole);

export function AdminUserCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [form, setForm] = useState<{
    firstName: string;
    lastName: string;
    role: GlobalRole;
  }>({
    firstName: "",
    lastName: "",
    role: GlobalRole.MEMBER,
  });

  const handleSubmit = () => {
    setFeedback(null);

    startTransition(async () => {
      const result = await createUserAction(form);

      if (!result.ok) {
        setFeedback({ type: "error", text: result.error });
        return;
      }

      setFeedback({ type: "success", text: result.message });
      setForm({
        firstName: "",
        lastName: "",
        role: GlobalRole.MEMBER,
      });
      router.refresh();
    });
  };

  return (
    <Stack spacing={2}>
      {feedback ? <Alert severity={feedback.type}>{feedback.text}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        <TextField
          label="Nome"
          value={form.firstName}
          onChange={(event) =>
            setForm((current) => ({ ...current, firstName: event.target.value }))
          }
        />
        <TextField
          label="Sobrenome"
          value={form.lastName}
          onChange={(event) =>
            setForm((current) => ({ ...current, lastName: event.target.value }))
          }
        />
        <TextField
          select
          label="Papel"
          value={form.role}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              role: event.target.value as GlobalRole,
            }))
          }
        >
          {roleOptions.map((role) => (
            <MenuItem key={role} value={role}>
              {roleLabels[role]}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 620 }}>
          O login será criado no formato <strong>nome.sobrenome@rolezito.com</strong>.
          A senha inicial é <strong>{PLATFORM_RESET_PASSWORD}</strong> e a plataforma
          exigirá a troca dela no primeiro acesso.
        </Typography>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending || !form.firstName.trim() || !form.lastName.trim()}
        >
          Cadastrar usuário
        </Button>
      </Stack>
    </Stack>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD_LENGTH, PLATFORM_RESET_PASSWORD } from "@/lib/auth";
import { changeOwnPasswordAction } from "@/server/actions/users";

type FeedbackState =
  | { type: "success"; text: string }
  | { type: "error"; text: string }
  | null;

export function ProfilePasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = () => {
    setFeedback(null);

    startTransition(async () => {
      const result = await changeOwnPasswordAction(form);

      if (!result.ok) {
        setFeedback({ type: "error", text: result.error });
        return;
      }

      setFeedback({ type: "success", text: result.message });
      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
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
            md: "repeat(2, minmax(0, 1fr))",
          },
        }}
      >
        <TextField
          label="Senha atual"
          type="password"
          value={form.currentPassword}
          onChange={(event) =>
            setForm((current) => ({ ...current, currentPassword: event.target.value }))
          }
        />
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
            gridColumn: { md: "span 1" },
          }}
        >
          <TextField
            label="Nova senha"
            type="password"
            value={form.newPassword}
            helperText={`Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`}
            onChange={(event) =>
              setForm((current) => ({ ...current, newPassword: event.target.value }))
            }
          />
          <TextField
            label="Confirmar nova senha"
            type="password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, confirmPassword: event.target.value }))
            }
          />
        </Box>
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 520 }}>
          Se a administração redefinir seu acesso, a senha temporária passa a ser{" "}
          <strong>{PLATFORM_RESET_PASSWORD}</strong>. Troque-a assim que entrar novamente.
        </Typography>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            isPending ||
            !form.currentPassword ||
            !form.newPassword ||
            !form.confirmPassword
          }
        >
          Atualizar senha
        </Button>
      </Stack>
    </Stack>
  );
}

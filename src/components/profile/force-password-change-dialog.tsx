"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Dialog, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { completeDefaultPasswordChangeAction } from "@/server/actions/users";

type ForcePasswordChangeDialogProps = {
  open: boolean;
};

type FeedbackState =
  | { type: "success"; text: string }
  | { type: "error"; text: string }
  | null;

export function ForcePasswordChangeDialog({
  open,
}: ForcePasswordChangeDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = () => {
    setFeedback(null);

    startTransition(async () => {
      const result = await completeDefaultPasswordChangeAction(form);

      if (!result.ok) {
        setFeedback({ type: "error", text: result.error });
        return;
      }

      setFeedback({ type: "success", text: result.message });
      setForm({
        newPassword: "",
        confirmPassword: "",
      });
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(8px)",
          },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
        <Stack spacing={0.9}>
          <Typography variant="overline" sx={{ color: "secondary.main", letterSpacing: "0.16em" }}>
            Primeiro acesso
          </Typography>
          <BoxTitle
            title="Troque sua senha para continuar"
            description="Seu acesso ainda está com a senha padrão da plataforma. Defina uma nova senha antes de seguir usando o workspace."
          />
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2.5, md: 3 }, pb: { xs: 2.5, md: 3 } }}>
        <Stack spacing={2}>
          {feedback ? <Alert severity={feedback.type}>{feedback.text}</Alert> : null}
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
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isPending || !form.newPassword || !form.confirmPassword}
          >
            Salvar nova senha
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function BoxTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="h3">{title}</Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Stack>
  );
}

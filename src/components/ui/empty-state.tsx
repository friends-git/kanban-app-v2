import { AutoAwesomeRounded } from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";

type EmptyStateProps = {
  message: string;
  title?: string;
};

export function EmptyState({
  message,
  title = "Nada para mostrar por aqui",
}: EmptyStateProps) {
  return (
    <Stack
      spacing={1.5}
      alignItems="center"
      justifyContent="center"
      sx={{
        py: 7,
        px: 3,
        textAlign: "center",
        borderRadius: 5,
        border: "1px dashed",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 4,
          bgcolor: "secondary.main",
          color: "secondary.contrastText",
          display: "grid",
          placeItems: "center",
        }}
      >
        <AutoAwesomeRounded fontSize="small" />
      </Box>
      <Typography variant="h4">{title}</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        {message}
      </Typography>
    </Stack>
  );
}

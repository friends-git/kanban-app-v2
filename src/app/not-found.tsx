import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 3,
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 420 }}>
        <Typography variant="h2">Página não encontrada</Typography>
        <Typography color="text.secondary">
          O caminho solicitado não existe neste workspace do TCC.
        </Typography>
        <Button component={Link} href="/dashboard" variant="contained">
          Voltar ao dashboard
        </Button>
      </Stack>
    </Box>
  );
}

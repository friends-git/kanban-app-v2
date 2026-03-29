import { Box, Stack, Typography } from "@mui/material";

type KanbanColumnProps = {
  title: string;
  count: number;
  children: React.ReactNode;
};

export function KanbanColumn({ title, count, children }: KanbanColumnProps) {
  return (
    <Box
      sx={{
        minHeight: 320,
        p: 2,
        borderRadius: 6,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)",
      }}
    >
      <Stack spacing={1.75}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={0.35}>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              Grupo
            </Typography>
            <Typography variant="h4">{title}</Typography>
          </Stack>
          <Box
            sx={{
              minWidth: 28,
              px: 0.75,
              py: 0.35,
              borderRadius: 999,
              bgcolor: "action.hover",
              textAlign: "center",
              fontSize: 12,
              color: "text.secondary",
            }}
          >
            {count}
          </Box>
        </Stack>
        <Stack spacing={1.5}>{children}</Stack>
      </Stack>
    </Box>
  );
}

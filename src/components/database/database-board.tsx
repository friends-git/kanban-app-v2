import { Box, Stack, Typography } from "@mui/material";

type DatabaseBoardProps = {
  children: React.ReactNode;
};

type DatabaseBoardColumnProps = {
  title: string;
  count: number;
  children: React.ReactNode;
};

type DatabaseBoardEmptyStateProps = {
  title?: string;
  message: string;
};

export function DatabaseBoard({ children }: DatabaseBoardProps) {
  return (
    <Box
      sx={{
        overflowX: "auto",
        overflowY: "hidden",
        pb: 1,
        mx: -0.5,
        px: 0.5,
        "&::-webkit-scrollbar": {
          height: 10,
        },
        "&::-webkit-scrollbar-thumb": {
          borderRadius: 999,
          bgcolor: "action.hover",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 2.25,
          alignItems: "flex-start",
          minWidth: "max-content",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function DatabaseBoardColumn({
  title,
  count,
  children,
}: DatabaseBoardColumnProps) {
  return (
    <Box
      sx={{
        width: { xs: 292, md: 320 },
        flex: "0 0 auto",
        borderRadius: 5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        px: 1.75,
        py: 1.75,
        boxShadow: "0 18px 42px rgba(0, 0, 0, 0.14)",
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 0.5 }}
        >
          <Typography fontWeight={700} sx={{ letterSpacing: "-0.02em" }}>
            {title}
          </Typography>
          <Box
            component="span"
            sx={{
              minWidth: 26,
              px: 0.8,
              py: 0.25,
              borderRadius: 999,
              bgcolor: "action.hover",
              color: "text.secondary",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {count}
          </Box>
        </Stack>
        <Stack spacing={1.25}>{children}</Stack>
      </Stack>
    </Box>
  );
}

export function DatabaseBoardEmptyState({
  title = "Sem itens",
  message,
}: DatabaseBoardEmptyStateProps) {
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 3.5,
        border: "1px dashed",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <Stack spacing={0.35}>
        <Typography fontWeight={700} variant="body2">
          {title}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {message}
        </Typography>
      </Stack>
    </Box>
  );
}

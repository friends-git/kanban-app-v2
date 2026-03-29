import { Box, Chip, Stack, Typography } from "@mui/material";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  chips?: string[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  chips,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 7,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        px: { xs: 2.5, md: 3.5, xl: 4 },
        py: { xs: 2.5, md: 3, xl: 3.5 },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at top left, rgba(93, 5, 255, 0.10), transparent 28%), radial-gradient(circle at top right, rgba(255, 187, 0, 0.08), transparent 24%)",
        }}
      />

      <Stack spacing={children ? 3 : 0} sx={{ position: "relative" }}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          justifyContent="space-between"
          spacing={{ xs: 2.5, xl: 3 }}
        >
          <Stack spacing={1.5} sx={{ maxWidth: 840 }}>
            {eyebrow ? (
              <Typography
                variant="overline"
                sx={{ color: "secondary.main", letterSpacing: "0.18em" }}
              >
                {eyebrow}
              </Typography>
            ) : null}
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: "2rem", md: "2.4rem", xl: "2.75rem" },
                  lineHeight: 1.02,
                }}
              >
                {title}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 1.25, maxWidth: 760, fontSize: { xs: 14, md: 15.5 } }}
              >
                {description}
              </Typography>
            </Box>
            {chips?.length ? (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {chips.map((chip) => (
                  <Chip
                    key={chip}
                    label={chip}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: "divider",
                      bgcolor: "background.default",
                      color: "text.secondary",
                    }}
                  />
                ))}
              </Stack>
            ) : null}
          </Stack>
          {actions ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: { xs: "flex-start", xl: "flex-end" },
              }}
            >
              {actions}
            </Box>
          ) : null}
        </Stack>

        {children ? (
          <Box
            sx={{
              pt: 2.5,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            {children}
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

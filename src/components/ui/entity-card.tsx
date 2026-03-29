import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

type EntityCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
};

export function EntityCard({
  eyebrow,
  title,
  description,
  actions,
  footer,
  children,
}: EntityCardProps) {
  return (
    <Card sx={{ overflow: "hidden" }}>
      <CardContent
        sx={{
          p: { xs: 2.5, md: 3, xl: 3.5 },
          "&:last-child": {
            pb: { xs: 2.5, md: 3, xl: 3.5 },
          },
        }}
      >
        <Stack spacing={children ? 2.5 : 0}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack spacing={0.9} sx={{ maxWidth: 780 }}>
              {eyebrow ? (
                <Typography
                  variant="overline"
                  sx={{ color: "secondary.main", letterSpacing: "0.16em" }}
                >
                  {eyebrow}
                </Typography>
              ) : null}
              <Typography
                variant="h3"
                sx={{ fontSize: { xs: "1.1rem", md: "1.2rem" }, lineHeight: 1.14 }}
              >
                {title}
              </Typography>
              {description ? (
                <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
                  {description}
                </Typography>
              ) : null}
            </Stack>
            {actions ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: { xs: "flex-start", md: "flex-end" },
                }}
              >
                {actions}
              </Box>
            ) : null}
          </Stack>
          {children}
          {footer ? (
            <Box
              sx={{
                pt: 2,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              {footer}
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

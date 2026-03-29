import { Card, CardContent, Stack, Typography } from "@mui/material";

type KpiCardProps = {
  label: string;
  value: number | string;
  helper: string;
  tone?: "gold" | "violet" | "neutral";
};

export function KpiCard({
  label,
  value,
  helper,
  tone = "neutral",
}: KpiCardProps) {
  const accent = {
    gold: "primary.main",
    violet: "secondary.main",
    neutral: "text.primary",
  }[tone];

  return (
    <Card>
      <CardContent
        sx={{
          p: { xs: 2.5, md: 3 },
          "&:last-child": {
            pb: { xs: 2.5, md: 3 },
          },
        }}
      >
        <Stack spacing={2}>
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            {label}
          </Typography>
          <Typography variant="h2" sx={{ color: accent, fontSize: { xs: "2rem", md: "2.3rem" } }}>
            {value}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 220 }}>
            {helper}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

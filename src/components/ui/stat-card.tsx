import { Card, CardContent, Stack, Typography } from "@mui/material";

type StatCardProps = {
  label: string;
  value: number | string;
  helper: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Typography color="text.secondary" variant="body2">
            {label}
          </Typography>
          <Typography variant="h2">{value}</Typography>
          <Typography color="text.secondary" variant="body2">
            {helper}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

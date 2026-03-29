"use client";

import { useTheme } from "@mui/material/styles";
import { Box, Stack, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type RoleDistributionChartProps = {
  data: Array<{
    label: string;
    value: number;
  }>;
};

export function RoleDistributionChart({ data }: RoleDistributionChartProps) {
  const theme = useTheme();
  const palette = [
    theme.palette.secondary.main,
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.success.main,
  ];

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={3}
      alignItems={{ xs: "flex-start", md: "center" }}
    >
      <Box sx={{ height: 260, width: "100%", maxWidth: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={54}
              outerRadius={90}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 18,
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      <Stack spacing={1.5}>
        {data.map((item, index) => (
          <Stack key={item.label} direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "999px",
                bgcolor: palette[index % palette.length],
              }}
            />
            <Typography sx={{ minWidth: 110 }}>{item.label}</Typography>
            <Typography color="text.secondary">{item.value}</Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

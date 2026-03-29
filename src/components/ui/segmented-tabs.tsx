import { Box, Stack, Typography } from "@mui/material";
import Link from "next/link";

type TabItem = {
  label: string;
  value: string;
  href: string;
  count?: number;
};

type SegmentedTabsProps = {
  value: string;
  items: TabItem[];
};

export function SegmentedTabs({ value, items }: SegmentedTabsProps) {
  return (
    <Box
      sx={{
        overflowX: "auto",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack direction="row" spacing={2.5} sx={{ minWidth: "max-content", pb: 0.25 }}>
        {items.map((item) => {
          const selected = item.value === value;

          return (
            <Box
              key={item.value}
              component={Link}
              href={item.href}
              sx={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                pb: 1.2,
                color: selected ? "text.primary" : "text.secondary",
                fontWeight: 700,
                whiteSpace: "nowrap",
                transition: "color 180ms ease",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: -1,
                  height: 3,
                  borderRadius: 999,
                  bgcolor: selected ? "secondary.main" : "transparent",
                },
                "&:hover": {
                  color: "text.primary",
                },
              }}
            >
              <Typography component="span" fontWeight="inherit">
                {item.label}
              </Typography>
              {item.count !== undefined ? (
                <Box
                  component="span"
                  sx={{
                    minWidth: 24,
                    px: 0.75,
                    py: 0.2,
                    borderRadius: 999,
                    bgcolor: selected ? "rgba(93, 5, 255, 0.12)" : "action.hover",
                    color: selected ? "secondary.main" : "text.secondary",
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  {item.count}
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

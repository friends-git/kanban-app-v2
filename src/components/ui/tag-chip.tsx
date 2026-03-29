import { Box, Chip } from "@mui/material";

type TagChipProps = {
  label: string;
  color?: string;
  selected?: boolean;
};

export function TagChip({ label, color, selected = false }: TagChipProps) {
  return (
    <Chip
      label={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
          {color ? (
            <Box
              component="span"
              sx={{
                width: 8,
                height: 8,
                borderRadius: 999,
                bgcolor: color,
              }}
            />
          ) : null}
          {label}
        </Box>
      }
      size="small"
      sx={{
        bgcolor: selected ? "primary.main" : "action.hover",
        color: selected ? "primary.contrastText" : "text.primary",
      }}
    />
  );
}

"use client";

import { useState } from "react";
import { ExpandMoreRounded } from "@mui/icons-material";
import { Box, Collapse, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import Link from "next/link";

type DatabaseSurfaceProps = {
  children: React.ReactNode;
};

type DatabaseGroupProps = {
  title: string;
  count: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  highlighted?: boolean;
  contentSx?: SxProps<Theme>;
};

type DatabaseRowProps = {
  href?: string;
  columns: string | Record<string, string>;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
};

type DatabaseListHeaderProps = {
  columns: string | Record<string, string>;
  children: React.ReactNode;
};

export function DatabaseSurface({ children }: DatabaseSurfaceProps) {
  return (
    <Box
      sx={{
        borderRadius: 5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        p: 0.5,
      }}
    >
      <Box
        sx={{
          overflow: "hidden",
          borderRadius: 4,
          bgcolor: "background.paper",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function DatabaseListHeader({
  columns,
  children,
}: DatabaseListHeaderProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        alignItems: "center",
        gridTemplateColumns: columns,
        px: 2.25,
        py: 1.1,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
        color: "text.secondary",
        fontSize: 12,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Box>
  );
}

export function DatabaseGroup({
  title,
  count,
  defaultExpanded = true,
  children,
  highlighted = false,
  contentSx,
}: DatabaseGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box
      sx={{
        borderBottom: "1px solid",
        borderColor: highlighted ? "secondary.main" : "divider",
        transition: "border-color 180ms ease",
        "&:last-of-type": {
          borderBottom: "none",
        },
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => setExpanded((current) => !current)}
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 2.25,
          py: 1.2,
          border: 0,
          bgcolor: highlighted ? "action.hover" : "transparent",
          cursor: "pointer",
          textAlign: "left",
          transition: "background-color 180ms ease",
          "&:hover": {
            bgcolor: "action.hover",
          },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              display: "flex",
              transition: "transform 180ms ease",
              transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
              color: "text.secondary",
            }}
          >
            <ExpandMoreRounded fontSize="small" />
          </Box>
          <Typography fontWeight={700}>{title}</Typography>
        </Stack>
        <Box
          component="span"
          sx={{
            minWidth: 24,
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
      </Box>

      <Collapse in={expanded} timeout={180} unmountOnExit>
        <Box
          sx={{
            "& > * + *": {
              borderTop: "1px solid",
              borderColor: "divider",
            },
            ...contentSx,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

export function DatabaseRow({ href, columns, children, sx }: DatabaseRowProps) {
  const content = (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        alignItems: "center",
        gridTemplateColumns: columns,
        minWidth: 0,
        px: 2.25,
        py: 1.5,
        transition: "background-color 180ms ease",
        "&:hover": {
          bgcolor: "action.hover",
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );

  if (!href) {
    return content;
  }

  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "block",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      {content}
    </Box>
  );
}

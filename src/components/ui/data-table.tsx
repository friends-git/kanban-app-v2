import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

type DataTableProps = {
  columns: string[];
  children: React.ReactNode;
};

export function DataTable({ columns, children }: DataTableProps) {
  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 6,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Table size="medium">
        <TableHead
          sx={{
            bgcolor: "action.hover",
            "& .MuiTableCell-root": {
              borderBottomColor: "divider",
            },
          }}
        >
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column}
                sx={{
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody
          sx={{
            "& .MuiTableRow-root:last-of-type .MuiTableCell-root": {
              borderBottom: "none",
            },
            "& .MuiTableRow-hover:hover": {
              bgcolor: "action.hover",
            },
            "& .MuiTableCell-root": {
              py: 1.75,
              borderBottomColor: "divider",
            },
          }}
        >
          {children}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

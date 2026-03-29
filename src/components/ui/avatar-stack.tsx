import { Avatar, AvatarGroup } from "@mui/material";

type AvatarStackProps = {
  items: Array<{
    id: string;
    name: string;
    avatarColor?: string | null;
  }>;
  max?: number;
};

export function AvatarStack({ items, max = 4 }: AvatarStackProps) {
  return (
    <AvatarGroup max={max}>
      {items.map((item) => (
        <Avatar
          key={item.id}
          sx={{
            bgcolor: item.avatarColor ?? "secondary.main",
            width: 34,
            height: 34,
            fontSize: 14,
          }}
        >
          {item.name.charAt(0)}
        </Avatar>
      ))}
    </AvatarGroup>
  );
}

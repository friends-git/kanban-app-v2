import { canAccessAdmin } from "@/server/permissions";
import { AppShellFrame } from "@/components/layout/app-shell-frame";

type AppLayoutProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Parameters<typeof canAccessAdmin>[0]["role"];
    title: string | null;
    avatarColor: string | null;
  };
  requiresPasswordChange: boolean;
  children: React.ReactNode;
};

export function AppLayout({
  user,
  requiresPasswordChange,
  children,
}: AppLayoutProps) {
  const showAdmin = canAccessAdmin(user);

  return (
    <AppShellFrame
      user={user}
      requiresPasswordChange={requiresPasswordChange}
      showAdmin={showAdmin}
    >
      {children}
    </AppShellFrame>
  );
}

export const AppShell = AppLayout;

import { AppLayout as WorkspaceLayout } from "@/components/layout/app-shell";
import { PLATFORM_RESET_PASSWORD } from "@/lib/auth";
import { verifyPassword } from "@/server/auth/password";
import { requireUser } from "@/server/auth/session";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const user = await requireUser();
  const requiresPasswordChange = await verifyPassword(
    PLATFORM_RESET_PASSWORD,
    user.passwordHash,
  );

  return (
    <WorkspaceLayout user={user} requiresPasswordChange={requiresPasswordChange}>
      {children}
    </WorkspaceLayout>
  );
}

import { AppLayout as WorkspaceLayout } from "@/components/layout/app-shell";
import { requireUser } from "@/server/auth/session";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const user = await requireUser();

  return <WorkspaceLayout user={user}>{children}</WorkspaceLayout>;
}

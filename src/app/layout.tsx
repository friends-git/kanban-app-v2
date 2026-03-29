import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Kanban - Rolêzito",
  description: "Workspace para acompanhar projetos, tarefas, sprints e prazos do TCC",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

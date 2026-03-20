import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Middleware handles redirect, but just in case:
  if (!session?.user) {
    return null;
  }

  return (
    <DashboardShell session={session}>
      {children}
    </DashboardShell>
  );
}

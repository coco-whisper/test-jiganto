import { AppSidebarProvider } from "@/components/layout/app-sidebar";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getSessionUser();

  if (!user || !profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("is_archived", false)
    .order("name", { ascending: true });

  return (
    <AppSidebarProvider
      userEmail={profile.email}
      userName={profile.display_name ?? profile.email.split("@")[0]}
      projects={projects ?? []}
    >
      {children}
    </AppSidebarProvider>
  );
}

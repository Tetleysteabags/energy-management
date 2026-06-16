import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="bg-background min-h-full md:flex">
      <AppSidebar />
      <div className="flex min-h-full min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <main className="mx-auto w-full flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10">
          <div className="mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-5xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

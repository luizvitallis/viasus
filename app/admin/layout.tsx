import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, role, tenant_id")
    .eq("id", user.id)
    .single();

  // Se o user existe em auth.users mas não tem profile (estado inválido),
  // forçamos logout — não sabemos a qual tenant ele pertence.
  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login?error=perfil_nao_encontrado");
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, subdomain")
    .eq("id", profile.tenant_id)
    .single();

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <AdminHeader
        userName={profile.name ?? profile.email}
        userRole={profile.role}
        tenantName={tenant?.name ?? "—"}
        tenantSubdomain={tenant?.subdomain ?? ""}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}

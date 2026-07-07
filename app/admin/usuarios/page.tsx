import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";
import { UserRow } from "./user-row";

export const metadata = {
  title: "Usuários — ViaSus",
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  gestor: "Gestor",
  curador: "Curador",
  publicador: "Publicador",
  profissional: "Profissional",
};

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canInvite = me?.role === "gestor" || me?.role === "admin";

  // RLS já filtra pelo tenant do user — todos os profiles do tenant
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, email, cpf, role, active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
          Equipe
        </p>
        <h1 className="font-serif font-semibold text-4xl text-stone-950">
          Usuários
        </h1>
        <p className="mt-3 text-stone-600 max-w-2xl">
          Gestores convidam curadores, publicadores e profissionais. Cada usuário
          pertence a um único tenant — o seu. Não há autocadastro.
        </p>
      </div>

      {canInvite && (
        <section className="mb-12 border-2 border-stone-900">
          <div className="bg-stone-100 border-b-2 border-stone-900 px-6 py-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-700">
              Convidar editor
            </p>
          </div>
          <div className="p-6">
            <InviteForm />
          </div>
        </section>
      )}

      <section>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-4">
          {profiles?.length ?? 0} usuário(s) no tenant
        </p>

        <ol className="border-y-2 border-stone-900 divide-y-2 divide-stone-900">
          {profiles?.map((p, i) => (
            <UserRow
              key={p.id}
              index={i}
              user={p}
              isSelf={p.id === user.id}
              canManage={canInvite}
              roleLabel={roleLabel}
            />
          ))}
        </ol>

        {(!profiles || profiles.length === 0) && (
          <div className="border-2 border-dashed border-stone-300 px-6 py-12 text-center">
            <p className="text-stone-600">Nenhum usuário cadastrado ainda.</p>
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/login/actions";

interface AdminHeaderProps {
  userName: string;
  userRole: string;
  tenantName: string;
  tenantSubdomain: string;
}

const roleLabel: Record<string, string> = {
  admin: "Admin",
  gestor: "Gestor",
  curador: "Curador",
  publicador: "Publicador",
  profissional: "Profissional",
};

export function AdminHeader({
  userName,
  userRole,
  tenantName,
  tenantSubdomain,
}: AdminHeaderProps) {
  return (
    <>
      {/* Faixa institucional preta */}
      <div className="bg-stone-950 text-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em]">
          <span>{tenantName}</span>
          <span className="text-stone-400 hidden sm:inline">
            painel administrativo · {roleLabel[userRole] ?? userRole}
          </span>
        </div>
      </div>

      {/* Header principal */}
      <header className="border-b-2 border-stone-900 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link
              href="/admin/dashboard"
              className="font-serif font-semibold text-2xl text-stone-950 hover:text-emerald-800 transition-colors"
            >
              ViaSus
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-stone-700">
              <Link
                href="/admin/dashboard"
                className="hover:text-emerald-800 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/protocolos"
                className="hover:text-emerald-800 transition-colors"
              >
                Protocolos
              </Link>
              <Link
                href="/admin/usuarios"
                className="hover:text-emerald-800 transition-colors"
              >
                Usuários
              </Link>
              {tenantSubdomain && (
                <Link
                  href={`/${tenantSubdomain}`}
                  target="_blank"
                  rel="noopener"
                  className="text-stone-500 hover:text-stone-900 transition-colors"
                >
                  Ver área pública ↗
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-stone-900 leading-tight">
                {userName}
              </p>
              <p className="text-xs text-stone-500 font-mono uppercase tracking-[0.14em]">
                {roleLabel[userRole] ?? userRole}
              </p>
            </div>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="rounded-none border border-stone-300 hover:border-stone-900 hover:bg-stone-900 hover:text-stone-50"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}

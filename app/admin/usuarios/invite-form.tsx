"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CpfInput } from "@/components/shared/cpf-input";
import { inviteUserAction, type InviteState } from "./actions";

function generatePassword() {
  // 12 caracteres legíveis (sem ambíguos tipo O/0, l/1), forte o suficiente.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function InviteForm() {
  const router = useRouter();
  // Remontar via key zera o useActionState (volta pro form limpo) sem reload.
  const [instance, setInstance] = useState(0);
  return (
    <InviteFormInner
      key={instance}
      onCadastrarOutro={() => {
        router.refresh();
        setInstance((i) => i + 1);
      }}
    />
  );
}

function InviteFormInner({
  onCadastrarOutro,
}: {
  onCadastrarOutro: () => void;
}) {
  const [state, action, pending] = useActionState<InviteState | undefined, FormData>(
    inviteUserAction,
    undefined,
  );
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  if (state?.success) {
    return (
      <div className="space-y-5">
        <div
          role="status"
          className="border-l-2 border-emerald-800 bg-emerald-50 px-4 py-4"
        >
          <p className="font-medium text-emerald-950">
            Usuário cadastrado: {state.success.name}
          </p>
          <p className="mt-1 text-sm text-emerald-900">
            Ele entra com o <strong>CPF</strong> e a senha abaixo. Compartilhe por
            canal seguro (não por chat público). Ele pode trocá-la depois em
            “Minha conta”.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-stone-700">Senha definida</Label>
          <div className="flex gap-2">
            <code className="flex-1 px-4 py-3 border-2 border-stone-900 bg-stone-100 font-mono text-base text-stone-950 select-all">
              {state.success.password}
            </code>
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-2 border-stone-900 hover:bg-stone-900 hover:text-stone-50 h-auto"
              onClick={() => {
                navigator.clipboard.writeText(state.success!.password);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? (
                <>
                  <Check className="size-4" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="size-4" /> Copiar
                </>
              )}
            </Button>
          </div>
        </div>

        <Button
          type="button"
          className="rounded-none bg-emerald-800 hover:bg-emerald-900 text-stone-50 px-6"
          onClick={onCadastrarOutro}
        >
          Cadastrar outro usuário
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Maria Silva"
            aria-invalid={Boolean(state?.fieldErrors?.name)}
          />
          {state?.fieldErrors?.name && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.name[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email institucional</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="maria.silva@caucaia.ce.gov.br"
            aria-invalid={Boolean(state?.fieldErrors?.email)}
          />
          {state?.fieldErrors?.email && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.email[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cpf">CPF</Label>
        <CpfInput
          id="cpf"
          name="cpf"
          required
          aria-invalid={Boolean(state?.fieldErrors?.cpf)}
        />
        <p className="text-xs text-stone-500">
          É por ele que o usuário vai entrar no sistema. O email fica só para
          recuperar a senha.
        </p>
        {state?.fieldErrors?.cpf && (
          <p className="text-sm text-destructive">{state.fieldErrors.cpf[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha inicial</Label>
        <div className="flex gap-2">
          <Input
            id="password"
            name="password"
            type="text"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Defina a senha (mín. 6 caracteres)"
            autoComplete="off"
            aria-invalid={Boolean(state?.fieldErrors?.password)}
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-none border-2 border-stone-300 hover:border-stone-900 h-auto shrink-0"
            onClick={() => setPassword(generatePassword())}
            title="Gerar uma senha forte"
          >
            <Dices className="size-4" />
            <span className="hidden sm:inline">Gerar</span>
          </Button>
        </div>
        <p className="text-xs text-stone-500">
          Você define a senha; o usuário pode trocá-la depois em “Minha conta”.
        </p>
        {state?.fieldErrors?.password && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Papel</Label>
        <select
          id="role"
          name="role"
          required
          defaultValue="curador"
          className="flex h-10 w-full border-2 border-stone-300 bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-emerald-800 focus-visible:outline-none focus-visible:ring-0"
          aria-invalid={Boolean(state?.fieldErrors?.role)}
        >
          <option value="curador">Curador — edita protocolos</option>
          <option value="publicador">Publicador — edita e publica</option>
          <option value="profissional">Profissional — só leitura logada</option>
        </select>
        {state?.fieldErrors?.role && (
          <p className="text-sm text-destructive">{state.fieldErrors.role[0]}</p>
        )}
      </div>

      {state?.error && (
        <div
          role="alert"
          className="border-l-2 border-destructive bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="bg-emerald-800 hover:bg-emerald-900 text-stone-50 h-11 px-6 rounded-none"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Cadastrando…
          </>
        ) : (
          "Cadastrar usuário"
        )}
      </Button>
    </form>
  );
}

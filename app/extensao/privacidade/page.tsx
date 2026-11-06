import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidade — Extensão ViaSus PEC",
  description:
    "Como a extensão ViaSus PEC trata dados no e-SUS PEC: não coleta, não guarda e não envia dado do cidadão nem do profissional.",
};

const sections = [
  {
    title: "O que a extensão faz",
    body: [
      "A extensão ViaSus PEC atua apenas nas páginas do e-SUS PEC do município (https://esus.caucaia.ce.gov.br). Quando o profissional abre um encaminhamento para serviço especializado, ela lê o campo Especialidade para saber qual protocolo de encaminhamento do ViaSus mostrar no painel lateral.",
      "Conforme o profissional marca os itens do protocolo, a extensão escreve nos campos Motivo do encaminhamento e Classificação de risco do formulário. Ela não lê nenhum outro campo do prontuário.",
    ],
  },
  {
    title: "Dados que a extensão NÃO coleta",
    body: [
      "A extensão não coleta, não guarda e não envia dado do cidadão (nome, CNS, CPF, endereço, histórico clínico ou qualquer outro), nem dado do profissional (login, senha, lotação). O texto do motivo é montado no próprio navegador e escrito direto no formulário do PEC.",
      "Não há rastreamento, cookies próprios, analytics nem publicidade.",
    ],
  },
  {
    title: "Comunicação com a internet",
    body: [
      "A única conexão que a extensão faz é baixar a lista de protocolos de encaminhamento publicados pelo município no ViaSus (https://viasus.vercel.app/api/public/caucaia-ce/encaminhamentos). Essa lista é conteúdo público, a mesma que qualquer pessoa vê no site. Nenhuma informação do PEC vai junto nesse pedido.",
    ],
  },
  {
    title: "O que fica guardado no navegador",
    body: [
      "Configuração: o endereço do ViaSus e o identificador do município (armazenamento de sincronização do navegador).",
      "Cópia dos protocolos publicados: para o painel funcionar se a internet da unidade cair (armazenamento local do navegador). É o mesmo conteúdo público citado acima.",
      "O botão Copiar motivo coloca o texto gerado na área de transferência apenas quando o profissional clica nele.",
    ],
  },
  {
    title: "Permissões pedidas ao navegador",
    body: [
      "Acesso a esus.caucaia.ce.gov.br: para mostrar o painel e preencher motivo e risco no formulário de encaminhamento.",
      "Acesso a viasus.vercel.app: para baixar os protocolos publicados.",
      "storage: para guardar a configuração e a cópia offline dos protocolos.",
      "scripting: para ativar o painel nas abas do PEC que já estavam abertas quando a extensão foi instalada ou atualizada, sem precisar recarregar a página.",
    ],
  },
  {
    title: "Sobre o ViaSus",
    body: [
      "O ViaSus é a plataforma de protocolos clínicos da Secretaria Municipal de Saúde de Caucaia (CE). A extensão não é produto oficial do Ministério da Saúde nem do e-SUS APS; ela apenas ajuda a preencher o formulário de encaminhamento do PEC com base nos protocolos do município.",
      "Dúvidas sobre esta política podem ser enviadas pelo contato do desenvolvedor na página da extensão na Chrome Web Store.",
    ],
  },
];

export default function ExtensionPrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
          <Link href="/" className="hover:text-emerald-800">
            ViaSus
          </Link>{" "}
          · Extensão para o e-SUS PEC
        </p>
        <h1 className="mt-4 font-serif font-semibold text-3xl sm:text-4xl text-stone-950 leading-tight">
          Política de privacidade
        </h1>
        <p className="mt-3 text-stone-600">Atualizada em 6 de novembro de 2026.</p>

        <div className="mt-10 border-2 border-stone-900 bg-white divide-y-2 divide-stone-200">
          {sections.map((s) => (
            <section key={s.title} className="px-5 py-6 sm:px-7">
              <h2 className="font-serif font-semibold text-xl text-stone-950">{s.title}</h2>
              <div className="mt-3 space-y-3 text-stone-700 leading-relaxed [overflow-wrap:anywhere]">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

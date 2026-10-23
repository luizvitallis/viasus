# Extensão ViaSus para o e-SUS PEC

Abre o protocolo de encaminhamento do ViaSus dentro do PEC. Conforme o
profissional marca os itens, a extensão preenche o **Motivo do
encaminhamento** e marca a **Classificação de risco** com o maior risco
entre os itens marcados.

Funciona no Chrome e no Edge. Por enquanto atua só no PEC em
`http://localhost:8080` (PEC de treinamento).

## Instalar (piloto, sem loja)

1. Abra `chrome://extensions` (no Edge: `edge://extensions`).
2. Ligue o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha esta pasta `extension/`.
4. Clique no ícone da extensão e confira o endereço do ViaSus e o município
   (`caucaia-ce`). A lista mostra quais especialidades já têm protocolo.

Depois de alterar arquivos desta pasta, clique em **Recarregar** na
extensão e recarregue a aba do PEC.

## Para um protocolo aparecer no PEC

No editor do ViaSus, no protocolo de encaminhamento:

1. Preencha **Especialidade no e-SUS PEC** (ex.: `CONSULTA EM CARDIOLOGIA`).
2. Defina o **risco** de cada item (Eletivo/Azul, Prioritário/Verde,
   Urgência/Amarelo, Emergência/Vermelho).
3. **Publique**. A extensão usa sempre a versão publicada.

## Como se comporta

- Escolheu a especialidade no encaminhamento → abre o painel.
- Marcou itens → motivo e risco atualizados no formulário do PEC.
- Editou o motivo ou trocou o risco à mão → a extensão para de sobrescrever
  aquele campo e oferece voltar ao gerado.
- Risco Emergência → alerta para encaminhar à UPA / SAMU 192.
- Sem internet → usa a última cópia baixada dos protocolos.
- A extensão **não lê nem envia** dado do cidadão; só escreve nos campos.

## Arquivos

| Arquivo | Papel |
|---|---|
| `pec.js` | Tudo que depende do HTML do PEC (seletores dos campos). Atualização do PEC quebrou? É aqui. |
| `referral.js` | Gerador do motivo e do risco — cópia de `lib/referral.ts`. Mudou um, mude o outro e rode `pnpm test:extension`. |
| `panel.js` | Painel lateral (Shadow DOM). |
| `content.js` | Orquestra: detecta especialidade, sincroniza com o PEC. |
| `background.js` | Busca `/api/public/[tenant]/encaminhamentos` e guarda cópia offline. |
| `options.*` | Tela de configuração (endereço do ViaSus e município). |

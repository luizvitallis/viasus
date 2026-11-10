# Versões da extensão ViaSus PEC

Cada versão da extensão fica guardada aqui, em duas formas:

| Pasta | Para quê | Onde funciona |
|---|---|---|
| `loja/<versão>/viasus-pec-<versão>.zip` | Enviar à Chrome Web Store | Só no PEC de produção (`esus.caucaia.ce.gov.br`) |
| `pec/<versão>/` | Instalar direto no navegador ("Carregar sem compactação"), para testar e treinar | No PEC local de treinamento (`localhost:8080`) **e** no de produção |

As duas têm o mesmo código. A da pasta `pec` só libera também o endereço do
PEC local e aparece no navegador com o nome "(local + produção)".

Material de publicação na loja (textos, imagens, passo a passo):
`loja/PUBLICAR.md`.

## Histórico

| Versão | Data | O que mudou | Testada no PEC |
|---|---|---|---|
| 1.0.0 | 06/11/2026 | Primeira versão para a loja: PEC de produção, ícones, preenchimento do motivo sem derrubar o PEC, ativação em abas já abertas, risco pelo emoji do rótulo. | Produção (versão anterior à 5.6). Análise de compatibilidade com a 5.6 em 10/11/2026: nada quebrou (ver abaixo). |

## Compatibilidade com versões do e-SUS PEC

**PEC 5.6 (analisado em 10/11/2026, no PEC local de treinamento):** o
código do PEC foi comparado com o da versão em produção em tudo que a
extensão usa:

- campo Especialidade (`especialidadeSisreg`): igual;
- botões de Classificação de risco (`classificacaoRiscoEncaminhamento`,
  valores ELETIVO, PRIORITARIO, URGENCIA, EMERGENCIA): iguais;
- editor do Motivo do encaminhamento (Draft.js, rótulo, limite de 1000
  caracteres, tratamento de "colar"): igual.

A única mudança é o momento em que o PEC copia o texto do editor para o
formulário: antes era quando o editor perdia o foco (`blur`), agora é
quando o foco sai da área do editor (`focusout`). Testado com os dois
jeitos: o motivo escrito pela extensão chega ao formulário ao escrever,
trocar e apagar. **A versão 1.0.0 continua valendo para o PEC 5.6.**

Quando o PEC atualizar de novo, o que olhar primeiro é `extension/pec.js`:
é o único arquivo que depende do HTML do PEC.

## Gerar uma versão nova

1. Faça a mudança em `extension/` e aumente `version` em
   `extension/manifest.json` (ex.: `1.0.0` → `1.0.1`).
2. Na raiz do projeto, rode:
   `powershell -ExecutionPolicy Bypass -File versoes-extensao\empacotar.ps1`
3. O script cria `loja\<versão>\` e `pec\<versão>\`. Ele não sobrescreve
   uma versão já guardada.
4. Acrescente uma linha no **Histórico** acima.
5. Envie o `.zip` da pasta `loja` à Chrome Web Store (ver
   `loja/PUBLICAR.md`).

## Cuidado: uma versão por navegador

Não deixe a versão da loja e a da pasta `pec` ativas ao mesmo tempo no
mesmo navegador. No PEC de produção as duas abririam o painel e as duas
escreveriam no formulário. Em `chrome://extensions`, deixe só uma ligada.

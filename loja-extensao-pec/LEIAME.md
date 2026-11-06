# Publicar a extensão ViaSus PEC na Chrome Web Store

Tudo o que a loja pede está nesta pasta. Os textos abaixo já estão prontos
para copiar e colar nos campos do painel da loja.

## O que tem aqui

| Arquivo | Onde usar no painel da loja |
|---|---|
| `viasus-pec-1.0.0.zip` | **Pacote** → "Fazer upload de novo pacote" |
| `imagens/icone-128x128.png` | **Detalhes do item da loja** → Ícone da loja |
| `imagens/captura-1280x800.png` | **Detalhes do item da loja** → Capturas de tela |
| `imagens/bloco-promocional-440x280.png` | **Detalhes do item da loja** → Bloco promocional pequeno |
| `empacotar.ps1` | Gera um `.zip` novo quando a extensão mudar (ver final) |

A política de privacidade fica publicada no site do ViaSus:
**https://viasus.vercel.app/extensao/privacidade** (no ar depois que o PR
for mesclado na `main`).

---

## Passo a passo

### 1. Conta de desenvolvedor (uma vez só)

1. Acesse https://chrome.google.com/webstore/devconsole com a conta Google
   que vai ser dona da extensão. O ideal é uma conta institucional da SMS,
   não pessoal, para não depender de uma pessoa.
2. Aceite os termos e pague a taxa única de registro (US$ 5, no cartão).
3. Em **Conta**, preencha o nome do editor (ex.: "Secretaria Municipal de
   Saúde de Caucaia") e confirme o e-mail de contato. Esse e-mail aparece
   na página pública da extensão.

### 2. Enviar o pacote

1. Clique em **Novo item** e envie `viasus-pec-1.0.0.zip`.

### 3. Detalhes do item da loja

- **Descrição:** cole o texto da seção "Descrição" abaixo.
- **Categoria:** Ferramentas (Tools).
- **Idioma:** Português (Brasil).
- **Ícone, captura de tela e bloco promocional:** os arquivos da pasta `imagens/`.
- **Site oficial (opcional):** `https://viasus.vercel.app`

### 4. Práticas de privacidade

Use os textos da seção "Práticas de privacidade" abaixo.

### 5. Distribuição

- **Visibilidade: escolha "Não listado".** A extensão só funciona no PEC de
  Caucaia. Assim ela não aparece na busca da loja, mas qualquer pessoa com o
  link instala normalmente. Você distribui o link para as unidades.
- **Regiões:** Brasil.

### 6. Enviar para revisão

Clique em **Enviar para revisão**. A revisão do Google costuma levar de
alguns dias a algumas semanas. O e-mail da conta recebe o resultado. Se
recusarem, o e-mail diz o motivo; me mande o texto que eu ajusto.

### 7. Depois de aprovada

- Copie o link da página da extensão e distribua para as unidades.
- Para instalar: abrir o link no Chrome ou no Edge → **Usar no Chrome** /
  **Obter**.
- Quem estava com a versão de teste ("carregar sem compactação") deve
  **remover** a versão de teste em `chrome://extensions` antes, para não
  ficarem duas ativas.

---

## Textos para colar

### Nome (já vem do pacote)

ViaSus — Encaminhamento no e-SUS PEC

### Resumo (já vem do pacote)

Abre o protocolo de encaminhamento do ViaSus no e-SUS PEC e preenche o motivo e a classificação de risco conforme os itens marcados.

### Descrição

```
Extensão da Secretaria Municipal de Saúde de Caucaia (CE) para o e-SUS PEC do município.

Ao abrir um encaminhamento para serviço especializado no PEC e escolher a especialidade, a extensão mostra ao lado o protocolo de encaminhamento do ViaSus para aquela especialidade. Conforme o profissional marca as condições, sinais, sintomas e resultados de exame do paciente:

• o campo "Motivo do encaminhamento" é preenchido com um texto padronizado, já com os critérios do protocolo;
• a "Classificação de risco" é marcada com o maior risco entre os itens marcados (Eletivo, Prioritário, Urgência ou Emergência);
• situações de emergência mostram o alerta para encaminhar à UPA / SAMU 192.

O profissional continua no controle: se editar o motivo ou trocar o risco à mão, a extensão não sobrescreve e oferece voltar ao texto gerado.

Funciona sem internet com a última versão baixada dos protocolos.

Privacidade: a extensão não coleta, não guarda e não envia dado do cidadão nem do profissional. Ela só baixa do ViaSus os protocolos publicados pelo município (conteúdo público) e escreve nos campos de motivo e risco do formulário.

Funciona apenas no e-SUS PEC de Caucaia (esus.caucaia.ce.gov.br). Não é produto oficial do Ministério da Saúde nem do e-SUS APS.
```

### Práticas de privacidade

**Finalidade única (Single purpose):**

```
Mostrar, dentro do formulário de encaminhamento do e-SUS PEC de Caucaia, o protocolo de encaminhamento do ViaSus da especialidade escolhida e preencher os campos "Motivo do encaminhamento" e "Classificação de risco" conforme os itens que o profissional marca.
```

**Justificativa da permissão `storage`:**

```
Guarda a configuração da extensão (endereço do ViaSus e município) e uma cópia dos protocolos publicados, para o painel continuar funcionando se a internet da unidade de saúde cair. Nenhum dado de paciente é armazenado.
```

**Justificativa da permissão `scripting`:**

```
Ao instalar ou atualizar a extensão, ativa o painel nas abas do e-SUS PEC que já estavam abertas, sem obrigar o profissional a recarregar a página no meio de um atendimento.
```

**Justificativa das permissões de host:**

```
esus.caucaia.ce.gov.br: é o prontuário onde a extensão mostra o painel e preenche o motivo e a classificação de risco do encaminhamento. viasus.vercel.app: de onde a extensão baixa os protocolos de encaminhamento publicados pelo município (conteúdo público).
```

**Uso de código remoto:** marque **"Não, não estou usando código remoto"**.

**Uso de dados:** não marque nenhum tipo de dado coletado. A extensão não
coleta nem transmite dados do usuário. Marque as três declarações de
conformidade (não vende dados, não usa para fins alheios à finalidade
única, não usa para crédito).

**URL da política de privacidade:**

```
https://viasus.vercel.app/extensao/privacidade
```

---

## Sobre as imagens

- A captura de tela usa dados fictícios e um formulário ilustrativo, sem a
  marca do e-SUS. Se quiser uma captura do PEC real, tire no PEC de
  **produção com um cidadão fictício** ou no PEC de treinamento, em
  1280×800, **sem nenhum dado de paciente real visível**, porque a imagem
  fica pública na loja.
- A loja aceita até 5 capturas. Uma já basta para enviar.

## Publicar uma versão nova depois

1. Faça a mudança em `extension/` e aumente `version` em
   `extension/manifest.json` (ex.: `1.0.0` → `1.0.1`).
2. Na raiz do projeto, rode:
   `powershell -ExecutionPolicy Bypass -File loja-extensao-pec\empacotar.ps1`
3. No painel da loja → **Pacote** → envie o `.zip` novo → **Enviar para
   revisão**. Quem já tem a extensão instalada recebe a atualização
   sozinho.

# Como colocar a Íntima Graça no ar (passo a passo completo)

Guia do zero até vender, com o site na **Cloudflare (grátis)**, banco no **Supabase
(grátis)** e pagamento pelo **Mercado Pago**. Pensado para quem recebe como **pessoa
física (CPF)**.

> Ordem recomendada: **Parte 1 → 7**. Cada parte depende da anterior.
> Documentos irmãos: `PAGAMENTO-SETUP.md` (resumo técnico do pagamento) e
> `REVISAO-SEGURANCA-PAGAMENTO.md` (segurança).

---

## Parte 0 — Sobre vender com CPF (leia antes)

- O Mercado Pago **permite vender como pessoa física (CPF)**. Você recebe por Pix, cartão
  e boleto normalmente, sem precisar de CNPJ.
- Pode haver um **limite de valor a receber** até você **validar sua identidade** no app
  do Mercado Pago (enviar documento/selfie). Faça essa validação logo para liberar limites.
- O dinheiro recebido fica na sua conta Mercado Pago; você transfere para seu banco por
  Pix quando quiser. Confira **taxas e prazos** no painel deles (variam por método e prazo
  de recebimento).
- **Imposto:** venda digital como pessoa física conta como renda sua. Começar assim é ok;
  se o volume crescer, vale conversar com um contador sobre virar **MEI** (opcional, não é
  necessário para começar). Isto não é orientação jurídica/contábil.

Você vai precisar criar 3 contas gratuitas (se ainda não tem): **Supabase**, **Cloudflare**
e **Mercado Pago**. Opcional: **GitHub** (facilita o deploy e as atualizações).

---

## Parte 1 — Banco de dados (Supabase)

> **Você NÃO precisa criar um banco novo.** O projeto já usa um Supabase existente
> (`rkegombxusjkdveieqrw.supabase.co`, cujas chaves já estão em `site/js/supabase.js`).
> Use esse mesmo. Os passos abaixo são só para preparar o pagamento nele — nada é apagado
> nem migrado.

1. Entre no **supabase.com**, abra o **seu projeto atual**.
2. Vá em **SQL Editor → New query**, cole **todo** o conteúdo de `supabase/pagamento.sql`
   e clique **Run** (adiciona as colunas de pagamento à tabela `orders`, que já existe).
   - Se por acaso ainda não tiver rodado o `supabase/schema.sql` neste banco, rode ele
     primeiro; se já rodou antes, não precisa de novo (ele é idempotente).
3. Vá em **Project Settings → API** e copie a chave **service_role** (a secreta). Você
   provavelmente ainda não usou essa, porque o site só usa a `anon`. Ela vai **só** nas
   variáveis da Cloudflare (Parte 5) — **nunca** no site.
4. Confira em **Database → Tables** que a tabela `orders` tem as colunas `provider` e
   `provider_payment_id`.

> Só crie um projeto Supabase novo se estiver começando um site do zero. Nesse caso,
> depois de criá-lo, troque `SUPABASE_URL`/`SUPABASE_ANON_KEY` em `site/js/supabase.js` e
> atualize a `connect-src` da **CSP** (nos `.html` e no `site/_headers`) para o novo domínio.

---

## Parte 2 — Criar sua conta e virar administradora

1. Primeiro faça o **deploy** (Parte 4) ou rode o site localmente, para abrir
   `biblioteca.html` e **criar sua conta** (e-mail e senha).
2. Depois, no Supabase → **SQL Editor**, rode `supabase/definir-admin.sql` trocando
   `SEU-EMAIL-AQUI` pelo e-mail **exato** que você cadastrou.
3. A última linha do script deve listar **1 linha com o seu e-mail**. Pronto: só você é
   administradora e vê o painel (`admin.html`).

---

## Parte 3 — Conta e chaves do Mercado Pago (CPF)

1. Crie/entre em **mercadopago.com.br** com seus dados de **pessoa física (CPF)**.
2. No app, faça a **validação de identidade** (documento/selfie) para liberar limites de
   recebimento.
3. Acesse o **painel de desenvolvedores**: menu → *Seu negócio* → *Configurações* →
   *Gestão e desenvolvimento* → **Suas integrações** (ou acesse “Mercado Pago Developers”).
4. **Criar aplicação**: nome livre, produto **Checkout Pro / Pagamentos online**.
5. Em **Credenciais de produção**, copie o **Access Token** (`APP_USR-...`). É **secreto**.
6. Em **Webhooks → Configurar notificações** (aba **Produção**):
   - Evento: **Pagamentos**.
   - URL: `https://SEU-DOMINIO/api/webhook-mp` (preencha depois que tiver o domínio, Parte 4).
   - Salve. Copie a **Assinatura secreta** gerada → será o `MP_WEBHOOK_SECRET`.

> Para testar sem dinheiro real, o painel tem **Contas de teste** e o botão **Simular** em
> Webhooks. Pagamentos de teste não disparam webhook real — use o Simular.

---

## Parte 4 — Colocar o site no ar (Cloudflare Pages)

Você pode fazer por **GitHub** (recomendado: atualiza sozinho a cada commit) ou por
**upload manual**.

### Opção A — GitHub (recomendado)
1. Crie um repositório **privado** no GitHub e suba a pasta do projeto.
2. Em **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Selecione o repositório e configure:
   - **Root directory:** `site`
   - **Build command:** (vazio)
   - **Build output directory:** (vazio ou `/`)
4. **Save and Deploy**. Em 1–2 minutos você terá uma URL `https://SEU-PROJETO.pages.dev`.

### Opção B — Upload manual
1. Em **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Envie o conteúdo da pasta **`site/`** (a pasta `functions/` vai junto, dentro dela).

> **Importante (funções de pagamento):** a pasta `site/functions/` precisa ser reconhecida
> pela Cloudflare. Com **Root directory = `site`**, as rotas ficam:
> `/api/criar-pagamento` e `/api/webhook-mp`. Depois do deploy, teste abrir
> `https://SEU-DOMINIO/api/webhook-mp` no navegador — deve responder algo (não “404 página
> não encontrada do site”). Se der 404, revise o Root directory.

### Domínio próprio (opcional)
- Em **Custom domains**, aponte seu domínio. Use essa URL final em `SITE_URL` e no webhook.

---

## Parte 5 — Variáveis de ambiente na Cloudflare

No projeto Pages → **Settings → Environment variables → Production** (repita em *Preview*
se usar). Adicione exatamente estes nomes:

| Nome | Valor | Secret? |
| --- | --- | --- |
| `MP_ACCESS_TOKEN` | Access Token de produção (`APP_USR-...`) | **Sim** |
| `MP_WEBHOOK_SECRET` | Assinatura secreta do webhook | **Sim** |
| `SUPABASE_URL` | sua Project URL do Supabase | Não |
| `SUPABASE_ANON_KEY` | sua chave anon | Não |
| `SUPABASE_SERVICE_ROLE_KEY` | sua chave **service_role** | **Sim** |
| `SITE_URL` | `https://SEU-DOMINIO` (sem barra no fim) | Não |

Depois de salvar, faça um **novo deploy** (ou *Retry deployment*) para as variáveis valerem.

---

## Parte 6 — Cadastrar ebooks com preço

1. Entre em `admin.html` com sua conta de administradora.
2. **Novo ebook** → monte capa e páginas → defina **categoria** e **preço**.
   - **Preço vazio ou 0 = grátis** (botão “Obter grátis”).
   - **Preço > 0 = pago** (botão “Comprar”, vai ao Mercado Pago).
3. **Publique** o ebook (fica visível na loja).

---

## Parte 7 — Testar a venda de ponta a ponta

1. Abra a loja (`devocionais.html`), entre com uma conta de cliente e clique **Comprar**
   num ebook pago.
2. Pague (no teste, use Simular/cartões de teste; em produção, um valor baixo via Pix).
3. Confirme que:
   - o ebook aparece na **biblioteca** do cliente;
   - a venda aparece no **painel admin** (vendas e receita).
4. Se não entregar, veja os **logs da função** em Cloudflare → seu projeto → **Functions**
   (ou *Deployments → View details → Functions*), e confira: webhook configurado com a URL
   certa, `MP_WEBHOOK_SECRET` correto, e `pagamento.sql` aplicado.

---

## Checklist final de segurança (resumo)

Detalhes em `REVISAO-SEGURANCA-PAGAMENTO.md`. O essencial:

- [ ] `service_role` só nas variáveis da Cloudflare (nunca no site).
- [ ] Senha do banco forte e **fora de qualquer arquivo**.
- [ ] Supabase → **Attack Protection**: CAPTCHA (Turnstile, grátis) + rate limits.
- [ ] Supabase → **Email**: senha mínima 8 + proteção contra senhas vazadas + confirmação de e-mail.
- [ ] Supabase → **URL Configuration**: só o seu domínio real.
- [ ] **2FA** no Supabase, no Mercado Pago e no GitHub.
- [ ] Repositório do GitHub **privado**.
- [ ] Validar identidade no Mercado Pago (CPF) para liberar recebimentos.
- [ ] Backups diários no Supabase.

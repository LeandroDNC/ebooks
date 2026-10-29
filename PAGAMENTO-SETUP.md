# Pagamento (Mercado Pago) — como ligar

Integração de pagamento do Íntima Graça usando **Mercado Pago Checkout Pro**
(Pix + cartão + boleto), com funções de servidor no **Cloudflare Pages** e banco no
**Supabase** — tudo no plano gratuito. A API é grátis; o Mercado Pago cobra apenas uma
**taxa por venda** (percentual), sem mensalidade.

## Como o dinheiro vira "ebook na biblioteca"

```
Cliente clica "Comprar"
   → site chama  /api/criar-pagamento   (função no Cloudflare)
       → a função lê o PREÇO no banco e cria a cobrança no Mercado Pago
       → cliente paga na tela do Mercado Pago (Pix/cartão/boleto)
   → Mercado Pago chama  /api/webhook-mp  (função no Cloudflare)
       → a função confirma o pagamento e, com a chave de serviço, grava em
         `orders` (venda) e `user_library` (entrega o ebook)
   → o ebook aparece na biblioteca do cliente
```

O navegador **nunca** decide preço nem entrega. Por isso abrir o "Inspecionar" não
permite trapacear.

## Arquivos adicionados

| Arquivo | O que é |
| --- | --- |
| `site/functions/api/criar-pagamento.js` | Cria a cobrança no Mercado Pago |
| `site/functions/api/webhook-mp.js` | Recebe a confirmação e entrega o ebook |
| `site/js/checkout.js` | Liga o botão "Comprar" |
| `supabase/pagamento.sql` | Colunas de idempotência em `orders` |
| (editados) `site/js/components.js`, `site/js/account.js`, `site/index.html`, `site/devocionais.html` | botão "Comprar" e retomada após login |

---

## Passo 1 — Banco (Supabase)

1. Supabase → **SQL Editor** → cole o conteúdo de `supabase/pagamento.sql` → **Run**.
2. Confirme em **Database → Tables → orders** que existem as colunas `provider` e
   `provider_payment_id`.

> A tabela `orders` já existia (do `schema.sql`) e continua fechada ao cliente.

## Passo 2 — Conta e chaves do Mercado Pago

1. Crie/entre em uma conta em **mercadopago.com.br** (a conta que vai **receber**).
2. Vá em **Seu negócio → Configurações → Gestão e desenvolvimento → Suas integrações**
   e crie uma **aplicação** (tipo: pagamentos online / Checkout Pro).
3. Em **Credenciais de produção**, copie o **Access Token** (começa com `APP_USR-...`).
   - Esse token é **secreto**: nunca vai para o site, só nas variáveis do Cloudflare.
4. Em **Webhooks → Configurar notificações** (modo Produção):
   - Evento: **Pagamentos**.
   - URL: `https://SEU-DOMINIO/api/webhook-mp`
   - Salve. O Mercado Pago gera uma **Assinatura secreta** — copie, é o `MP_WEBHOOK_SECRET`.

## Passo 3 — Variáveis no Cloudflare Pages

No painel da Cloudflare → seu projeto Pages → **Settings → Environment variables →
Production** (e repita em Preview se usar). Adicione:

| Nome | Valor | Secret? |
| --- | --- | --- |
| `MP_ACCESS_TOKEN` | Access Token de produção (`APP_USR-...`) | **Sim** |
| `MP_WEBHOOK_SECRET` | Assinatura secreta do webhook | **Sim** |
| `SUPABASE_URL` | `https://rkegombxusjkdveieqrw.supabase.co` | Não |
| `SUPABASE_ANON_KEY` | a chave anon (a mesma de `js/supabase.js`) | Não |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave **service_role** do Supabase | **Sim** |
| `SITE_URL` | `https://SEU-DOMINIO` (sem barra no fim) | Não |

> A `service_role` fica em **Settings → API** no Supabase. Ela é a chave mais poderosa
> do banco: só existe aqui, no servidor. Nunca a coloque em `js/` nem no HTML.

## Passo 4 — Confirmar a estrutura do deploy no Cloudflare

Para a Cloudflare reconhecer as funções, a pasta `functions/` precisa estar na **raiz do
projeto publicado**. Como você publica a pasta `site/`:

- No projeto Pages → **Settings → Builds & deployments**:
  - **Root directory (diretório raiz):** `site`
  - **Build command:** (vazio)
  - **Build output directory:** (vazio ou `/`)
- Assim, o Cloudflare serve `site/` como o site e detecta `site/functions/` como funções.
  As rotas ficam: `site/functions/api/criar-pagamento.js` → `/api/criar-pagamento`.

> Se você faz *upload manual* da pasta `site/`, não precisa mexer em nada: a pasta
> `functions/` já vai dentro de `site/`.

## Passo 5 — Testar

1. Em **Suas integrações → Contas de teste**, crie um **comprador de teste** e use as
   credenciais de teste para um primeiro ensaio (pagamentos de teste **não** disparam
   webhook real — use o botão **Simular** no painel de Webhooks para testar a entrega).
2. Com as credenciais de **produção**, faça uma compra real de valor baixo (ex.: R$ 1,00)
   via Pix e confirme que:
   - o ebook aparece na **biblioteca**;
   - a venda aparece no **painel admin** (`admin.html`), em vendas/receita.

## Importante

- **Defina um preço** nos ebooks no editor admin. Ebook com preço vazio ou 0 continua
  sendo tratado como **grátis** (entra pelo botão "Obter grátis"), não pelo pagamento.
- O ícone de carrinho no topo virou enfeite (a compra é 1 ebook por vez, direto). Se
  quiser, dá para removê-lo depois — me avise.
- Taxas e prazos de recebimento do Pix/cartão você acompanha no painel do Mercado Pago.

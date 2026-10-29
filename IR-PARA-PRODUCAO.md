# Ir para produção — receber pagamentos de verdade

Passo a passo para virar a chave de **teste → produção** no pagamento da Íntima Graça.
Depois disto, cartão e Pix **reais** funcionam e o dinheiro cai na sua conta Mercado Pago (CPF).

> O que muda: são **3 chaves** no Cloudflare (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`,
> `MP_WEBHOOK_SECRET`). A parte de código **não muda nada** — já está pronta.

---

## Passo 0 — Pré-requisitos (uma vez)

1. **Validar sua identidade** no app do Mercado Pago (documento + selfie). Sem isso, o
   recebimento como pessoa física (CPF) pode ficar travado/limitado.
2. Conta Mercado Pago ativa e com os dados bancários/chave Pix para saque.

---

## Passo 1 — Credenciais de produção (Mercado Pago)

1. Entre no painel de desenvolvedores → sua aplicação **App-Checkout-Pro-...**.
2. No menu esquerdo, clique em **"Credenciais de produção"**.
   - Se aparecer um formulário pedindo dados do negócio (categoria, site, etc.), preencha
     e ative as credenciais de produção.
3. Copie e guarde num bloco de notas (NÃO cole no chat nem em arquivos do site):
   - **Access Token de produção** (`APP_USR-...`)
   - **Public Key de produção** (`APP_USR-...`)

---

## Passo 2 — Webhook de produção (Mercado Pago)

1. Menu **Webhooks** → aba **"Modo de produção"**.
2. **URL:** `https://ebooks-dxs.pages.dev/api/webhook-mp`
3. Evento: marque **Pagamentos** → **Salvar**.
4. Copie a **assinatura secreta de produção** gerada → guarde.

> É uma assinatura **diferente** da de teste. A de produção é a que vale agora.

---

## Passo 3 — Atualizar as 3 variáveis no Cloudflare

Cloudflare → projeto **ebooks** → **Configurações → Variáveis e segredos**.
Para cada uma, clique no lápis (editar) e troque o valor:

| Variável | Novo valor | Tipo |
| --- | --- | --- |
| `MP_ACCESS_TOKEN` | Access Token de **produção** | Segredo |
| `MP_PUBLIC_KEY` | Public Key de **produção** | Texto |
| `MP_WEBHOOK_SECRET` | assinatura secreta de **produção** | Segredo |

As outras (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`)
**continuam iguais**. Clique em **Salvar**.

> Dica: confira que não ficou nenhum espaço em branco no começo/fim ao colar.

---

## Passo 4 — Reimplantar (publicar)

Variável nova só vale no próximo deploy:

1. Cloudflare → **ebooks → Implantações**.
2. Clique em **"Criar implantação"** → branch **`main`** → confirmar.
   (Ou ⋯ na última implantação → "Repetir implantação".)
3. Espere o **✓ success**.

---

## Passo 5 — Testar com cartão real

1. Abra a loja → entre na sua conta → **Comprar** um ebook de valor baixo
   (ex.: deixe o "7 dias de oração e Palavra" em **R$ 2,99** ou menos).
2. Na tela de pagamento (faça **Ctrl + Shift + R** antes), escolha **Cartão** e pague com
   seu cartão real — ou escolha **Pix** e pague pelo app do banco.
3. Confirme:
   - ✅ O ebook aparece na sua **biblioteca**.
   - ✅ A venda aparece no **painel admin** (`admin.html`), em vendas/receita.
4. Se quiser, **reembolse** esse teste depois pelo painel do Mercado Pago (Atividade →
   o pagamento → Reembolsar).

---

## Checklist final

- [ ] Identidade validada no Mercado Pago (CPF)
- [ ] `MP_ACCESS_TOKEN` = produção
- [ ] `MP_PUBLIC_KEY` = produção
- [ ] `MP_WEBHOOK_SECRET` = assinatura de produção (webhook em "Modo de produção")
- [ ] Deploy refeito (✓ success)
- [ ] Compra real de teste entregue na biblioteca
- [ ] Venda apareceu no painel admin

## Depois de estar no ar

- **Preços reais:** defina o preço de cada ebook no editor admin (ebook com preço vazio/0
  continua sendo grátis).
- **Taxas e saque:** acompanhe taxas por método e prazo de recebimento no painel do
  Mercado Pago; transfira para seu banco por Pix quando quiser.
- **Segurança:** veja `REVISAO-SEGURANCA-PAGAMENTO.md` (CAPTCHA, 2FA, senha do banco, etc.).
- **Impostos:** venda como pessoa física conta como sua renda; se o volume crescer, vale
  falar com um contador sobre MEI (opcional).

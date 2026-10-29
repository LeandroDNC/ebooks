# Revisão de segurança — Íntima Graça (site + app + pagamento)

Varredura feita em 29/10/2026, cobrindo o código do site, o app (PWA), o banco
(Supabase/RLS) e a nova integração de pagamento (Mercado Pago + Cloudflare Functions).
Também comparada com listas atuais de erros comuns em apps Supabase.

**Veredito:** a base está bem feita. A segurança está no lugar certo — **no servidor**
(RLS + funções + webhook), não em esconder código. O que falta é quase tudo
**configuração de painel** (Supabase e Mercado Pago), não código.

---

## 1. Por que abrir o "Inspecionar" (F12) NÃO permite burlar o sistema

Você pediu para bloquear o inspetor. Vou ser honesto: **não existe como bloquear o F12
de verdade** — qualquer bloqueio (F12, botão direito, `debugger` em loop) é contornado em
segundos, atrapalha quem é legítimo, prejudica acessibilidade e pode quebrar o PWA. Não é
proteção, é teatro. O próprio `SEGURANCA-E-ESCALA.md` de vocês já tinha decidido isso, e
está certo.

O que importa é que, com a arquitetura atual, **abrir o Inspecionar não serve para
trapacear**. Veja cada tentativa e por que falha:

| Tentativa de burla pelo navegador | Por que NÃO funciona |
| --- | --- |
| Se dar um ebook pago de graça | O cliente não tem permissão de `INSERT` em `user_library` (revogada). Só o servidor grava, pelo webhook. |
| Mudar o preço antes de pagar | O preço é lido **no servidor**, do banco, na hora de criar a cobrança. O que o navegador enviar é ignorado. |
| Ler um ebook que não comprou | `book_content` tem RLS: só a administradora **ou quem tem o livro na biblioteca** lê o conteúdo. |
| Virar administrador | `admin_users` é uma tabela fechada, sem política de `INSERT` para o cliente. Ninguém se promove pelo navegador. |
| Forjar uma confirmação de pagamento | O webhook valida a assinatura `x-signature` do Mercado Pago **e** reconsulta o pagamento direto na API deles. Notificação falsa é recusada. |
| Repetir a notificação para contar venda 2x | Idempotência: `orders` tem índice único no id do pagamento; a 2ª gravação é ignorada. |
| Alterar catálogo/conteúdo | Só a administradora grava (`books`/`book_content`), e um gatilho no banco valida o formato. |
| SQL injection | Consultas parametrizadas (PostgREST) e funções tipadas. Não há SQL montado por texto. |

**O que continua visível no navegador (inevitável, e tudo bem):** o HTML/CSS/JS, a chave
`anon` (pública por design) e o **texto de um livro que a pessoa comprou** (quem lê pode
copiar o que vê — vale para qualquer site de leitura). Isso não é falha; é como a web
funciona. Dá para *dificultar* a cópia casual (minificar o código, imagens não-arrastáveis
— já feito), mas nunca impedir um atacante decidido. Não vale gastar esforço nisso.

---

## 2. Pagamento — o que já ficou seguro no código entregue

- ✅ **Preço vem do banco** no servidor (nunca do navegador).
- ✅ **Comprador autenticado**: a função valida o token da sessão no servidor antes de criar a cobrança.
- ✅ **Entrega só no webhook**, com `service_role`, após confirmar o pagamento na API do Mercado Pago.
- ✅ **Assinatura `x-signature` validada** (HMAC-SHA256, comparação em tempo constante). Sem o segredo configurado, o webhook recusa.
- ✅ **Idempotente**: pagamento repetido não duplica venda nem entrega.
- ✅ **Não recobra** quem já tem o livro.

---

## 3. O que VOCÊ precisa ativar (painel — não dá por código)

Estas são as proteções que faltam e que **não** moram no código. São o grosso do risco real.

### Mercado Pago
1. Configurar o **webhook em produção** e guardar a **assinatura secreta** (`MP_WEBHOOK_SECRET`). Sem ela, a entrega não acontece — é proposital.
2. Guardar o **Access Token de produção** só nas variáveis do Cloudflare (nunca no site).
3. Ativar **2FA** na conta que recebe.

### Supabase (Authentication)
4. **Attack Protection → CAPTCHA** (Turnstile da Cloudflare é grátis). Barra cadastro/login automatizado.
5. **Rate Limits** baixos para cadastro, login e e-mail.
6. **Proteção contra senhas vazadas** ligada, e **senha mínima de 8 caracteres** (hoje o site aceita 6 — veja item 7 abaixo).
7. **Confirmação de e-mail** obrigatória antes do primeiro acesso.
8. **URL Configuration:** só o domínio real em *Site URL* e *Redirect URLs* (remova IPs e endereços de teste).
9. **Girar a senha do banco** (o `SEGURANCA-E-ESCALA.md` avisa que foi compartilhada no chat) e tirá-la de qualquer arquivo.
10. **2FA** na conta Supabase e no GitHub; repositório **privado** com *Secret scanning* e *Push protection*.
11. **Backups diários** (e PITR, se o plano permitir).

### Conferir o administrador
12. Rode `supabase/definir-admin.sql` com o **seu** e-mail e confirme que `admin_users` tem **exatamente 1 linha, a sua**. (O banco não promove ninguém sozinho; mesmo assim, confira.)

---

## 4. Ajustes pequenos de código (opcionais, recomendados)

- **Senha mínima 6 → 8** em `js/account.js` (texto e `minlength`), para casar com o Supabase. Baixo impacto, mas evita senhas fracas.
- **Service worker**: hoje ele pode guardar o "esqueleto" de `biblioteca.html`/`ler.html` no cache do aparelho. Não há dado de usuário nesses arquivos (o conteúdo vem do Supabase em tempo real, e esse tráfego o SW ignora), então é inofensivo — mas, se quiser higiene extra, dá para excluí-los do cache.
- **Minificar** JS/CSS ao publicar: reduz tamanho e dificulta leitura casual do código. Não é segurança, é acabamento.
- **`img-src https:` e `style-src 'unsafe-inline'`** na CSP são necessários (imagens por link e estilos inline do editor). O risco de injeção está neutralizado porque o banco só aceita cores em hex e imagens `https://`, e o front escapa todo texto. Sem ação obrigatória.

---

## 5. O que já estava certo (não mexer)

RLS ligada em todas as tabelas; permissões mínimas por papel; `orders` e `admin_users`
fechados ao cliente; conteúdo de livro só para dono/admin; validação do conteúdo no banco
por gatilho; `statement_timeout` por papel; teto de 500 itens por biblioteca; CSP sem
`eval` e sem script externo além do jsDelivr; cabeçalhos de segurança (HSTS, nosniff,
frame DENY, Permissions-Policy); páginas sensíveis com `no-store` e admin com `noindex`;
imagens não-arrastáveis; console silenciado em produção.

---

### Prioridade, em ordem
1. Itens 1–3 (Mercado Pago) e 9 (girar senha do banco) — **antes de vender**.
2. Itens 4–8 (Attack Protection do Supabase) — **antes de divulgar o site**.
3. Itens 10–12 e os ajustes da seção 4 — assim que der.

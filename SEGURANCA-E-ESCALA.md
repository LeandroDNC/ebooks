# Íntima Graça — Segurança e escala

Este documento resume o que foi feito no projeto e o que ainda depende do painel do Supabase e da hospedagem.

## 1. Estrutura de publicação

- **Publique somente a pasta `site/`** (ela é a raiz do site).
- Ficam **fora** da pasta pública: `supabase/schema.sql` (esquema e políticas do banco) e `.env.example`.
- `site/_headers` (Cloudflare Pages / Netlify) aplica os cabeçalhos de segurança em produção.

## 2. Banco de dados: o que foi feito para aguentar muitos usuários

| Antes | Agora |
| --- | --- |
| Cada visita à vitrine consultava o banco | Catálogo em cache de 5 min no navegador, consulta única em andamento e limite de 120 itens |
| Abrir um livro fazia 3 consultas | **1 chamada** (`abrir_livro`): dados, conteúdo e progresso |
| "Minha conta" fazia 2 consultas | **1 chamada** (`minha_biblioteca`), com junção no banco |
| Progresso gravado a cada página | Gravado a cada 10 pontos, no mínimo a cada 20 s, e ao terminar ou sair |
| Admin = busca na tabela de usuários inteira, repetida por linha | Tabela `admin_users` (chave primária) e `(select is_admin())` avaliado uma vez por consulta |
| Sem índices para a vitrine | Índices parciais em `books` (publicados) |
| Sem limites de tamanho | Limites de título, autoria, preço, conteúdo (2 MB) e biblioteca (500 itens) |

Compatibilidade: se o SQL novo ainda não foi aplicado, o site continua funcionando no modo antigo (mais consultas, mas sem erro).

### Como aplicar
1. Supabase → **SQL Editor** → cole `supabase/schema.sql` inteiro → **Run** (pode repetir).
2. Confira em **Database → Tables** que `admin_users` existe e tem 1 linha (a primeira conta criada).

### O que isso NÃO garante sozinho
- "200 mil usuários" depende do **plano e do tamanho do banco** no Supabase (CPU, memória, conexões). O código reduz as consultas, mas não substitui o dimensionamento.
- Para picos grandes: use um plano com mais recursos, ative o pooler de conexões e, se a vitrine for muito acessada, publique o catálogo como arquivo estático (JSON gerado ao publicar um livro), servido por CDN.
- Sem teste de carga ainda. Antes do lançamento, rode um teste (k6 ou similar) contra um projeto de homologação.

## 3. Segurança

### Já aplicado no código
- **Nada secreto no navegador**: o site usa só a chave `anon` (pública por design). Não há `service_role` nem senha do banco em nenhum arquivo.
- **Regras no servidor (RLS)**: nada é decidido pelo navegador.
  - Vitrine: só livros publicados.
  - Conteúdo dos livros: só administradora e quem tem o livro.
  - Biblioteca: cada pessoa só enxerga e atualiza a própria linha (apenas `progress`).
  - Livros gratuitos entram por função segura, com teto por biblioteca.
- **Conteúdo do banco nunca entra cru na página**: cores, alinhamentos, estilos e URLs são validados antes de virar HTML ou CSS.
- **CSP** em todas as páginas (scripts só do próprio site e do jsDelivr; conexões só ao Supabase), sem scripts inline.
- **Console em produção**: mensagens internas são silenciadas fora do localhost.
- **Imagens**: não arrastáveis nem selecionáveis; só links http(s) são aceitos como imagem.
- **Páginas sensíveis** (admin, leitor, conta): `Cache-Control: no-store`; admin com `noindex`.
- **Mensagens de erro genéricas**: não revelam nomes de tabelas, funções ou caminhos.
- Rascunhos de testes (`?dev=1`, `?demo=1`) só funcionam em `localhost`.

### Precisa ser feito por você (painel do Supabase)
1. **Girar a senha do banco**: ela foi compartilhada no chat. *Project Settings → Database → Reset password*.
2. *Authentication → Providers → Email*: senha mínima de 8 caracteres e **proteção contra senhas vazadas** (se o plano tiver).
3. *Authentication → Attack Protection*: ativar **CAPTCHA** (Turnstile ou hCaptcha) e rever os **limites de taxa** (login, cadastro, e-mail).
4. *Authentication → URL Configuration*: manter em *Redirect URLs* apenas o domínio real do site (remova endereços de teste e IPs).
5. Conta da administradora: ativar **autenticação em dois fatores** (provedor de e-mail/Google) e usar senha forte e única.
6. *Database → Backups*: manter backups diários (e PITR, se possível).
7. *Storage*: os buckets `book-covers` e `book-pages` não são mais usados; as políticas foram removidas. Pode apagá-los pelo painel.

### Limites que vale conhecer (não é possível "esconder")
- **Tudo que o navegador recebe pode ser visto** em "Inspecionar" (HTML, CSS, JavaScript, requisições). Isso vale para qualquer site. Por isso a segurança está no servidor (RLS) e não em esconder código.
- **Bloquear F12, clique direito ou o Inspecionar** não dá segurança real (é contornável em segundos) e prejudica pessoas legítimas. Não foi aplicado.
- O leitor entrega o texto do livro ao navegador de quem comprou: a pessoa consegue ver ou copiar o que leu. Isso é inerente à leitura online.
- Para dificultar a leitura do código, é possível **minificar** os arquivos no momento da publicação. Isso reduz o tamanho, mas não é proteção.
- A biblioteca `supabase-js` é carregada do jsDelivr. O mais seguro é **hospedá-la no próprio site** (arquivo local, versão fixa). Faltam sua autorização para baixar o arquivo.

## 4. Nome da marca
Todas as ocorrências de "LIZIVIDA" viraram **Íntima Graça**: títulos, textos, logo (`assets/logo-intima-graca.svg`), páginas legais, esquema do banco, chaves de armazenamento (`intimagraca:*`, com migração automática das antigas).

## Painel do administrador
- `admin.html` = painel (indicadores e graficos); `admin-ebook.html` = editor. Rode `supabase/schema.sql` de novo: cria `books.published_at`, a tabela `orders` (so o servidor grava, via webhook de pagamento com chave de servico) e a funcao `admin_dashboard()` (so a administradora executa).
- Sem a tabela `orders` alimentada, vendas e receita aparecem zeradas; o ranking usa os ebooks mais obtidos gratis.


## Varredura de segurança (outubro/2026)

**Princípio:** o navegador nunca é confiável. Tudo que importa é validado e autorizado no banco.

- **SQL injection:** o site não monta SQL por texto. Todas as consultas passam por supabase-js/PostgREST (parametrizadas) e funções SQL com argumentos tipados. Testado contra o projeto real: payloads `' OR '1'='1` e `UNION SELECT` retornam vazio.
- **Quem pode o quê (RLS + permissões):** visitante só lê livros publicados; `user_library`, `admin_users`, `orders` e `book_content` ficam fechados; só a administradora grava livros; o cliente não consegue inserir na biblioteca nem criar pedidos (só funções do servidor).
- **Validação no banco:** `supabase/schema.sql` (bloco "VARREDURA DE SEGURANCA") valida o formato de `books` e o JSON do ebook (tipos de bloco, cores, textos até 6000 caracteres, até 200 páginas, imagens só `https://`) com um gatilho que recusa o que fugir das regras, mesmo que alguém adultere o editor.
- **Funções:** visitante só executa `is_admin`; as demais exigem login. Novas funções já nascem fechadas.
- **Limites:** tempo máximo por consulta (8 s visitante, 15 s logado), teto de 500 itens por biblioteca, progresso de 0 a 100.
- **Front-end:** todo texto vindo do banco é escapado antes de ir para a página; links de imagem passam por `safeUrl`; preferências salvas no navegador são saneadas ao ler; a CSP bloqueia scripts externos e `eval`.
- **Administradora:** definida por e-mail em `supabase/definir-admin.sql` (ninguém "chega primeiro" e assume o painel).

### Ações no painel do Supabase (não dá para fazer por SQL)
1. Authentication > Rate Limits: manter limites baixos de cadastro/login por hora.
2. Authentication > Attack Protection: ativar **CAPTCHA** (Turnstile da Cloudflare é gratuito).
3. Authentication > Sign In / Providers > Email: senha mínima de 8 caracteres.
4. Authentication > URL Configuration: só o domínio oficial em Site URL e Redirect URLs.
5. Conta Supabase e GitHub com 2FA; senha do banco trocada e fora de qualquer arquivo.
6. Repositório do GitHub privado, com Secret scanning e Push protection ligados.

## App instalável (PWA)
- `manifest.webmanifest`, `sw.js`, `offline.html`, `js/app.js` e `css/app.css`.
- O popup de instalação aparece nas páginas públicas (Android, Windows/desktop e iOS) e volta depois de 14 dias se for dispensado.
- Instalado, o app mostra só **Loja** e **Biblioteca** (sem o site de divulgação).
- O service worker usa rede primeiro, ignora Supabase e outros domínios e nunca guarda páginas do admin.

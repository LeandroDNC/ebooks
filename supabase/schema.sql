-- Íntima Graça — esquema mínimo do banco.
-- Cole no Supabase: SQL Editor > New query > Run.
-- Pode ser executado várias vezes (é idempotente).
--
-- Decisões para usar o mínimo do banco:
--  * Sem tabela "profiles": o nome fica em auth.users (user_metadata.full_name).
--  * Sem tabela "ebooks": o catálogo continua em js/data.js.
--  * Uma única tabela: user_library (o que o usuário comprou + progresso de leitura).

create table if not exists public.user_library (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ebook_id   text not null,
  progress   smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, ebook_id)
);

alter table public.user_library enable row level security;

-- Permissões: o usuário só lê as próprias linhas e só altera o progresso.
-- INSERT/DELETE ficam apenas para o servidor (service_role), usado pelo checkout futuro.
revoke all on table public.user_library from anon, authenticated;
grant select on table public.user_library to authenticated;
grant update (progress) on table public.user_library to authenticated;

drop policy if exists "ler propria biblioteca" on public.user_library;
create policy "ler propria biblioteca" on public.user_library for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "atualizar proprio progresso" on public.user_library;
create policy "atualizar proprio progresso" on public.user_library for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Para testar o painel (troque o UUID pelo id do seu usuário em Authentication > Users):
-- insert into public.user_library (user_id, ebook_id, progress)
-- values ('00000000-0000-0000-0000-000000000000', '1', 40);


-- =====================================================================
-- ADMIN + EBOOKS (editor de ebooks em admin.html)
-- Admin = a PRIMEIRA conta criada no projeto (hoje, o único usuário).
-- Tabelas: books (vitrine, pública), book_content (páginas; só admin e quem comprou).
-- Imagens: bucket público "book-covers" (capas) e privado "book-pages" (páginas).
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and (select auth.uid()) = (select id from auth.users order by created_at asc limit 1);
$$;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.books (
  id         text primary key,
  title      text not null,
  author     text not null default '',
  category   text not null default '',
  price      numeric(10,2),
  color      text not null default '#344E41',
  cover_url  text,
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_content (
  book_id    text primary key references public.books (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.books enable row level security;
alter table public.book_content enable row level security;

grant select on public.books to anon, authenticated;
grant insert, update, delete on public.books to authenticated;
grant select, insert, update, delete on public.book_content to authenticated;

drop policy if exists "ver livros publicados ou admin" on public.books;
create policy "ver livros publicados ou admin" on public.books
  for select to anon, authenticated
  using (published or public.is_admin());
drop policy if exists "admin cria livros" on public.books;
create policy "admin cria livros" on public.books
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admin edita livros" on public.books;
create policy "admin edita livros" on public.books
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin apaga livros" on public.books;
create policy "admin apaga livros" on public.books
  for delete to authenticated using (public.is_admin());

drop policy if exists "conteudo: admin ou comprador" on public.book_content;
create policy "conteudo: admin ou comprador" on public.book_content
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.user_library ul
      where ul.user_id = (select auth.uid()) and ul.ebook_id = book_content.book_id
    )
  );
drop policy if exists "admin cria conteudo" on public.book_content;
create policy "admin cria conteudo" on public.book_content
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admin edita conteudo" on public.book_content;
create policy "admin edita conteudo" on public.book_content
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin apaga conteudo" on public.book_content;
create policy "admin apaga conteudo" on public.book_content
  for delete to authenticated using (public.is_admin());

-- Storage
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true), ('book-pages', 'book-pages', false)
on conflict (id) do nothing;

drop policy if exists "capas: leitura publica" on storage.objects;
create policy "capas: leitura publica" on storage.objects
  for select to public using (bucket_id = 'book-covers');
drop policy if exists "capas: admin escreve" on storage.objects;
create policy "capas: admin escreve" on storage.objects
  for insert to authenticated with check (bucket_id = 'book-covers' and public.is_admin());
drop policy if exists "capas: admin atualiza" on storage.objects;
create policy "capas: admin atualiza" on storage.objects
  for update to authenticated using (bucket_id = 'book-covers' and public.is_admin());
drop policy if exists "capas: admin apaga" on storage.objects;
create policy "capas: admin apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'book-covers' and public.is_admin());

drop policy if exists "paginas: admin ou comprador le" on storage.objects;
create policy "paginas: admin ou comprador le" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'book-pages'
    and (
      public.is_admin()
      or exists (
        select 1 from public.user_library ul
        where ul.user_id = (select auth.uid()) and ul.ebook_id = (storage.foldername(name))[1]
      )
    )
  );
drop policy if exists "paginas: admin escreve" on storage.objects;
create policy "paginas: admin escreve" on storage.objects
  for insert to authenticated with check (bucket_id = 'book-pages' and public.is_admin());
drop policy if exists "paginas: admin atualiza" on storage.objects;
create policy "paginas: admin atualiza" on storage.objects
  for update to authenticated using (bucket_id = 'book-pages' and public.is_admin());
drop policy if exists "paginas: admin apaga" on storage.objects;
create policy "paginas: admin apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'book-pages' and public.is_admin());


-- =====================================================================
-- LIVROS GRATUITOS: sem preço (ou preço 0) = "Free". Qualquer usuário logado
-- pode adicioná-los à própria biblioteca, por uma função segura (o cliente
-- NÃO recebe permissão de INSERT na tabela).
-- =====================================================================
drop policy if exists "adquirir livro gratuito" on public.user_library;
revoke insert on public.user_library from authenticated;

create or replace function public.obter_livro_gratis(p_ebook_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para obter este ebook.' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.books b
    where b.id = p_ebook_id and b.published and (b.price is null or b.price = 0)
  ) then
    raise exception 'Este ebook não é gratuito.' using errcode = '42501';
  end if;
  insert into public.user_library (user_id, ebook_id)
  values ((select auth.uid()), p_ebook_id)
  on conflict (user_id, ebook_id) do nothing;
end;
$$;

revoke all on function public.obter_livro_gratis(text) from public, anon;
grant execute on function public.obter_livro_gratis(text) to authenticated;


-- =====================================================================
-- ESCALA E ENDURECIMENTO (pensado para centenas de milhares de usuários)
-- Pode ser executado várias vezes.
--
-- Princípios:
--  * Toda checagem de permissão em RLS usa (select ...) para virar InitPlan:
--    roda UMA vez por consulta, não uma vez por linha.
--  * Admin fica em tabela própria (busca por chave primária), sem varrer auth.users.
--  * Telas que precisavam de 2-4 consultas passam a usar UMA função (menos viagens).
--  * Índices parciais para o que é lido o tempo todo (livros publicados).
--  * Limites de tamanho nos dados gravados por clientes.
-- =====================================================================

-- 1) Administradora(s): tabela fechada para o cliente
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;

-- semeia com a PRIMEIRA conta criada (a administradora atual); não altera se já existir
insert into public.admin_users (user_id)
select id from auth.users order by created_at asc limit 1
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Políticas com InitPlan (is_admin avaliado uma vez por consulta)
drop policy if exists "ver livros publicados ou admin" on public.books;
create policy "ver livros publicados ou admin" on public.books
  for select to anon, authenticated
  using (published or (select public.is_admin()));

drop policy if exists "admin cria livros" on public.books;
create policy "admin cria livros" on public.books
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "admin edita livros" on public.books;
create policy "admin edita livros" on public.books
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "admin apaga livros" on public.books;
create policy "admin apaga livros" on public.books
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "conteudo: admin ou comprador" on public.book_content;
create policy "conteudo: admin ou comprador" on public.book_content
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.user_library ul
      where ul.user_id = (select auth.uid()) and ul.ebook_id = book_content.book_id
    )
  );

drop policy if exists "admin cria conteudo" on public.book_content;
create policy "admin cria conteudo" on public.book_content
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "admin edita conteudo" on public.book_content;
create policy "admin edita conteudo" on public.book_content
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "admin apaga conteudo" on public.book_content;
create policy "admin apaga conteudo" on public.book_content
  for delete to authenticated using ((select public.is_admin()));

-- 3) Storage não é mais usado (imagens entram por link): remove as políticas para reduzir a superfície
drop policy if exists "capas: leitura publica" on storage.objects;
drop policy if exists "capas: admin escreve" on storage.objects;
drop policy if exists "capas: admin atualiza" on storage.objects;
drop policy if exists "capas: admin apaga" on storage.objects;
drop policy if exists "paginas: admin ou comprador le" on storage.objects;
drop policy if exists "paginas: admin escreve" on storage.objects;
drop policy if exists "paginas: admin atualiza" on storage.objects;
drop policy if exists "paginas: admin apaga" on storage.objects;

-- 4) Índices para as leituras mais frequentes (vitrine pública)
create index if not exists books_publicados_idx on public.books (updated_at desc) where published;
create index if not exists books_categoria_idx on public.books (category) where published;
-- user_library já tem PK (user_id, ebook_id): cobre "minha biblioteca" e as checagens de RLS.

-- 5) Limites de tamanho (NOT VALID: não varre linhas antigas; vale para novas gravações)
alter table public.books drop constraint if exists books_tamanhos;
alter table public.books add constraint books_tamanhos check (
  char_length(id) <= 64
  and char_length(title) between 1 and 200
  and char_length(author) <= 200
  and char_length(category) <= 80
  and (price is null or price between 0 and 99999)
) not valid;

alter table public.book_content drop constraint if exists book_content_tamanho;
alter table public.book_content add constraint book_content_tamanho
  check (pg_column_size(data) <= 2000000) not valid;

alter table public.user_library drop constraint if exists user_library_ebook_id_tam;
alter table public.user_library add constraint user_library_ebook_id_tam
  check (char_length(ebook_id) <= 64) not valid;

-- 6) Abrir um livro em UMA chamada: meta + conteúdo + progresso (respeita RLS: security invoker)
create or replace function public.abrir_livro(p_id text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'meta', (
      select to_jsonb(m) from (
        select b.id, b.title, b.published, (b.price is null or b.price = 0) as gratis
        from public.books b where b.id = p_id
      ) m
    ),
    'conteudo', (select c.data from public.book_content c where c.book_id = p_id),
    'progresso', (
      select ul.progress from public.user_library ul
      where ul.ebook_id = p_id and ul.user_id = (select auth.uid())
    )
  );
$$;
revoke all on function public.abrir_livro(text) from public, anon;
grant execute on function public.abrir_livro(text) to authenticated;

-- 7) Minha biblioteca em UMA chamada (junta livros + progresso; só linhas do próprio usuário)
create or replace function public.minha_biblioteca()
returns table (ebook_id text, progress smallint, title text, author text, color text, cover_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select ul.ebook_id, ul.progress, b.title, b.author, b.color, b.cover_url
  from public.user_library ul
  left join public.books b on b.id = ul.ebook_id
  where ul.user_id = (select auth.uid())
  order by ul.created_at desc
  limit 500;
$$;
revoke all on function public.minha_biblioteca() from public, anon;
grant execute on function public.minha_biblioteca() to authenticated;

-- 8) Obter livro gratuito: com teto por biblioteca (evita abuso/automação)
create or replace function public.obter_livro_gratis(p_ebook_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para obter este ebook.' using errcode = '28000';
  end if;
  if p_ebook_id is null or char_length(p_ebook_id) > 64 then
    raise exception 'Ebook inválido.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.books b
    where b.id = p_ebook_id and b.published and (b.price is null or b.price = 0)
  ) then
    raise exception 'Este ebook não é gratuito.' using errcode = '42501';
  end if;
  if (select count(*) from public.user_library where user_id = v_uid) >= 500 then
    raise exception 'Limite da biblioteca atingido.' using errcode = '54000';
  end if;
  insert into public.user_library (user_id, ebook_id)
  values (v_uid, p_ebook_id)
  on conflict (user_id, ebook_id) do nothing;
end;
$$;
revoke all on function public.obter_livro_gratis(text) from public, anon;
grant execute on function public.obter_livro_gratis(text) to authenticated;

-- 9) Atualização de progresso: só a coluna progress (já concedida) e valores válidos
alter table public.user_library drop constraint if exists user_library_progress_check;
alter table public.user_library add constraint user_library_progress_check
  check (progress between 0 and 100);


-- =====================================================================
-- PAINEL DO ADMINISTRADOR (dashboard): publicação, vendas e indicadores
-- Pode ser executado várias vezes.
-- =====================================================================

-- 1) Data de publicação (para "publicados no mês")
alter table public.books add column if not exists published_at timestamptz;
update public.books set published_at = coalesce(published_at, updated_at)
where published and published_at is null;

create or replace function public.books_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.published then
    if tg_op = 'INSERT' or old.published is distinct from true or new.published_at is null then
      new.published_at := coalesce(new.published_at, now());
    end if;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists books_published_at on public.books;
create trigger books_published_at before insert or update on public.books
  for each row execute function public.books_set_published_at();

create index if not exists books_created_idx on public.books (created_at);
create index if not exists books_published_at_idx on public.books (published_at) where published;

-- 2) Vendas. Só o servidor grava (webhook do pagamento, com a chave de serviço).
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  ebook_id   text not null references public.books (id) on delete restrict,
  amount     numeric(10,2) not null check (amount >= 0),
  status     text not null default 'paid' check (status in ('pending', 'paid', 'refunded')),
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
revoke all on table public.orders from anon, authenticated;
create index if not exists orders_paid_data_idx on public.orders (created_at desc) where status = 'paid';
create index if not exists orders_paid_ebook_idx on public.orders (ebook_id) where status = 'paid';

-- 3) Indicadores do painel em UMA chamada (somente administradora)
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tz       constant text := 'America/Fortaleza';
  v_local  timestamp := date_trunc('month', timezone(tz, now()));
  v_mes    timestamptz := timezone(tz, v_local);
  v_prox   timestamptz := timezone(tz, v_local + interval '1 month');
  r        jsonb;
begin
  if not (select public.is_admin()) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totais', jsonb_build_object(
      'ebooks',         (select count(*) from public.books),
      'publicados',     (select count(*) from public.books where published),
      'rascunhos',      (select count(*) from public.books where not published),
      'gratuitos',      (select count(*) from public.books where published and (price is null or price = 0)),
      'criados_mes',    (select count(*) from public.books where created_at >= v_mes and created_at < v_prox),
      'publicados_mes', (select count(*) from public.books where published and published_at >= v_mes and published_at < v_prox),
      'vendidos_total', (select count(*) from public.orders where status = 'paid'),
      'vendidos_mes',   (select count(*) from public.orders where status = 'paid' and created_at >= v_mes and created_at < v_prox),
      'receita_total',  (select coalesce(sum(amount), 0) from public.orders where status = 'paid'),
      'receita_mes',    (select coalesce(sum(amount), 0) from public.orders where status = 'paid' and created_at >= v_mes and created_at < v_prox),
      'gratis_total',   (select count(*) from public.user_library ul join public.books b on b.id = ul.ebook_id where b.price is null or b.price = 0),
      'gratis_mes',     (select count(*) from public.user_library ul join public.books b on b.id = ul.ebook_id
                         where (b.price is null or b.price = 0) and ul.created_at >= v_mes and ul.created_at < v_prox)
    ),
    'meses', (
      select jsonb_agg(jsonb_build_object(
        'mes', to_char(g.m, 'YYYY-MM'),
        'criados',    (select count(*) from public.books b where b.created_at >= timezone(tz, g.m) and b.created_at < timezone(tz, g.m + interval '1 month')),
        'publicados', (select count(*) from public.books b where b.published and b.published_at >= timezone(tz, g.m) and b.published_at < timezone(tz, g.m + interval '1 month')),
        'vendidos',   (select count(*) from public.orders o where o.status = 'paid' and o.created_at >= timezone(tz, g.m) and o.created_at < timezone(tz, g.m + interval '1 month')),
        'receita',    (select coalesce(sum(o.amount), 0) from public.orders o where o.status = 'paid' and o.created_at >= timezone(tz, g.m) and o.created_at < timezone(tz, g.m + interval '1 month')),
        'gratis',     (select count(*) from public.user_library ul join public.books b on b.id = ul.ebook_id
                       where (b.price is null or b.price = 0) and ul.created_at >= timezone(tz, g.m) and ul.created_at < timezone(tz, g.m + interval '1 month'))
      ) order by g.m)
      from generate_series(v_local - interval '5 months', v_local, interval '1 month') as g(m)
    ),
    'top', (
      select coalesce(jsonb_agg(t order by t.vendidos desc, t.receita desc), '[]'::jsonb) from (
        select b.id, b.title, b.author, b.color, b.cover_url, count(*) as vendidos, sum(o.amount) as receita
        from public.orders o join public.books b on b.id = o.ebook_id
        where o.status = 'paid'
        group by b.id, b.title, b.author, b.color, b.cover_url
        order by count(*) desc, sum(o.amount) desc
        limit 5
      ) t
    ),
    'top_gratis', (
      select coalesce(jsonb_agg(t order by t.vendidos desc), '[]'::jsonb) from (
        select b.id, b.title, b.author, b.color, b.cover_url, count(*) as vendidos, 0 as receita
        from public.user_library ul join public.books b on b.id = ul.ebook_id
        where b.price is null or b.price = 0
        group by b.id, b.title, b.author, b.color, b.cover_url
        order by count(*) desc
        limit 5
      ) t
    )
  ) into r;

  return r;
end;
$$;
revoke all on function public.admin_dashboard() from public, anon;
grant execute on function public.admin_dashboard() to authenticated;

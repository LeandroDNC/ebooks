-- LIZIVIDA — esquema mínimo do banco.
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

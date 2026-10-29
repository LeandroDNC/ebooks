-- Prévia gratuita: capa + PRIMEIRA página de qualquer ebook publicado,
-- sem precisar comprar. Devolve só o suficiente para a amostra (nunca o livro todo).
-- Rode no Supabase: SQL Editor > New query > Run. Pode repetir.

create or replace function public.previa_livro(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when b.id is null then null else jsonb_build_object(
    'meta', jsonb_build_object(
      'id', b.id,
      'title', b.title,
      'author', b.author,
      'price', b.price,
      'gratis', (b.price is null or b.price = 0)
    ),
    'capa', (
      select jsonb_build_object(
        'title',       c.data ->> 'title',
        'author',      c.data ->> 'author',
        'coverColor',  c.data ->> 'coverColor',
        'coverImage',  c.data ->> 'coverImage',
        'coverArt',    c.data -> 'coverArt',
        'coverStyles', c.data -> 'coverStyles'
      ) from public.book_content c where c.book_id = b.id
    ),
    'primeira_pagina', (
      select c.data -> 'pages' -> 0 from public.book_content c where c.book_id = b.id
    )
  ) end
  from public.books b
  where b.id = p_id and b.published;
$$;

revoke all on function public.previa_livro(text) from public;
grant execute on function public.previa_livro(text) to anon, authenticated;

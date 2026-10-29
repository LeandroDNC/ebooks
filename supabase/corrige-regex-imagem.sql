-- Correção: regex de links de imagem usava {1,2000}, acima do limite de repetição
-- do Postgres (máx. 255), causando "invalid regular expression: invalid repetition count(s)"
-- ao salvar um ebook COM imagem de capa. Troca {1,2000} por + (sem limite de contagem)
-- e mantém o teto de tamanho via char_length.
--
-- Rode no Supabase: SQL Editor > New query > Run. Pode repetir.

-- 1) Formato de books (cover_url)
alter table public.books drop constraint if exists books_formato;
alter table public.books add constraint books_formato check (
  id ~ '^[A-Za-z0-9_-]{1,64}$'
  and color ~ '^#[0-9a-fA-F]{3,8}$'
  and (
    cover_url is null
    or (cover_url ~* '^https://[^[:space:]"<>'']+$' and char_length(cover_url) <= 2000)
  )
) not valid;

-- 2) Validação do conteúdo do ebook (re_url)
create or replace function public.validar_conteudo_ebook(d jsonb)
returns void
language plpgsql
set search_path = ''
as $fn$
declare
  pg jsonb;
  bl jsonb;
  u  text;
  tipo text;
  re_cor constant text := '^#[0-9a-fA-F]{3,8}$';
  re_url constant text := '^https://[^[:space:]"<>'']+$';
begin
  if d is null or jsonb_typeof(d) <> 'object' then
    raise exception 'Conteúdo do ebook inválido.' using errcode = '22023';
  end if;
  if jsonb_typeof(d -> 'pages') <> 'array' or jsonb_array_length(d -> 'pages') > 200 then
    raise exception 'O ebook precisa ter de 0 a 200 páginas.' using errcode = '22023';
  end if;
  if d ->> 'coverColor' is not null and (d ->> 'coverColor') !~ re_cor then
    raise exception 'Cor da capa inválida.' using errcode = '22023';
  end if;
  foreach u in array array[d ->> 'coverImage', d #>> '{coverArt,src}'] loop
    if u is not null and u <> '' and (u !~* re_url or char_length(u) > 2000) then
      raise exception 'Links de imagem devem começar com https://.' using errcode = '22023';
    end if;
  end loop;

  for pg in select * from jsonb_array_elements(d -> 'pages') loop
    if jsonb_typeof(pg) <> 'object' then
      raise exception 'Página inválida.' using errcode = '22023';
    end if;
    if pg ->> 'bg' is not null and (pg ->> 'bg') !~ re_cor then
      raise exception 'Cor de fundo da página inválida.' using errcode = '22023';
    end if;
    if jsonb_typeof(coalesce(pg -> 'blocks', '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(pg -> 'blocks', '[]'::jsonb)) > 40 then
      raise exception 'Cada página aceita até 40 elementos.' using errcode = '22023';
    end if;
    for bl in select * from jsonb_array_elements(coalesce(pg -> 'blocks', '[]'::jsonb)) loop
      if jsonb_typeof(bl) <> 'object' then
        raise exception 'Elemento inválido.' using errcode = '22023';
      end if;
      tipo := bl ->> 'type';
      if tipo is null or tipo not in ('text', 'line', 'image') then
        raise exception 'Tipo de elemento não permitido.' using errcode = '22023';
      end if;
      if bl ->> 'color' is not null and (bl ->> 'color') !~ re_cor then
        raise exception 'Cor inválida em um elemento.' using errcode = '22023';
      end if;
      if tipo = 'text' and char_length(coalesce(bl ->> 'text', '')) > 6000 then
        raise exception 'Texto longo demais (máximo 6000 caracteres por bloco).' using errcode = '22023';
      end if;
      if tipo = 'image' and coalesce(bl ->> 'src', '') <> ''
         and ((bl ->> 'src') !~* re_url or char_length(bl ->> 'src') > 2000) then
        raise exception 'Links de imagem devem começar com https://.' using errcode = '22023';
      end if;
    end loop;
  end loop;
end;
$fn$;
revoke all on function public.validar_conteudo_ebook(jsonb) from public, anon, authenticated;

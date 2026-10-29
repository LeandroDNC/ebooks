-- Íntima Graça — apoio ao pagamento (Mercado Pago).
-- Cole no Supabase: SQL Editor > New query > Run. Pode repetir (idempotente).
--
-- A tabela public.orders já existe (criada em schema.sql) e só o servidor grava nela
-- (service_role, via webhook). Aqui apenas adicionamos:
--   * provider            -> qual gateway gerou a venda
--   * provider_payment_id -> id do pagamento no gateway, para IDEMPOTÊNCIA
-- Assim, se o Mercado Pago reenviar a mesma notificação, a venda NÃO é contada duas vezes.

alter table public.orders add column if not exists provider text not null default 'mercadopago';
alter table public.orders add column if not exists provider_payment_id text;

-- Unicidade do id do pagamento: a segunda gravação do mesmo pagamento é ignorada
-- (o webhook usa on_conflict=provider_payment_id). Vários NULL são permitidos.
create unique index if not exists orders_provider_payment_id_key
  on public.orders (provider_payment_id);

-- Observação: não é preciso GRANT nem política nova. A service_role (usada só no
-- servidor, no webhook) ignora RLS e permissões. O cliente continua SEM acesso a orders.

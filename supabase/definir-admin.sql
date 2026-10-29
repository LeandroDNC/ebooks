-- Define quem é a administradora do site. Rode UMA vez no SQL Editor, depois de criar a conta em /biblioteca.
-- Troque o e-mail abaixo pelo e-mail EXATO da conta que será a administradora.
-- (O banco não torna ninguém administrador sozinho: assim, ninguém "chega primeiro" e assume o painel.)

insert into public.admin_users (user_id)
select id from auth.users where lower(email) = lower('SEU-EMAIL-AQUI')
on conflict (user_id) do nothing;

-- Conferência: deve listar 1 linha com o seu e-mail
select u.email, a.user_id from public.admin_users a join auth.users u on u.id = a.user_id;

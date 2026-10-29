// Cloudflare Pages Function — configuração pública do front.
// Rota: GET /api/config
// Devolve só a Public Key do Mercado Pago (que é pública por design).
// Fica numa variável de ambiente para trocar entre teste e produção sem mexer no código.

export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({ public_key: env.MP_PUBLIC_KEY || "" }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

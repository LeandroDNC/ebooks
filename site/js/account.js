// Login, cadastro e painel do usuário.
// Uso do banco: Auth (login) + UMA consulta em user_library ao abrir o painel.
import { supabase } from "./supabase.js?v=202610291500";

const $ = (s) => document.querySelector(s);
const esc = (s) => UI.escapeHtml(s);

const views = { loading: $("#account-loading"), auth: $("#auth-view"), panel: $("#panel-view") };
function show(name) {
  Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));
}

let mode = "login";
function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  $("#google-btn").addEventListener("click", async () => {
    message("Redirecionando para o Google…", false);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname },
    });
    if (error) message("Não foi possível entrar com o Google. Verifique se o provedor está ativado no Supabase.");
  });
  document.querySelectorAll(".tab").forEach((t) => {
    const on = t.dataset.mode === mode;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-pressed", String(on));
  });
  $("#name-field").hidden = !signup;
  $("#google-block").hidden = !signup; // Google só no cadastro; login = e-mail e senha
  $("#auth-name").required = signup;
  $("#auth-submit").textContent = signup ? "Criar minha conta" : "Entrar";
  $("#auth-title").textContent = signup ? "Crie sua conta" : "Entrar na sua conta";
  $("#auth-password").autocomplete = signup ? "new-password" : "current-password";
  $("#auth-message").textContent = "";
}

function message(text, isError = true) {
  const el = $("#auth-message");
  el.textContent = text;
  el.classList.toggle("is-error", isError);
}

function translate(error) {
  const m = (error.message || "").toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered")) return "Este e-mail já tem cadastro. Use a aba Entrar.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("password")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  return "Não foi possível concluir. Tente novamente.";
}

// Voltando de "Obter grátis" sem login: conclui a aquisição e abre o leitor.
async function obterDaUrl() {
  const id = new URLSearchParams(location.search).get("obter");
  if (!id) return false;
  const { error } = await supabase.rpc("obter_livro_gratis", { p_ebook_id: id });
  if (error) {
    $("#panel-error").textContent = "Não foi possível adicionar este ebook gratuito agora.";
    return false;
  }
  location.replace(`ler.html?id=${encodeURIComponent(id)}`);
  return true;
}

// Voltando de "Comprar" sem login: agora logado, cria o pagamento e vai ao Mercado Pago.
async function comprarDaUrl() {
  const id = new URLSearchParams(location.search).get("comprar");
  if (!id) return false;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return false;
    const resp = await fetch("/api/criar-pagamento", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ ebook_id: id }),
    });
    const r = await resp.json().catch(() => ({}));
    if (resp.status === 409 && r.erro === "ja_adquirido") {
      location.replace(`ler.html?id=${encodeURIComponent(id)}`);
      return true;
    }
    if (resp.ok && r.init_point) {
      location.replace(r.init_point);
      return true;
    }
  } catch (_) {
    /* cai no painel normal */
  }
  return false;
}

async function renderPanel(user) {
  if (await obterDaUrl()) return;
  if (await comprarDaUrl()) return;
  const name = user.user_metadata?.full_name;
  $("#panel-title").textContent = name ? `Olá, ${name.split(" ")[0]}` : "Olá!";
  $("#panel-email").textContent = user.email;
  show("panel");

  // UMA chamada: biblioteca + dados dos livros (junção no banco)
  let { data, error } = await supabase.rpc("minha_biblioteca");
  if (error && ["PGRST202", "42883"].includes(error.code)) {
    // função ainda não instalada: modo antigo (2 consultas)
    const lib = await supabase.from("user_library").select("ebook_id, progress").order("created_at", { ascending: false }).limit(500);
    error = lib.error;
    data = lib.data || [];
    const ids = data.map((x) => x.ebook_id);
    if (!error && ids.length) {
      const { data: rows } = await supabase.from("books").select("id,title,author,color,cover_url").in("id", ids);
      const mapa = Object.fromEntries((rows || []).map((b) => [b.id, b]));
      data = data.map((x) => ({ ...x, ...(mapa[x.ebook_id] ? { title: mapa[x.ebook_id].title, author: mapa[x.ebook_id].author, color: mapa[x.ebook_id].color, cover_url: mapa[x.ebook_id].cover_url } : {}) }));
    }
  }

  const list = $("#panel-library");
  if (error) {
    $("#panel-error").textContent =
      "Não foi possível carregar sua biblioteca agora. Tente novamente em instantes.";
    $("#panel-empty").hidden = false;
    return;
  }

  const estaticos = Object.fromEntries(INTIMA.ebooks.map((e) => [e.id, e]));
  const catalog = {};
  (data || []).forEach((r) => {
    catalog[r.ebook_id] = r.title
      ? { id: r.ebook_id, title: r.title, author: r.author || "", color: "forest", bg: r.color, cover: r.cover_url || "" }
      : estaticos[r.ebook_id];
  });
  const items = (data || []).filter((r) => catalog[r.ebook_id]);
  $("#stat-total").textContent = items.length;
  $("#stat-done").textContent = items.filter((r) => r.progress >= 100).length;
  $("#panel-empty").hidden = items.length > 0;

  list.innerHTML = items.map((r) => {
    const e = catalog[r.ebook_id];
    return `<li class="card library-item">
      <div class="library-item__cover">${UI.cover({ ...e, title: "", author: "" })}</div>
      <div class="library-item__info">
        <p class="library-item__title">${esc(e.title)}</p>
        <p class="muted">${esc(e.author)}</p>
        <div class="progress-row">
          <div class="progress" role="progressbar" aria-label="Progresso de leitura de ${esc(e.title)}" aria-valuenow="${Number(r.progress) || 0}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Number(r.progress) || 0}%"></span></div>
          <span class="progress-pct">${Number(r.progress) || 0}%</span>
        </div>
      </div>
      <a class="btn btn--primary btn--sm" href="ler.html?id=${encodeURIComponent(r.ebook_id)}">${r.progress >= 100 ? "Reler" : "Continuar lendo"}</a>
    </li>`;
  }).join("");
}

async function init() {
  setMode("login");
  if (!supabase) {
    show("auth");
    message("Configure SUPABASE_URL e SUPABASE_ANON_KEY em js/supabase.js.");
    return;
  }

  $("#logout").addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.reload();
  });
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));

  $("#auth-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    const fullName = $("#auth-name").value.trim() || email.split("@")[0];
    if (!email || !email.includes("@")) return message("Informe um e-mail válido.");
    if (password.length < 8) return message("A senha deve ter ao menos 8 caracteres.");
    const btn = $("#auth-submit");
    btn.disabled = true;
    message("Aguarde…", false);

    const res = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      : await supabase.auth.signInWithPassword({ email, password });
    btn.disabled = false;

    if (res.error) return message(translate(res.error));
    if (mode === "signup" && !res.data.session) {
      return message("Conta criada! Confirme seu e-mail pelo link que enviamos e depois entre.", false);
    }
    renderPanel(res.data.user);
  });

  // ?sair=1 (vindo do menu): encerra a sessão e volta para o início
  if (new URLSearchParams(location.search).has("sair")) {
    await supabase.auth.signOut();
    location.replace("index.html");
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (data.session) renderPanel(data.session.user);
  else show("auth");
}

init();

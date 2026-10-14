// Login, cadastro e painel do usuário.
// Uso do banco: Auth (login) + UMA consulta em user_library ao abrir o painel.
import { supabase } from "./supabase.js";

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
  if (m.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  return "Não foi possível concluir. Tente novamente.";
}

async function renderPanel(user) {
  const name = user.user_metadata?.full_name;
  $("#panel-title").textContent = name ? `Olá, ${name.split(" ")[0]}` : "Olá!";
  $("#panel-email").textContent = user.email;
  show("panel");

  const { data, error } = await supabase
    .from("user_library")
    .select("ebook_id, progress")
    .order("created_at", { ascending: false });

  const list = $("#panel-library");
  if (error) {
    $("#panel-error").textContent =
      "Não foi possível carregar sua biblioteca agora. Verifique se o esquema do banco foi criado.";
    $("#panel-empty").hidden = false;
    return;
  }

  const catalog = Object.fromEntries(LIZIVIDA.ebooks.map((e) => [e.id, e]));
  const ids = (data || []).map((r) => r.ebook_id);
  if (ids.length) {
    const { data: rows } = await supabase.from("books").select("id,title,author,color,cover_url").in("id", ids);
    (rows || []).forEach((b) => {
      catalog[b.id] = { id: b.id, title: b.title, author: b.author || "", color: "forest", bg: b.color, cover: b.cover_url || "" };
    });
  }
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
          <div class="progress" role="progressbar" aria-label="Progresso de leitura de ${esc(e.title)}" aria-valuenow="${r.progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${r.progress}%"></span></div>
          <span class="progress-pct">${r.progress}%</span>
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
    const fullName = $("#auth-name").value.trim();
    if (!email || password.length < 6 || (mode === "signup" && !fullName)) {
      return message("Preencha todos os campos. A senha deve ter ao menos 6 caracteres.");
    }
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

  const { data } = await supabase.auth.getSession();
  if (data.session) renderPanel(data.session.user);
  else show("auth");
}

init();

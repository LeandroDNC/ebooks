// Uso: node validar.mjs arquivo.json  — confere o formato aceito pelo importador do editor.
import { readFileSync } from "node:fs";
const CATS = ["Mulheres", "Casais", "Jovens", "Família", "Jornadas de 21/30 dias", "Oração"];
const FONTS = ["Cormorant Garamond", "Playfair Display", "Lora", "Merriweather", "Manrope", "Montserrat", "Poppins", "Great Vibes", "Dancing Script", "Parisienne"];
const erros = [], avisos = [];
let b;
try { b = JSON.parse(readFileSync(process.argv[2], "utf8")); } catch (e) { console.error("JSON inválido:", e.message); process.exit(1); }
if (!b.title) erros.push("title vazio");
if (!CATS.includes(b.category)) erros.push(`category inválida: ${b.category}`);
if (!Array.isArray(b.pages) || !b.pages.length) erros.push("pages vazio");
const hex = (c) => typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c);
if (!hex(b.coverColor)) erros.push("coverColor deve ser hexadecimal");
if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(JSON.stringify(b))) erros.push("há emoji no texto");
(b.pages || []).forEach((p, i) => {
  if (p.bg && !hex(p.bg)) erros.push(`página ${i + 1}: bg inválido`);
  if ((p.blocks || []).length > 40) erros.push(`página ${i + 1}: blocos demais`);
  let chars = 0;
  (p.blocks || []).forEach((k, j) => {
    const w = `página ${i + 1}, bloco ${j + 1}`;
    if (!["text", "line", "image"].includes(k.type)) erros.push(`${w}: type inválido`);
    if (k.font && !FONTS.includes(k.font)) erros.push(`${w}: fonte inválida ${k.font}`);
    if (k.color && !hex(k.color)) erros.push(`${w}: cor inválida`);
    if (k.type === "image" && !/^https:\/\//.test(k.src || "")) erros.push(`${w}: src deve ser link https`);
    if (k.type === "text") chars += (k.text || "").length;
  });
  if (chars > 1200) avisos.push(`página ${i + 1}: ${chars} caracteres (muito texto)`);
});
console.log(`${b.title || "(sem título)"} — ${(b.pages || []).length} páginas`);
avisos.forEach((a) => console.log("aviso:", a));
if (erros.length) { erros.forEach((e) => console.error("erro:", e)); process.exit(1); }
console.log("OK: pronto para importar.");

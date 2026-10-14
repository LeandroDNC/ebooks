// Cliente Supabase (preparado, ainda não usado pela página inicial).
// 1) Preencha SUPABASE_URL e SUPABASE_ANON_KEY (veja .env.example na raiz do site).
// 2) Nas páginas que precisarem, carregue este arquivo como módulo:
//      <script type="module" src="js/supabase.js"></script>
//    e use: import { supabase } from "./supabase.js";
// A chave "anon" é pública por design; a segurança vem das políticas RLS do banco.
// NUNCA coloque a service_role key aqui.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const SUPABASE_URL = "https://sezaazpoybpqnhayzgkk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlemFhenBveWJwcW5oYXl6Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NDcxMjcsImV4cCI6MjEwNzUyMzEyN30.asW3jliBpNDnCA1Q0Xz555QaJvn97fmZ9spt9eNcjJA";

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

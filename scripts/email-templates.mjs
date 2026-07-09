/** Template email Supabase Auth — condivisi con configure-supabase.mjs */

export const SUPERMASTRO_LOGO_URL =
  "https://supermastro.anchecasa.it/images/supermastro-mezzobusto.png";

const BRAND = "#2563eb";

function authEmailShell({ title, body, buttonLabel, footer }) {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
  <div style="text-align:center;margin-bottom:24px">
    <img src="${SUPERMASTRO_LOGO_URL}" alt="SuperMastro" width="96" height="96" style="border-radius:9999px;object-fit:cover" />
  </div>
  <h2 style="margin:0 0 12px;font-size:22px;text-align:center">${title}</h2>
  <p style="margin:0 0 20px;line-height:1.5;color:#444;text-align:center">${body}</p>
  <p style="text-align:center;margin:28px 0">
    <a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=magiclink"
       style="display:inline-block;background:${BRAND};color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600">
      ${buttonLabel}
    </a>
  </p>
  <p style="margin:0;font-size:12px;color:#666;text-align:center;line-height:1.5">${footer}</p>
</div>`;
}

export const SUPABASE_MAGIC_LINK_TEMPLATE = authEmailShell({
  title: "Conferma il tuo accesso",
  body: "Clicca il pulsante per accedere ad AncheCasa e continuare.",
  buttonLabel: "Conferma e accedi",
  footer: "Link valido una sola volta. Se non hai richiesto tu questo accesso, ignora l'email.",
});

export const SUPABASE_EMPLOYER_CONFIRMATION_TEMPLATE = authEmailShell({
  title: "Conferma email — AncheCasa Lavoro",
  body: "Hai richiesto di pubblicare un annuncio per cercare personale. Clicca il pulsante per confermare l'email, registrarti e completare l'annuncio.",
  buttonLabel: "Conferma e pubblica annuncio",
  footer: "Link valido una sola volta. Condominio, hotel o ditta: il team AncheCasa ti aiuta con la shortlist candidati.",
});

export const SUPABASE_MAGIC_LINK_SUBJECT = "Conferma il tuo accesso — SuperMastro";
export const SUPABASE_EMPLOYER_CONFIRMATION_SUBJECT =
  "Conferma email — pubblica il tuo annuncio | SuperMastro";

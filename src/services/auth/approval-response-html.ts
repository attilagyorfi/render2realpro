import { BRAND } from "@/config/brand";

/**
 * Build a tiny standalone HTML page for the email-link approve/reject
 * endpoints. Plain HTML rather than a Next.js page so the response can
 * come directly out of an API route handler — no client bundle, no
 * extra route to wire up.
 */
export function approvalResponseHtml(opts: {
  variant: "approved" | "rejected" | "not-found" | "expired" | "already-resolved";
  applicantName?: string;
}): string {
  const palette =
    opts.variant === "approved"
      ? { bg: "#0f172a", accent: "#22c55e", title: "Jóváhagyva" }
      : opts.variant === "rejected"
        ? { bg: "#0f172a", accent: "#f97316", title: "Elutasítva" }
        : { bg: "#0f172a", accent: "#ef4444", title: "Érvénytelen link" };

  const body =
    opts.variant === "approved"
      ? `${escapeHtml(opts.applicantName ?? "A jelentkező")} fiókját jóváhagytuk, és értesítettük emailben.`
      : opts.variant === "rejected"
        ? `${escapeHtml(opts.applicantName ?? "A jelentkező")} jelentkezését elutasítottad.`
        : opts.variant === "expired"
          ? "Ez a jóváhagyó link már lejárt. A regisztráció továbbra is megtalálható az admin felületen."
          : opts.variant === "already-resolved"
            ? "Ezt a regisztrációt korábban már elbíráltad."
            : "A jóváhagyó link érvénytelen vagy ismeretlen.";

  return `<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(palette.title)} · ${escapeHtml(BRAND.name)}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <style>
    html,body { margin:0; padding:0; min-height:100vh; }
    body {
      background: ${palette.bg};
      color: #e5e7eb;
      font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;
      display: grid;
      place-items: center;
      padding: 24px;
      line-height: 1.55;
    }
    .card {
      width: 100%;
      max-width: 480px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 28px;
    }
    .badge {
      display:inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: ${palette.accent}1a;
      color: ${palette.accent};
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 600;
    }
    h1 { font-size: 22px; margin: 14px 0 8px; }
    p  { color: #9ca3af; margin: 12px 0; }
    a  { color: ${palette.accent}; }
    .small { font-size: 12px; color: #6b7280; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">${escapeHtml(palette.title)}</span>
    <h1>${escapeHtml(BRAND.name)}</h1>
    <p>${body}</p>
    <p class="small">Bezárhatod ezt a lapot.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * email-service.ts
 *
 * Tiny abstraction over transactional email so the registration flow
 * doesn't have to care which provider is wired up. Two implementations:
 *
 *   - Resend (the real provider). Used whenever RESEND_API_KEY is set.
 *   - Console fallback. Used when the key is missing. Prints subject,
 *     recipient, and the plain-text body so a developer can grab the
 *     approval link without configuring a provider — and so the test
 *     suite never tries to talk to a real SMTP/HTTP endpoint.
 *
 * Email content is built in email-templates.ts so this file stays
 * focused on transport.
 */

import { Resend } from "resend";

import { appEnv } from "@/config/env";

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain-text body. Required — also shown by the console fallback. */
  text: string;
  /** Optional HTML body. Falls back to the text body inside <pre>. */
  html?: string;
};

export type EmailSendResult = {
  ok: boolean;
  provider: "resend" | "console";
  id?: string;
  error?: string;
};

let cachedResend: Resend | null = null;

function getResend(): Resend {
  if (!cachedResend) {
    cachedResend = new Resend(appEnv.resendApiKey);
  }
  return cachedResend;
}

/**
 * Send an email. Errors are caught and reported back through the
 * return value rather than thrown — the registration flow keeps
 * going even if the admin notification couldn't be delivered, because
 * the pending row is in the DB regardless and the admin can find it
 * from the /app/admin pending list.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  // Console fallback whenever the Resend key isn't configured.
  if (!appEnv.resendApiKey) {
    console.log(
      [
        "[email/console]",
        `to: ${message.to}`,
        `subject: ${message.subject}`,
        `body:`,
        message.text,
      ].join("\n")
    );
    return { ok: true, provider: "console" };
  }

  try {
    const result = await getResend().emails.send({
      from: appEnv.emailFrom,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html ?? `<pre style="font-family:sans-serif">${escapeHtml(message.text)}</pre>`,
    });

    if (result.error) {
      console.error("[email/resend]", result.error);
      return {
        ok: false,
        provider: "resend",
        error: result.error.message ?? "Resend send error",
      };
    }

    return { ok: true, provider: "resend", id: result.data?.id };
  } catch (err) {
    console.error("[email/resend] threw", err);
    return {
      ok: false,
      provider: "resend",
      error: err instanceof Error ? err.message : "Unknown send error",
    };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * email-templates.ts
 *
 * Three Hungarian transactional emails consumed by the registration
 * approval flow:
 *
 *   buildAdminNotification        sent to the platform admin when
 *                                 someone registers. Contains an approve
 *                                 and a reject link bound to a single-
 *                                 use token.
 *
 *   buildApplicantConfirmation    sent to the applicant immediately
 *                                 after registration, so they know the
 *                                 form went through.
 *
 *   buildApplicantApproved        sent to the applicant once the admin
 *                                 has clicked Approve. Includes the
 *                                 login link.
 *
 * Each builder returns { subject, text, html } that the email-service
 * passes straight to Resend (or prints to console in dev).
 */

import { BRAND } from "@/config/brand";
import { appEnv } from "@/config/env";

import type { EmailMessage } from "./email-service";

type AdminNotificationInput = {
  applicantName: string;
  applicantEmail: string;
  approvalToken: string;
};

export function buildAdminNotification(
  input: AdminNotificationInput
): EmailMessage {
  const base = appEnv.siteUrl.replace(/\/$/, "");
  const approveUrl = `${base}/api/admin/registrations/${input.approvalToken}/approve`;
  const rejectUrl = `${base}/api/admin/registrations/${input.approvalToken}/reject`;

  const text = [
    `Új regisztrációs kérelem érkezett a ${BRAND.name} szolgáltatásra.`,
    "",
    `Név:    ${input.applicantName}`,
    `E-mail: ${input.applicantEmail}`,
    "",
    "Jóváhagyás (egy kattintás):",
    approveUrl,
    "",
    "Elutasítás:",
    rejectUrl,
    "",
    `A linkek egyszer használhatók és néhány napon belül lejárnak.`,
    "",
    `— ${BRAND.name}`,
  ].join("\n");

  const html = `
<div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#1c1f24;line-height:1.55">
  <h2 style="margin:0 0 12px;font-size:18px">Új regisztrációs kérelem — ${escapeHtml(BRAND.name)}</h2>
  <p>Az alábbi felhasználó regisztrált a szolgáltatásra:</p>
  <table style="border-collapse:collapse;margin:14px 0">
    <tr><td style="padding:4px 14px 4px 0;color:#666">Név</td><td><strong>${escapeHtml(input.applicantName)}</strong></td></tr>
    <tr><td style="padding:4px 14px 4px 0;color:#666">E-mail</td><td><strong>${escapeHtml(input.applicantEmail)}</strong></td></tr>
  </table>
  <p style="margin:18px 0">
    <a href="${approveUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;margin-right:8px">Jóváhagyom</a>
    <a href="${rejectUrl}" style="display:inline-block;background:transparent;color:#7c3aed;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;border:1px solid #7c3aed">Elutasítom</a>
  </p>
  <p style="font-size:12px;color:#666">A linkek egyszer használhatók és néhány napon belül lejárnak.</p>
</div>`.trim();

  return {
    to: appEnv.adminNotifyEmail,
    subject: `[${BRAND.name}] Új regisztráció: ${input.applicantName}`,
    text,
    html,
  };
}

export function buildApplicantConfirmation(input: {
  applicantName: string;
  applicantEmail: string;
}): EmailMessage {
  const text = [
    `Kedves ${input.applicantName}!`,
    "",
    `A ${BRAND.name} regisztrációs kérelmedet megkaptuk. A csapatunk hamarosan átnézi, és e-mailben értesítünk a jóváhagyásról.`,
    "",
    "Köszönjük a türelmedet!",
    "",
    `— ${BRAND.name}`,
  ].join("\n");

  return {
    to: input.applicantEmail,
    subject: `[${BRAND.name}] Regisztrációs kérelmedet megkaptuk`,
    text,
  };
}

export function buildApplicantApproved(input: {
  applicantName: string;
  applicantEmail: string;
}): EmailMessage {
  const base = appEnv.siteUrl.replace(/\/$/, "");
  const loginUrl = `${base}/login`;

  const text = [
    `Kedves ${input.applicantName}!`,
    "",
    `A ${BRAND.name} regisztrációdat jóváhagytuk. Mostantól beléphetsz:`,
    loginUrl,
    "",
    "Üdv a fedélzeten!",
    "",
    `— ${BRAND.name}`,
  ].join("\n");

  const html = `
<div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#1c1f24;line-height:1.55">
  <h2 style="margin:0 0 12px;font-size:18px">Üdv a ${escapeHtml(BRAND.name)} fedélzetén!</h2>
  <p>Kedves ${escapeHtml(input.applicantName)},</p>
  <p>Regisztrációdat jóváhagytuk. Mostantól beléphetsz a fiókoddal:</p>
  <p style="margin:18px 0">
    <a href="${loginUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Belépés</a>
  </p>
  <p>Ha bármi kérdésed van, válaszolj erre az e-mailre.</p>
  <p style="font-size:12px;color:#666">— ${escapeHtml(BRAND.name)}</p>
</div>`.trim();

  return {
    to: input.applicantEmail,
    subject: `[${BRAND.name}] Regisztrációd jóváhagyva`,
    text,
    html,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * registration-approval.ts
 *
 * Shared logic for the two email-link endpoints (approve / reject) and
 * the in-app admin actions. Each helper validates the token, applies
 * the state change, sends a notification email when relevant, and
 * returns a discriminated result the caller can use to render either a
 * success or an error page.
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/services/email/email-service";
import { buildApplicantApproved } from "@/services/email/email-templates";

export type ApprovalOutcome =
  | { ok: true; userId: string; email: string; name: string; action: "approved" | "rejected" }
  | { ok: false; reason: "not_found" | "expired" | "already_resolved" };

async function findUserByToken(token: string) {
  return prisma.user.findFirst({
    where: { approvalToken: token },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      approvalToken: true,
      approvalTokenExpiresAt: true,
    },
  });
}

function isExpired(expiresAt: Date | null): boolean {
  return !expiresAt || expiresAt.getTime() <= Date.now();
}

/**
 * Approve a pending registration via the single-use email-link token.
 * Clears the token + expiry once consumed and dispatches the
 * "you are approved" email to the applicant.
 */
export async function approveByToken(token: string): Promise<ApprovalOutcome> {
  const user = await findUserByToken(token);
  if (!user) return { ok: false, reason: "not_found" };
  if (user.status !== "pending") return { ok: false, reason: "already_resolved" };
  if (isExpired(user.approvalTokenExpiresAt)) {
    // Wipe the dead token so we don't keep leaking the same row.
    await prisma.user.update({
      where: { id: user.id },
      data: { approvalToken: null, approvalTokenExpiresAt: null },
    });
    return { ok: false, reason: "expired" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "approved",
      approvedAt: new Date(),
      approvalToken: null,
      approvalTokenExpiresAt: null,
    },
  });

  // Fire-and-forget the welcome email; failure doesn't undo the approval.
  await sendEmail(
    buildApplicantApproved({
      applicantName: user.name,
      applicantEmail: user.email,
    })
  ).catch((err) => {
    console.error("[registration-approval/approve] welcome email failed", err);
  });

  return { ok: true, userId: user.id, email: user.email, name: user.name, action: "approved" };
}

/**
 * Reject a pending registration via the single-use email-link token.
 * Clears the token + expiry; no email is sent to the applicant in the
 * default flow (operator may follow up out-of-band).
 */
export async function rejectByToken(token: string): Promise<ApprovalOutcome> {
  const user = await findUserByToken(token);
  if (!user) return { ok: false, reason: "not_found" };
  if (user.status !== "pending") return { ok: false, reason: "already_resolved" };
  if (isExpired(user.approvalTokenExpiresAt)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { approvalToken: null, approvalTokenExpiresAt: null },
    });
    return { ok: false, reason: "expired" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "rejected",
      approvalToken: null,
      approvalTokenExpiresAt: null,
    },
  });

  return { ok: true, userId: user.id, email: user.email, name: user.name, action: "rejected" };
}

/**
 * Same as approveByToken but addressed by userId — used by the in-app
 * admin list, which already authorised the call via requireAdmin().
 */
export async function approveByUserId(userId: string): Promise<ApprovalOutcome> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, status: true },
  });
  if (!user) return { ok: false, reason: "not_found" };
  if (user.status !== "pending") return { ok: false, reason: "already_resolved" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "approved",
      approvedAt: new Date(),
      approvalToken: null,
      approvalTokenExpiresAt: null,
    },
  });

  await sendEmail(
    buildApplicantApproved({
      applicantName: user.name,
      applicantEmail: user.email,
    })
  ).catch((err) => {
    console.error("[registration-approval/approve] welcome email failed", err);
  });

  return { ok: true, userId: user.id, email: user.email, name: user.name, action: "approved" };
}

/**
 * Same as rejectByToken but addressed by userId.
 */
export async function rejectByUserId(userId: string): Promise<ApprovalOutcome> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, status: true },
  });
  if (!user) return { ok: false, reason: "not_found" };
  if (user.status !== "pending") return { ok: false, reason: "already_resolved" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "rejected",
      approvalToken: null,
      approvalTokenExpiresAt: null,
    },
  });

  return { ok: true, userId: user.id, email: user.email, name: user.name, action: "rejected" };
}

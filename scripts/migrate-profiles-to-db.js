#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * migrate-profiles-to-db.js
 *
 * One-shot, idempotent migration that lifts the JSON-based profile store
 * (<storageRoot>/system/profiles.json) into the Prisma User table and
 * backfills Project.userId from the projectOwnerships list.
 *
 * Safe to re-run: only creates users that don't already exist and only
 * updates projects whose userId is still null.
 *
 * Usage:
 *   npm run db:migrate-profiles
 *
 * Environment:
 *   RENDER2REAL_STORAGE_ROOT (defaults to ./storage)
 *   DATABASE_URL (defaults to file:./dev.db)
 */

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const storageRoot = process.env.RENDER2REAL_STORAGE_ROOT
  ? path.resolve(process.cwd(), process.env.RENDER2REAL_STORAGE_ROOT)
  : path.join(process.cwd(), "storage");
const profilesPath = path.join(storageRoot, "system", "profiles.json");

async function main() {
  if (!fs.existsSync(profilesPath)) {
    console.log(`[migrate-profiles] No profiles.json at ${profilesPath}. Nothing to migrate.`);
    return;
  }

  let raw;
  try {
    raw = fs.readFileSync(profilesPath, "utf-8");
  } catch (error) {
    console.error(`[migrate-profiles] Cannot read ${profilesPath}:`, error.message);
    process.exitCode = 1;
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    console.error(`[migrate-profiles] ${profilesPath} is not valid JSON:`, error.message);
    process.exitCode = 1;
    return;
  }

  const profiles = Array.isArray(data.profiles) ? data.profiles : [];
  const ownerships = Array.isArray(data.projectOwnerships) ? data.projectOwnerships : [];

  const prisma = new PrismaClient();
  let createdUsers = 0;
  let skippedUsers = 0;
  let linkedProjects = 0;
  let skippedOwnerships = 0;

  try {
    for (const profile of profiles) {
      if (!profile?.id || !profile?.email || !profile?.name) {
        console.warn("[migrate-profiles] Skipping malformed profile:", profile);
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { id: profile.id } });
      if (existing) {
        skippedUsers++;
        continue;
      }

      const emailExisting = await prisma.user.findUnique({
        where: { email: profile.email },
      });
      if (emailExisting) {
        console.warn(
          `[migrate-profiles] Email ${profile.email} already taken by user ${emailExisting.id}; skipping ${profile.id}.`
        );
        skippedUsers++;
        continue;
      }

      await prisma.user.create({
        data: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
          updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
          lastLoginAt: profile.lastLoginAt ? new Date(profile.lastLoginAt) : null,
        },
      });
      createdUsers++;
    }

    for (const ownership of ownerships) {
      if (!ownership?.profileId || !ownership?.projectId) {
        console.warn("[migrate-profiles] Skipping malformed ownership:", ownership);
        continue;
      }

      const project = await prisma.project.findUnique({
        where: { id: ownership.projectId },
        select: { id: true, userId: true },
      });
      if (!project) {
        console.warn(`[migrate-profiles] Project ${ownership.projectId} not found; ownership skipped.`);
        skippedOwnerships++;
        continue;
      }

      if (project.userId && project.userId !== ownership.profileId) {
        console.warn(
          `[migrate-profiles] Project ${project.id} already belongs to ${project.userId}; not overwriting with ${ownership.profileId}.`
        );
        skippedOwnerships++;
        continue;
      }

      if (project.userId === ownership.profileId) {
        skippedOwnerships++;
        continue;
      }

      await prisma.project.update({
        where: { id: ownership.projectId },
        data: { userId: ownership.profileId },
      });
      linkedProjects++;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    `[migrate-profiles] Created ${createdUsers} user(s), skipped ${skippedUsers}. ` +
      `Linked ${linkedProjects} project(s), skipped ${skippedOwnerships}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

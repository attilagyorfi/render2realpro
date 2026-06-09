/* eslint-disable @typescript-eslint/no-require-imports */
// Load .env so DATABASE_URL is available when this script is run via
// `node prisma/seed.js` (not just via `prisma db seed`, which loads it
// automatically). dotenv is already on disk as a transitive dependency
// of Prisma, so no extra install is required.
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Create a .env file from .env.example or export the variable before running this script."
  );
}

const { PrismaClient } = require("@prisma/client");

const DEFAULT_PRESET_CATALOG = [
  {
    name: "Industrial Exterior Realism",
    description: "Sharper industrial material fidelity with restrained weathering.",
    category: "Industrial",
    settings: {
      realismIntensity: 0.9,
      weatheringIntensity: 0.45,
      reflectionIntensity: 0.5,
      vegetationNaturalness: 0.35,
      glassReflectionLevel: 0.55,
      concreteWearLevel: 0.5,
      shadowStrength: 0.6,
      ambientOcclusionLevel: 0.55,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
  {
    name: "Commercial Architecture Realism",
    description: "Balanced realism for commercial facades, signage zones, and glazing.",
    category: "Commercial",
    settings: {
      realismIntensity: 0.88,
      weatheringIntensity: 0.3,
      reflectionIntensity: 0.62,
      vegetationNaturalness: 0.4,
      glassReflectionLevel: 0.7,
      concreteWearLevel: 0.28,
      shadowStrength: 0.56,
      ambientOcclusionLevel: 0.52,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
  {
    name: "Residential Exterior Realism",
    description: "Warm, believable residential exterior realism without altering landscaping.",
    category: "Residential",
    settings: {
      realismIntensity: 0.87,
      weatheringIntensity: 0.27,
      reflectionIntensity: 0.44,
      vegetationNaturalness: 0.62,
      glassReflectionLevel: 0.46,
      concreteWearLevel: 0.22,
      shadowStrength: 0.48,
      ambientOcclusionLevel: 0.45,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
  {
    name: "Warm Daylight Realism",
    description: "Subtle golden-hour warmth without dramatic cinematic shifts.",
    category: "Lighting",
    settings: {
      realismIntensity: 0.84,
      weatheringIntensity: 0.25,
      reflectionIntensity: 0.47,
      vegetationNaturalness: 0.5,
      glassReflectionLevel: 0.48,
      concreteWearLevel: 0.2,
      shadowStrength: 0.45,
      ambientOcclusionLevel: 0.42,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
  {
    name: "Neutral Editorial Realism",
    description: "Controlled editorial finish with neutral contrast and restrained punch.",
    category: "Editorial",
    settings: {
      realismIntensity: 0.83,
      weatheringIntensity: 0.18,
      reflectionIntensity: 0.4,
      vegetationNaturalness: 0.35,
      glassReflectionLevel: 0.43,
      concreteWearLevel: 0.18,
      shadowStrength: 0.44,
      ambientOcclusionLevel: 0.43,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
  {
    name: "Strict Geometry Preservation",
    description: "Maximum discipline for competition submissions and technical review renders.",
    category: "Precision",
    settings: {
      realismIntensity: 0.76,
      weatheringIntensity: 0.12,
      reflectionIntensity: 0.32,
      vegetationNaturalness: 0.3,
      glassReflectionLevel: 0.34,
      concreteWearLevel: 0.14,
      shadowStrength: 0.38,
      ambientOcclusionLevel: 0.4,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
  {
    name: "High-End Architectural Photography",
    description: "Luxury visualization polish with premium photographic restraint.",
    category: "Photography",
    settings: {
      realismIntensity: 0.93,
      weatheringIntensity: 0.22,
      reflectionIntensity: 0.68,
      vegetationNaturalness: 0.42,
      glassReflectionLevel: 0.74,
      concreteWearLevel: 0.17,
      shadowStrength: 0.54,
      ambientOcclusionLevel: 0.49,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
  {
    name: "Competition Presentation Quality",
    description: "Sharper presentation contrast and material legibility for competition boards.",
    category: "Presentation",
    settings: {
      realismIntensity: 0.91,
      weatheringIntensity: 0.24,
      reflectionIntensity: 0.57,
      vegetationNaturalness: 0.38,
      glassReflectionLevel: 0.61,
      concreteWearLevel: 0.26,
      shadowStrength: 0.59,
      ambientOcclusionLevel: 0.56,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
  {
    name: "Industrial Weathered Materials",
    description: "Believable wear, grime, and concrete aging for logistics and industrial scenes.",
    category: "Materials",
    settings: {
      realismIntensity: 0.9,
      weatheringIntensity: 0.7,
      reflectionIntensity: 0.38,
      vegetationNaturalness: 0.28,
      glassReflectionLevel: 0.34,
      concreteWearLevel: 0.74,
      shadowStrength: 0.58,
      ambientOcclusionLevel: 0.61,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
  {
    name: "Minimal Clean Marketing Style",
    description: "Clean, premium marketing render finish with limited grit and calm lighting.",
    category: "Marketing",
    settings: {
      realismIntensity: 0.82,
      weatheringIntensity: 0.08,
      reflectionIntensity: 0.52,
      vegetationNaturalness: 0.34,
      glassReflectionLevel: 0.58,
      concreteWearLevel: 0.06,
      shadowStrength: 0.41,
      ambientOcclusionLevel: 0.36,
      strictGeometryPreservation: true,
      avoidHallucinations: true,
    },
  },
];

/**
 * The platform admin account. Created automatically by the seed so the
 * very first run already has a user who can approve incoming
 * registrations.
 *
 * passwordHash is intentionally left null. Sprint 2.3 added a "first
 * login sets the password" branch to loginLocalProfile() — so the very
 * first sign-in at /login as info@g2amarketing.hu will store whatever
 * password is supplied (subject to the 8-char minimum), and every
 * subsequent sign-in uses the normal compare path. No psql gymnastics
 * required.
 *
 * The matching email also drives ADMIN_NOTIFY_EMAIL (see appEnv).
 */
const ADMIN_EMAIL = "info@g2amarketing.hu";
const ADMIN_NAME = "G2A Marketing";

async function main() {
  const prisma = new PrismaClient();

  // ── Preset catalogue ───────────────────────────────────────────────────
  for (const preset of DEFAULT_PRESET_CATALOG) {
    await prisma.preset.upsert({
      where: { name: preset.name },
      update: {
        description: preset.description,
        category: preset.category,
        settingsJson: JSON.stringify(preset.settings),
      },
      create: {
        name: preset.name,
        description: preset.description,
        category: preset.category,
        settingsJson: JSON.stringify(preset.settings),
      },
    });
  }

  // ── Admin account ──────────────────────────────────────────────────────
  // Upsert: if it already exists, force role=admin + status=approved
  // but DO NOT touch its passwordHash (so a rotated password sticks).
  // If it doesn't exist yet, create it with the placeholder hash that
  // can't actually sign anyone in.
  const adminExisting = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  if (adminExisting) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        role: "admin",
        status: "approved",
        approvedAt: new Date(),
      },
    });
    console.log(`[seed] admin ${ADMIN_EMAIL} already exists — role/status reaffirmed.`);
  } else {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash: null,
        role: "admin",
        status: "approved",
        approvedAt: new Date(),
      },
    });
    console.log(
      `[seed] created admin ${ADMIN_EMAIL}. Sign in once at /login with any 8+ char password — that first password gets hashed in and reused on every later sign-in.`
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});

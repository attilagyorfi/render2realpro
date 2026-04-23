import { prisma } from "@/lib/prisma";
import { DEFAULT_PRESET_CATALOG } from "@/config/presets";

export async function ensureDefaultPresets() {
  const count = await prisma.preset.count();

  if (count > 0) {
    return;
  }

  await prisma.preset.createMany({
    data: DEFAULT_PRESET_CATALOG.map((preset) => ({
      name: preset.name,
      description: preset.description,
      category: preset.category,
      settingsJson: JSON.stringify(preset.settings),
    })),
  });
}

export async function getPresets() {
  await ensureDefaultPresets();

  const presets = await prisma.preset.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return presets.map((preset) => ({
    ...preset,
    settings: JSON.parse(preset.settingsJson),
  }));
}

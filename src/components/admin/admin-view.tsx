"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppFrame } from "@/components/layout/app-frame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type PresetSettings = {
  realismIntensity?: number;
  weatheringIntensity?: number;
  reflectionIntensity?: number;
  vegetationNaturalness?: number;
  glassReflectionLevel?: number;
  concreteWearLevel?: number;
  shadowStrength?: number;
  ambientOcclusionLevel?: number;
  strictGeometryPreservation?: boolean;
  avoidHallucinations?: boolean;
};

type Preset = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  settingsJson: string;
  createdAt: string;
};

const SETTING_KEYS: Array<{ key: keyof PresetSettings; label: string; type: "slider" | "bool" }> = [
  { key: "realismIntensity", label: "Realizmus intenzitás", type: "slider" },
  { key: "weatheringIntensity", label: "Mállás intenzitás", type: "slider" },
  { key: "reflectionIntensity", label: "Visszaverődés intenzitás", type: "slider" },
  { key: "vegetationNaturalness", label: "Növényzet természetessége", type: "slider" },
  { key: "glassReflectionLevel", label: "Üveg visszaverődés", type: "slider" },
  { key: "concreteWearLevel", label: "Beton kopás szint", type: "slider" },
  { key: "shadowStrength", label: "Árnyék erőssége", type: "slider" },
  { key: "ambientOcclusionLevel", label: "Ambient occlusion", type: "slider" },
  { key: "strictGeometryPreservation", label: "Geometria megőrzés", type: "bool" },
  { key: "avoidHallucinations", label: "Hallucinációk elkerülése", type: "bool" },
];

function fetchJson<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  return fetch(url, options).then((r) => {
    if (!r.ok) return r.json().then((b) => Promise.reject(new Error(b.error ?? "Request failed")));
    return r.json() as Promise<T>;
  });
}

function PresetEditor({
  preset,
  onClose,
  onSaved,
}: {
  preset: Preset | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = preset === null;
  const [name, setName] = useState(preset?.name ?? "");
  const [description, setDescription] = useState(preset?.description ?? "");
  const [category, setCategory] = useState(preset?.category ?? "");
  const [settings, setSettings] = useState<PresetSettings>(() => {
    if (!preset) {
      return {
        realismIntensity: 0.85,
        weatheringIntensity: 0.3,
        reflectionIntensity: 0.5,
        vegetationNaturalness: 0.4,
        glassReflectionLevel: 0.5,
        concreteWearLevel: 0.3,
        shadowStrength: 0.55,
        ambientOcclusionLevel: 0.5,
        strictGeometryPreservation: true,
        avoidHallucinations: true,
      };
    }
    try { return JSON.parse(preset.settingsJson); } catch { return {}; }
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = { name, description, category, settingsJson: JSON.stringify(settings) };
      if (isNew) {
        return fetchJson("/api/admin/presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      return fetchJson(`/api/admin/presets/${preset!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast.success(isNew ? "Preset létrehozva" : "Preset mentve");
      onSaved();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Mentés sikertelen"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-[24px] border border-white/10 bg-[#0d1117] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-100">
            {isNew ? "Új preset" : "Preset szerkesztése"}
          </h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Név</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[10px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50"
              placeholder="Preset neve"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Leírás</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-[10px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50 resize-none"
              placeholder="Rövid leírás"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Kategória</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-[10px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50"
              placeholder="pl. Commercial, Residential, Industrial"
            />
          </div>

          <div className="border-t border-white/8 pt-4">
            <p className="text-xs font-medium text-zinc-400 mb-3">Beállítások</p>
            <div className="space-y-3">
              {SETTING_KEYS.map(({ key, label, type }) => {
                if (type === "bool") {
                  const val = settings[key] as boolean | undefined;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">{label}</span>
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, [key]: !val }))}
                        className={`relative h-5 w-9 rounded-full transition-colors ${val ? "bg-violet-600" : "bg-white/10"}`}
                      >
                        <span
                          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`}
                        />
                      </button>
                    </div>
                  );
                }
                const val = (settings[key] as number | undefined) ?? 0.5;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">{label}</span>
                      <span className="text-xs text-zinc-500">{Math.round(val * 100)}</span>
                    </div>
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      value={[val]}
                      onValueChange={(vals) => setSettings((s) => ({ ...s, [key]: Array.isArray(vals) ? vals[0] : vals }))}
                      className="h-1"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10 text-zinc-400" onClick={onClose}>
            Mégse
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name || !category}
          >
            <Save className="size-3.5 mr-1.5" />
            {saveMutation.isPending ? "Mentés..." : "Mentés"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminView() {
  const queryClient = useQueryClient();
  const [editingPreset, setEditingPreset] = useState<Preset | null | undefined>(undefined);

  const { data, isLoading } = useQuery<{ presets: Preset[] }>({
    queryKey: ["admin-presets"],
    queryFn: () => fetchJson("/api/admin/presets"),
  });

  const deletePresetMutation = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/admin/presets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Preset törölve");
      queryClient.invalidateQueries({ queryKey: ["admin-presets"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Törlés sikertelen"),
  });

  const presets = data?.presets ?? [];
  const categories = [...new Set(presets.map((p) => p.category))].sort();

  return (
    <AppFrame eyebrow="Platform administration" title="Admin">
      <div className="space-y-6">
        {/* Preset Editor Section */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preset könyvtár</CardTitle>
                <CardDescription>
                  AI generálási presetek kezelése — létrehozás, szerkesztés, törlés.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0"
                onClick={() => setEditingPreset(null)}
              >
                <Plus className="size-3.5 mr-1.5" />
                Új preset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-zinc-500">Betöltés...</div>
            ) : presets.length === 0 ? (
              <div className="text-sm text-zinc-500">Még nincsenek presetek.</div>
            ) : (
              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat}>
                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-600 mb-2">{cat}</p>
                    <div className="space-y-1.5">
                      {presets
                        .filter((p) => p.category === cat)
                        .map((preset) => {
                          let settings: PresetSettings = {};
                          try { settings = JSON.parse(preset.settingsJson); } catch { /* noop */ }
                          return (
                            <div
                              key={preset.id}
                              className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-white/3 px-4 py-3"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-200 truncate">{preset.name}</p>
                                {preset.description && (
                                  <p className="text-xs text-zinc-500 truncate mt-0.5">{preset.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {typeof settings.realismIntensity === "number" && (
                                  <Badge variant="outline" className="border-violet-500/20 text-violet-400 text-[0.6rem]">
                                    R {Math.round(settings.realismIntensity * 100)}
                                  </Badge>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingPreset(preset)}
                                  className="flex size-7 items-center justify-center rounded-[8px] border border-white/10 bg-white/4 text-zinc-500 hover:bg-white/8 hover:text-zinc-200 transition"
                                >
                                  <Edit2 className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Törlöd a "${preset.name}" presetet?`)) {
                                      deletePresetMutation.mutate(preset.id);
                                    }
                                  }}
                                  className="flex size-7 items-center justify-center rounded-[8px] border border-white/10 bg-white/4 text-zinc-500 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400 transition"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Placeholder cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Tenant overview</CardTitle>
              <CardDescription>
                Placeholder for future SaaS tenants, organizations, and subscription visibility.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This area will later manage engineering offices, visualization studios, and platform-level access.
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Usage governance</CardTitle>
              <CardDescription>
                Placeholder for provider quotas, export policy, and generation audit controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              The admin surface is intentionally lightweight in this phase, but the route is ready.
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preset editor modal */}
      {editingPreset !== undefined && (
        <PresetEditor
          preset={editingPreset}
          onClose={() => setEditingPreset(undefined)}
          onSaved={() => {
            setEditingPreset(undefined);
            queryClient.invalidateQueries({ queryKey: ["admin-presets"] });
          }}
        />
      )}
    </AppFrame>
  );
}

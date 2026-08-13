# Golden set — quality eval source images

Drop reference architectural renders here that we want the realism pass to be
measured against. Every time we change the pipeline (model, prompt,
ControlNet weights, refine pass on/off, etc.) we run them all through the new
config and compare side-by-side with the previous run — that is the
**measurement substrate** the development plan (`§4.4 Kalibrációs és
kiértékelési keret`) calls for.

## What to put here

Source CG/3D-modeled architectural renders, the same kind of file an end user
would upload from SketchUp, Revit, ArchiCAD, Twinmotion, Lumion, etc. Real
photographs are out of scope — the realism pass is calibrated for "CG →
photoreal", so the input distribution matters.

## Formats

`.png`, `.jpg`, `.jpeg`, `.webp` — anything the production app accepts. Mixed
formats in one folder are fine; the harness picks them up by extension.

## How many

Plan §4.4 asks for **15–25 images**, varied across:

- **Building type**: industrial / commercial / residential / public
- **Scene scope**: full-building / detail / aerial / street-level
- **Lighting**: bright midday / golden hour / overcast / dusk / night
- **Materials present**: concrete / steel / glass / brick / wood / vegetation
- **Render quality of source**: rough sketch-grade / mid / near-photoreal

A small set is OK to start (3-5 covering the main types you ship), and grow
from there. Better to run the harness on 3 images today than to wait until
you have 20.

## Naming

Short and descriptive, lowercase-kebab, optionally with a sequence number:

```
warehouse-aerial-01.png
residential-villa-day-01.jpg
office-tower-dusk-01.webp
```

The filename ends up in the side-by-side HTML report; readable names help
when scanning a 20-image run.

## These images are LOCAL-ONLY (not committed to git)

The image files you drop here are **gitignored** — only this README and a
`.gitkeep` are tracked. A realistic golden set is 200MB+ of PNGs, which does
not belong in git history (it would bloat every clone forever). Keep your
golden set locally; if you want it backed up or shared with a teammate, use
cloud storage or a zip outside the repo, not a commit.

## What NOT to put here

- Real photographs (out of distribution for the realism pass)
- Pre-generated AI outputs from a prior run — those go under `eval/results/`
  automatically.

## Running the harness

From the repo root:

```bash
# baseline run with current defaults (canny+depth, strength 0.55, cn 0.6)
npm run eval

# render-to-real fidelity config: clean edges (teed instead of canny),
# low denoise, tight controlnet — preserves engineering geometry, only
# swaps materials
npm run eval -- --controls=teed,depth --strength=0.35 --controlnet-scale=0.80 --label=teed-s035-cn080

# same knobs but keep canny, to isolate the edge-detector variable
npm run eval -- --controls=canny,depth --strength=0.35 --controlnet-scale=0.80 --label=canny-s035-cn080
```

### CLI flags

| Flag | Default | Meaning |
|------|---------|---------|
| `--controls=a,b` | `canny,depth` | Which ControlNets drive generation. Supported: **canny, teed, depth, normal, openpose, segmentation**. (lineart/mlsd are NOT on this endpoint — use **teed** for clean low-noise edges.) |
| `--strength=N` | `0.55` | img2img denoise. Lower = more faithful to source geometry; 0.30–0.40 is the render-to-real sweet spot. |
| `--controlnet-scale=N` | `0.6` | ControlNet conditioning weight. Higher (0.75–0.85) forces textures to stay inside the source lines. |
| `--steps=N` | `30` | Inference steps. |
| `--guidance=N` | `7.5` | CFG scale. |
| `--prompt=SET` | `fidelity` | Prompt set: `fidelity` (camera/PBR-materials + geometry-drift bans) or `legacy` (scene-material heavy). |
| `--label=NAME` | `default` | Result-folder suffix + report title. |

Output lands under `eval/results/<isotimestamp>-<label>/` with per-image
`*.input.*`, `*.output.jpg`, `*.meta.json`, plus an `index.html` for the
side-by-side review and a `manifest.json` (records every parameter + the
full prompt text, so any run is reproducible from its manifest alone).

### The point of the label

Give each experiment a distinct `--label` so runs don't collide and you
can open two `index.html` tabs side by side. The winning config gets
promoted into the production pipeline (`src/services/providers/fal-provider.ts`).

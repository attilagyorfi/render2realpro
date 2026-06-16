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

## What NOT to put here

- Real photographs (out of distribution for the realism pass)
- Anything you can't share — these images will sit in the repo. If you want
  a private set, place them under `eval/golden-private/` (gitignored as a
  matter of policy, not currently configured but easy to add).
- Pre-generated AI outputs from a prior run — those go under `eval/results/`
  automatically.

## Running the harness

From the repo root:

```bash
# baseline run with current defaults
npm run eval

# tweak a single parameter
npm run eval -- --strength=0.65 --label=stronger-denoise

# fewer steps for a fast iteration
npm run eval -- --steps=18 --label=fast-iter
```

Output lands under `eval/results/<isotimestamp>-<label>/` with per-image
`*.input.jpg`, `*.output.jpg`, `*.meta.json`, plus an `index.html` that
opens locally for the side-by-side review and a `manifest.json` that records
which parameters produced this run.

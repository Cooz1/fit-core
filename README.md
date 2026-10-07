# @tactical/fit-core

The part of the fit model that is not about rifles.

Two apps place things on other things and save where they went — the **weapon configurator**
(accessories on rails) and **Loadout Engine** (pouches on webbing). The maths, the GLB pipeline,
the look, the record shape and the catalogue bookkeeping are the same in both. This is that.

It exists because the alternative was hand-kept copies, and those have cost three bugs in this
project: the bipod's rail section rendering 193 mm apart between the two apps, the adapters missing
from the calibration list, and the PMAG missing after them. **Import it. Do not copy out of it.**

## What is in here

| Module | What it is |
|---|---|
| `records` | The `Transform` record — identity, clone, round — and the validators for a transform, a normalize spec and a material override. |
| `transform` | Transform ↔ `THREE.Matrix4`, `composeMountAndOffset`, mount-relative read/write. The composition rule is `final = mount ∘ offset`, offset applied in the mount's local frame. |
| `loader` | `loadGLB` with Draco, the GLB cache, and `normalizeModel` — orient forward/up, scale, centre. |
| `look` | `applyLook`, the studio environment, and the two tuned constants. The values in here are calibrated against the black-level table; do not change them casually. |
| `instances` | Repeating one placed object along an axis (ring pairs, rail sections). |
| `cart` | Handing a build to a storefront cart, with the platform fallbacks. |
| `catalogue` | `variantCollisions` and `catalogueSplit` — two checks that are about product bookkeeping, not about rails. They return findings, not prose, so each app writes its own warning naming its own files. |

## What is deliberately NOT in here

Rails, calibers, slot vocabulary, PALS cells, webbing patches. Those are domain, and domain stays
in its app. `railFace()` and `railClash()` in particular look generic and are not: `railClash` is
1-D on purpose, and `railFace` excludes `userData.mounted` and `userData.factoryPart` for reasons
that only make sense on a rifle.

## Install

```bash
npm install github:Cooz1/fit-core#v0.1.0
```

Pin a tag. An unpinned dependency is a hand-kept copy with extra steps — the whole point is that
a version change shows up as a diff in `package.json`.

`three` is a **peer dependency**. Supply one copy from the consuming app; two copies of three in a
bundle break `instanceof` across the boundary and add ~600 kB.

## Working on it locally

```bash
npm install ../fit-core          # with install-links=true in the consumer's .npmrc
```

`install-links=true` matters: without it npm symlinks the package, Node then resolves `three` from
the package's real path rather than the consumer's `node_modules`, and the peer dependency is not
found. With it, npm materialises a real directory — the same shape a git dependency installs as.

## Provenance

Every module here except `catalogue.js` was moved from
`weapon-configurator/src/shared/` byte-identical. `records.js` was extracted from that app's
`schema.js` by line range for the same reason. `catalogue.js` is the one rewrite: the logic is the
same, but the warning prose moved back to the app, because a shared check must not tell a loadout
author to go and edit `catalog-real.json`.

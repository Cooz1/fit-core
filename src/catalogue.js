// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE CHECKS — the two that are about product bookkeeping, not about rails.
//
// Both were written in weapon-configurator/src/shared/schema.js and both apply unchanged to
// any catalogue of sellable things, so the LOGIC lives here. The PROSE does not: each app's
// warning names its own files, its own id-minting script, its own consumers. So these return
// findings, and the app formats them. That keeps a shared check from telling a loadout author
// to go and edit catalog-real.json.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Products the cart cannot tell apart, or cannot name at all.
 *
 * `variantId` is what a cart line actually orders on — the store resolves the product from that,
 * not from the name or the price. Two products sharing one is therefore not a display bug: a build
 * containing both sends two lines the cart reads as the same item, and the first anyone knows of it
 * is the wrong thing in the box.
 *
 * A sellable adapter appears in BOTH lists — itself, and the product copy projected from it —
 * carrying the same id and variantId, because it is the same thing. Collapsed by id first, or every
 * mount reports a collision with itself.
 *
 * @param {{id:string, variantId?:number|string, sku?:string, price?:number}[]} accessories
 * @param {{id:string, variantId?:number|string, sku?:string, price?:number}[]} adapters
 * @returns {{ missing: object[], collisions: [string|number, object[]][] }}
 */
export function variantCollisions(accessories = [], adapters = []) {
  const all = [...new Map([...(accessories || []), ...(adapters || [])].map((a) => [a.id, a])).values()];
  const seen = new Map(), missing = [];
  for (const a of all) {
    if (a.variantId == null) { missing.push(a); continue; }
    if (!seen.has(a.variantId)) seen.set(a.variantId, []);
    seen.get(a.variantId).push(a);
  }
  const collisions = [...seen.entries()].filter(([, group]) => group.length > 1);
  return { missing, collisions };
}

/**
 * Products that two parallel catalogue files disagree about the existence of.
 *
 * Wherever a registry (geometry and look) and a storefront (price, variant, stock) are hand-kept
 * side by side, a product added to one and forgotten in the other vanishes from one app silently.
 * This has cost this project twice: the adapters, then the PMAG. Routing did not fix it; only
 * naming both directions does.
 *
 * Ids in `exempt` are skipped in both directions — for things that live in one file by design.
 *
 * @param {{id:string}[]} registry
 * @param {{id:string}[]} products
 * @param {{id:string}[]} exempt   not expected in both
 * @returns {{ onlyInStorefront: object[], onlyInRegistry: object[] }}
 */
export function catalogueSplit(registry = [], products = [], exempt = []) {
  const skip = new Set((exempt || []).map((a) => a.id));
  const keep = (list) => new Map((list || []).filter((d) => d && d.id && !skip.has(d.id)).map((d) => [d.id, d]));
  const reg = keep(registry), shop = keep(products);
  return {
    onlyInStorefront: [...shop.values()].filter((d) => !reg.has(d.id)),
    onlyInRegistry: [...reg.values()].filter((d) => !shop.has(d.id)),
  };
}

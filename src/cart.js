// ─────────────────────────────────────────────────────────────────────────────
// ONE cart integration — the same contract the existing Loadout Engine uses.
//
// The Loadout Engine widget takes an injected  onAddToCart(loadout)  callback,
// and its Shopify theme block implements that as a POST to /cart/add.js with
//   { items: loadout.filter(p=>p.variant_id).map(p=>({id:Number(p.variant_id),quantity:1})),
//     sections: 'cart-drawer,cart-icon-bubble' }  + a Dawn cart refresh.
//
// The weapon viewer emits the SAME item shape (each line carries `variant_id`)
// and prefers the SAME injected onAddToCart. So a store wires cart ONCE and both
// the loadout configurator and the weapon configurator flow through it. When no
// host callback is present we fall back to the identical Shopify AJAX call, and
// only as a last resort to an event/postMessage (standalone demo).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CartLine
 * @property {number} [variant_id]  Shopify variant id (what /cart/add.js needs)
 * @property {number} quantity
 * @property {string} id
 * @property {string} [sku]
 * @property {string} name
 * @property {number} price
 * @property {string} [slot]
 */

/**
 * Add every selected line to the cart via the unified path.
 * @param {CartLine[]} items
 * @param {{ onAddToCart?: (items: CartLine[]) => any }} [opts]
 * @returns {Promise<{ via: 'onAddToCart'|'shopify-ajax'|'event', ok: boolean }>}
 */
export async function addAllToCart(items, { onAddToCart } = {}) {
  // 1) Host-injected callback — the SAME one the Loadout Engine widget receives.
  if (typeof onAddToCart === 'function') {
    await onAddToCart(items);
    return { via: 'onAddToCart', ok: true };
  }

  // 2) Standalone on a Shopify storefront → the identical /cart/add.js call.
  const lines = items.filter((i) => i.variant_id).map((i) => ({ id: Number(i.variant_id), quantity: i.quantity || 1 }));
  if (lines.length && typeof window !== 'undefined' && window.Shopify) {
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: lines, sections: 'cart-drawer,cart-icon-bubble' }),
      });
      const data = await res.json();
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: data, bubbles: true }));
      refreshDawnCart(data.sections);
      return { via: 'shopify-ajax', ok: res.ok };
    } catch (e) {
      /* fall through to the event path */
    }
  }

  // 3) Last resort (pure demo / non-Shopify embed): announce it.
  const detail = { items, total: items.reduce((s, i) => s + (i.price || 0), 0) };
  document.dispatchEvent(new CustomEvent('loadout:addtocart', { detail, bubbles: true }));
  if (typeof window !== 'undefined' && window.parent !== window) {
    window.parent.postMessage({ type: 'loadout:addtocart', detail }, '*');
  }
  return { via: 'event', ok: true };
}

// Patch Dawn's cart drawer + bubble from the section HTML /cart/add.js returns.
// Copied to match the Loadout Engine block; no-ops on non-Dawn themes.
function refreshDawnCart(sections) {
  if (!sections || typeof sections !== 'object') return;
  try {
    const parser = new DOMParser();
    if (sections['cart-icon-bubble']) {
      const nb = parser.parseFromString(sections['cart-icon-bubble'], 'text/html').getElementById('cart-icon-bubble');
      const ob = document.getElementById('cart-icon-bubble');
      if (nb && ob) ob.innerHTML = nb.innerHTML;
    }
    if (sections['cart-drawer']) {
      const nd = parser.parseFromString(sections['cart-drawer'], 'text/html').querySelector('cart-drawer');
      const od = document.querySelector('cart-drawer');
      if (nd && od) { od.className = nd.className; od.innerHTML = nd.innerHTML; }
    }
    const drawer = document.querySelector('cart-drawer');
    if (drawer && typeof drawer.open === 'function') drawer.open(new Event('click'));
  } catch { /* non-Dawn theme */ }
}

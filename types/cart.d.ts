export type CartLine = {
    /**
     * Shopify variant id (what /cart/add.js needs)
     */
    variant_id?: number;
    quantity: number;
    id: string;
    sku?: string;
    name: string;
    price: number;
    slot?: string;
};
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
export declare function addAllToCart(items: CartLine[], { onAddToCart }?: {
    onAddToCart?: (items: CartLine[]) => any;
}): Promise<{
    via: 'onAddToCart' | 'shopify-ajax' | 'event';
    ok: boolean;
}>;

import { pool } from "@/lib/db";
import { isUserKitchenAdmin } from "@/lib/kitchen";
import type { PantryItem, ShoppingListItem, Checkout, CheckoutWithDetails, CheckoutReceipt } from "@/types";
import path from "node:path";


/**
 * Fetches all pantry items for a kitchen.
 */
export async function getPantryItems(kitchenId: string): Promise<PantryItem[]> {
  const sql = `
    SELECT id, kitchen_id, name, is_out_of_stock, created_at, updated_at
    FROM pantry_items
    WHERE kitchen_id = $1
    ORDER BY name ASC
  `;
  const { rows } = await pool.query<PantryItem>(sql, [kitchenId]);
  return rows;
}

/**
 * Adds a new pantry item.
 */
export async function addPantryItem(kitchenId: string, name: string): Promise<PantryItem> {
  const cleanName = name?.trim();
  if (!cleanName) {
    throw new Error("Item name cannot be empty.");
  }

  const sql = `
    INSERT INTO pantry_items (kitchen_id, name, is_out_of_stock, created_at, updated_at)
    VALUES ($1, $2, FALSE, NOW(), NOW())
    RETURNING id, kitchen_id, name, is_out_of_stock, created_at, updated_at
  `;
  const { rows } = await pool.query<PantryItem>(sql, [kitchenId, cleanName]);
  return rows[0];
}

/**
 * Toggles a pantry item's stock status.
 * - Marking it out of stock automatically adds it to the shopping list (if not already there).
 * - Marking it back in stock removes any unpurchased shopping list entry that was auto-created for it.
 */
export async function setPantryItemStock(
  kitchenId: string,
  itemId: string,
  isOutOfStock: boolean
): Promise<PantryItem> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updateSql = `
      UPDATE pantry_items
      SET is_out_of_stock = $1, updated_at = NOW()
      WHERE id = $2 AND kitchen_id = $3
      RETURNING id, kitchen_id, name, is_out_of_stock, created_at, updated_at
    `;
    const { rows } = await client.query<PantryItem>(updateSql, [isOutOfStock, itemId, kitchenId]);
    if (rows.length === 0) {
      throw new Error("Pantry item not found in this kitchen.");
    }
    const item = rows[0];

    if (isOutOfStock) {
      const { rows: existingRows } = await client.query(
        `SELECT id FROM shopping_list_items
         WHERE kitchen_id = $1 AND pantry_item_id = $2 AND is_purchased = FALSE`,
        [kitchenId, itemId]
      );

      if (existingRows.length === 0) {
        await client.query(
          `INSERT INTO shopping_list_items (kitchen_id, pantry_item_id, name, is_purchased, created_at)
           VALUES ($1, $2, $3, FALSE, NOW())`,
          [kitchenId, itemId, item.name]
        );
      }
    } else {
      // Restocked: drop the auto-generated shopping list entry if it hasn't been purchased yet.
      await client.query(
        `DELETE FROM shopping_list_items
         WHERE kitchen_id = $1 AND pantry_item_id = $2 AND is_purchased = FALSE`,
        [kitchenId, itemId]
      );
    }

    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deletes a pantry item and removes any unpurchased shopping list entries linked to it.
 */
export async function deletePantryItem(kitchenId: string, itemId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM shopping_list_items WHERE pantry_item_id = $1 AND kitchen_id = $2 AND is_purchased = FALSE`,
      [itemId, kitchenId]
    );
    const result = await client.query(
      `DELETE FROM pantry_items WHERE id = $1 AND kitchen_id = $2`,
      [itemId, kitchenId]
    );
    await client.query("COMMIT");
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Puts all of a specific user's staged cart items back on the needed shopping list.
 * - Sets is_purchased = FALSE, purchased_by = NULL for that user's items in the kitchen.
 * - Sets is_out_of_stock = TRUE for any linked pantry items.
 * - Does NOT delete any rows.
 */
export async function clearUserCart(kitchenId: string, userId: string): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ id: string; pantry_item_id: string | null }>(
      `UPDATE shopping_list_items
       SET is_purchased = FALSE, purchased_by = NULL
       WHERE kitchen_id = $1
         AND purchased_by = $2
         AND is_purchased = TRUE
         AND checkout_id IS NULL
       RETURNING id, pantry_item_id`,
      [kitchenId, userId]
    );

    if (rows.length > 0) {
      const pantryItemIds = rows
        .map((r) => r.pantry_item_id)
        .filter((id): id is string => id !== null);

      if (pantryItemIds.length > 0) {
        await client.query(
          `UPDATE pantry_items
           SET is_out_of_stock = TRUE, updated_at = NOW()
           WHERE kitchen_id = $1 AND id = ANY($2::uuid[])`,
          [kitchenId, pantryItemIds]
        );
      }
    }

    await client.query("COMMIT");
    return rows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Legacy alias for clearing user's cart */
export const clearBoughtShoppingListItems = clearUserCart;

/**
 * Fetches all shopping list items for a kitchen (pending first) with user attribution for cart items.
 */
export async function getShoppingListItems(kitchenId: string): Promise<ShoppingListItem[]> {
  const sql = `
    SELECT
      sli.id,
      sli.kitchen_id,
      sli.pantry_item_id,
      sli.name,
      sli.item_price,
      sli.currency,
      sli.is_purchased,
      sli.purchased_by,
      sli.is_guest_staged,
      sli.checkout_id,
      sli.created_at,
      COALESCE(km.kitchen_display_name, u.username) AS purchased_by_name
    FROM shopping_list_items sli
    LEFT JOIN users u ON sli.purchased_by = u.id
    LEFT JOIN kitchen_members km ON km.kitchen_id = sli.kitchen_id AND km.user_id = sli.purchased_by
    LEFT JOIN checkouts c ON sli.checkout_id = c.id
    WHERE sli.kitchen_id = $1
      AND (sli.checkout_id IS NULL OR c.created_at >= NOW() - INTERVAL '24 hours' OR sli.created_at >= NOW() - INTERVAL '24 hours')
    ORDER BY (sli.is_purchased OR sli.is_guest_staged) ASC, sli.created_at ASC
  `;
  const { rows } = await pool.query<ShoppingListItem>(sql, [kitchenId]);
  return rows;
}


/**
 * Adds an ad-hoc / custom item to the shopping list with no pantry reference.
 */
export async function addCustomShoppingItem(
  kitchenId: string,
  name: string
): Promise<ShoppingListItem> {
  const cleanName = name?.trim();
  if (!cleanName) {
    throw new Error("Item name cannot be empty.");
  }

  const sql = `
    INSERT INTO shopping_list_items (kitchen_id, pantry_item_id, name, is_purchased, is_guest_staged, created_at)
    VALUES ($1, NULL, $2, FALSE, FALSE, NOW())
    RETURNING id, kitchen_id, pantry_item_id, name, is_purchased, purchased_by, is_guest_staged, checkout_id, created_at
  `;
  const { rows } = await pool.query<ShoppingListItem>(sql, [kitchenId, cleanName]);
  return rows[0];
}

/**
 * Marks a shopping list item as purchased/in-cart or unpurchased/needed.
 * If linked to a pantry item: marking purchased restocks it (is_out_of_stock = false),
 * unpurchased/returning to list marks it back as out-of-stock (is_out_of_stock = true).
 * Enforces ownership authorization: only the user who staged the item (or admin) can un-stage it.
 */
export async function togglePurchased(
  kitchenId: string,
  itemId: string,
  isPurchased: boolean,
  userId: string
): Promise<ShoppingListItem> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query<{
      id: string;
      is_purchased: boolean;
      purchased_by: string | null;
      is_guest_staged: boolean;
      checkout_id: string | null;
    }>(
      `SELECT id, is_purchased, purchased_by, is_guest_staged, checkout_id FROM shopping_list_items WHERE id = $1 AND kitchen_id = $2`,
      [itemId, kitchenId]
    );
    if (existingRows.length === 0) {
      throw new Error("Shopping list item not found.");
    }
    const existing = existingRows[0];
    if (existing.checkout_id) {
      throw new Error("This item has already been checked out.");
    }

    // Authorization checks
    if (!isPurchased && existing.is_purchased && existing.purchased_by && existing.purchased_by !== userId) {
      const adminRes = await client.query(
        `SELECT 1 FROM kitchen_members WHERE kitchen_id = $1 AND user_id = $2 AND role = 'ADMIN'`,
        [kitchenId, userId]
      );
      if (adminRes.rows.length === 0) {
        throw new Error("You cannot remove another member's item from their cart.");
      }
    }

    if (isPurchased && existing.is_purchased && existing.purchased_by && existing.purchased_by !== userId) {
      throw new Error("This item is already in another member's cart.");
    }

    const { rows } = await client.query<ShoppingListItem>(
      `UPDATE shopping_list_items
       SET is_purchased = $1, purchased_by = $2, is_guest_staged = FALSE
       WHERE id = $3 AND kitchen_id = $4
       RETURNING id, kitchen_id, pantry_item_id, name, is_purchased, purchased_by, is_guest_staged, checkout_id, created_at`,
      [isPurchased, isPurchased ? userId : null, itemId, kitchenId]
    );
    const item = rows[0];

    if (item.pantry_item_id) {
      await client.query(
        `UPDATE pantry_items SET is_out_of_stock = $1, updated_at = NOW()
         WHERE id = $2 AND kitchen_id = $3`,
        [!isPurchased, item.pantry_item_id, kitchenId]
      );
    }

    let purchasedByName: string | null = null;
    if (isPurchased && userId) {
      const userRes = await client.query<{ name: string }>(
        `SELECT COALESCE(km.kitchen_display_name, u.username) AS name
         FROM users u
         LEFT JOIN kitchen_members km ON km.kitchen_id = $1 AND km.user_id = u.id
         WHERE u.id = $2`,
        [kitchenId, userId]
      );
      purchasedByName = userRes.rows[0]?.name ?? null;
    }

    await client.query("COMMIT");
    return { ...item, purchased_by_name: purchasedByName };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Removes an item from the shopping list.
 * - If it's a pantry-linked item, resets is_out_of_stock = FALSE in pantry_items.
 * - If it's a custom item, deletes the record from shopping_list_items.
 * - Only the owner or an admin can delete an item currently staged in cart.
 */
export async function removeShoppingListItem(
  kitchenId: string,
  itemId: string,
  userId?: string
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query<{
      is_purchased: boolean;
      purchased_by: string | null;
      checkout_id: string | null;
      pantry_item_id: string | null;
    }>(
      `SELECT is_purchased, purchased_by, checkout_id, pantry_item_id FROM shopping_list_items WHERE id = $1 AND kitchen_id = $2`,
      [itemId, kitchenId]
    );
    if (existingRows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    const existing = existingRows[0];

    if (existing.is_purchased && existing.purchased_by && userId && existing.purchased_by !== userId) {
      const adminRes = await client.query(
        `SELECT 1 FROM kitchen_members WHERE kitchen_id = $1 AND user_id = $2 AND role = 'ADMIN'`,
        [kitchenId, userId]
      );
      if (adminRes.rows.length === 0) {
        throw new Error("You cannot delete an item staged in another member's cart.");
      }
    }

    await client.query(
      `DELETE FROM shopping_list_items WHERE id = $1 AND kitchen_id = $2`,
      [itemId, kitchenId]
    );

    const pantryItemId = existing.pantry_item_id;
    if (pantryItemId) {
      await client.query(
        `UPDATE pantry_items SET is_out_of_stock = FALSE, updated_at = NOW()
         WHERE id = $1 AND kitchen_id = $2`,
        [pantryItemId, kitchenId]
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


/**
 * Bundles all of a user's bought-but-uncheckedout items into one checkout.
 * Supports receiptless checkout (receiptFilename = null), optional note, and store name.
 */
export async function createCheckout(
  kitchenId: string,
  userId: string,
  receiptFilename?: string | null,
  options?: {
    storeName?: string | null;
    note?: string | null;
    totalAmount?: number;
    currency?: string;
  }
): Promise<Checkout> {
  const cleanFilename = receiptFilename?.trim()
    ? `/uploads/receipts/${path.basename(receiptFilename.trim())}`
    : null;
  const storeName = options?.storeName?.trim() || null;
  const note = options?.note?.trim() || null;
  const totalAmount = options?.totalAmount ?? 0;
  const rawCurrency = (options?.currency || "EUR").trim().toUpperCase();
  const currency = rawCurrency.length === 3 ? rawCurrency : "EUR";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: cartRows } = await client.query<{ id: string; pantry_item_id: string | null }>(
      `SELECT id, pantry_item_id FROM shopping_list_items
       WHERE kitchen_id = $1 AND purchased_by = $2 AND is_purchased = TRUE AND checkout_id IS NULL`,
      [kitchenId, userId]
    );
    if (cartRows.length === 0) {
      throw new Error("Your cart is empty.");
    }

    const { rows: checkoutRows } = await client.query<Checkout>(
      `INSERT INTO checkouts (kitchen_id, user_id, store_name, note, total_claimed_amount, total_receipt_amount, receipt_filename, is_refunded, currency, created_at)
       VALUES ($1, $2, $3, $4, $5, NULL, $6, FALSE, $7, NOW())
       RETURNING id, kitchen_id, user_id, store_name, note, total_claimed_amount, total_receipt_amount, receipt_filename, is_refunded, currency, created_at, refunded_at, receipt_deleted_at`,
      [kitchenId, userId, storeName, note, totalAmount, cleanFilename, currency]
    );
    const checkout = checkoutRows[0];

    await client.query(
      `UPDATE shopping_list_items SET checkout_id = $1, currency = $2, is_guest_staged = FALSE
       WHERE kitchen_id = $3 AND purchased_by = $4 AND is_purchased = TRUE AND checkout_id IS NULL`,
      [checkout.id, currency, kitchenId, userId]
    );

    // Restock any linked pantry items
    const pantryItemIds = cartRows
      .map((r) => r.pantry_item_id)
      .filter((id): id is string => id !== null);

    if (pantryItemIds.length > 0) {
      await client.query(
        `UPDATE pantry_items
         SET is_out_of_stock = FALSE, updated_at = NOW()
         WHERE kitchen_id = $1 AND id = ANY($2::uuid[])`,
        [kitchenId, pantryItemIds]
      );
    }

    await client.query("COMMIT");
    return checkout;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function attachItems(
  checkouts: (Checkout & { username: string | null })[],
  viewerSide: "admin" | "member"
): Promise<CheckoutWithDetails[]> {
  const deletedColumn = viewerSide === "admin" ? "deleted_by_admin_at" : "deleted_by_member_at";
  const results: CheckoutWithDetails[] = [];
  for (const checkout of checkouts) {
    const { rows: itemRows } = await pool.query<ShoppingListItem>(
      `SELECT id, kitchen_id, pantry_item_id, name, item_price, currency, is_purchased, purchased_by, is_guest_staged, checkout_id, created_at
       FROM shopping_list_items WHERE checkout_id = $1
       ORDER BY created_at ASC`,
      [checkout.id]
    );

    const { rows: allReceiptRows } = await pool.query<CheckoutReceipt>(
      `SELECT id, checkout_id, receipt_filename, created_at, deleted_by_admin_at, deleted_by_member_at
       FROM checkout_receipts WHERE checkout_id = $1 ORDER BY created_at ASC`,
      [checkout.id]
    );

    const visibleReceipts = allReceiptRows.filter(
      (r) => r.receipt_filename !== null && r[deletedColumn as "deleted_by_admin_at" | "deleted_by_member_at"] === null
    );

    results.push({
      ...checkout,
      items: itemRows,
      receipts: visibleReceipts,
      totalReceiptsEverAttached: allReceiptRows.length,
    });
  }
  return results;
}



/** Admin view: all checkouts in a kitchen, newest first, with buyer + items. */
export async function getKitchenCheckouts(kitchenId: string): Promise<CheckoutWithDetails[]> {
  const { rows } = await pool.query<Checkout & { username: string | null }>(
    `SELECT c.id, c.kitchen_id, c.user_id, c.store_name, c.note, c.total_claimed_amount, c.total_receipt_amount, c.receipt_filename, c.is_refunded, c.currency, c.created_at, c.refunded_at, c.receipt_deleted_at, u.username
     FROM checkouts c LEFT JOIN users u ON c.user_id = u.id
     WHERE c.kitchen_id = $1 ORDER BY c.created_at DESC`,
    [kitchenId]
  );
  return attachItems(rows, "admin");
}

/** A single user's own checkout history within a kitchen. */
export async function getUserCheckouts(kitchenId: string, userId: string): Promise<CheckoutWithDetails[]> {
  const { rows } = await pool.query<Checkout & { username: string | null }>(
    `SELECT c.id, c.kitchen_id, c.user_id, c.store_name, c.note, c.total_claimed_amount, c.total_receipt_amount, c.receipt_filename, c.is_refunded, c.currency, c.created_at, c.refunded_at, c.receipt_deleted_at, u.username
     FROM checkouts c LEFT JOIN users u ON c.user_id = u.id
     WHERE c.kitchen_id = $1 AND c.user_id = $2 ORDER BY c.created_at DESC`,
    [kitchenId, userId]
  );
  return attachItems(rows, "member");
}

/** Admin action: marks a checkout as refunded. Logic is a stub — flips a flag only. */
export async function refundCheckout(
  kitchenId: string,
  checkoutId: string,
  adminUserId: string
): Promise<Checkout> {
  const isAdmin = await isUserKitchenAdmin(kitchenId, adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Only kitchen admins can issue refunds.");
  }

  const { rows } = await pool.query<Checkout>(
    `UPDATE checkouts SET is_refunded = TRUE, refunded_at = NOW()
     WHERE id = $1 AND kitchen_id = $2
     RETURNING id, kitchen_id, user_id, receipt_filename, is_refunded, created_at, refunded_at`,
    [checkoutId, kitchenId]
  );
  if (rows.length === 0) {
    throw new Error("Checkout not found in this kitchen.");
  }
  return rows[0];
}

/**
 * Deletes a receipt on behalf of ONE side only (admin or member).
 * The underlying Blob file is only actually removed once BOTH sides
 * have deleted it (or the 30-day cron runs) — until then it just
 * disappears from the requesting side's own view.
 */
export async function deleteReceiptForSide(
  kitchenId: string,
  receiptId: string,
  userId: string,
  side: "admin" | "member"
): Promise<void> {
  const { rows } = await pool.query<{
    id: string;
    receipt_filename: string | null;
    deleted_by_admin_at: Date | null;
    deleted_by_member_at: Date | null;
    checkout_user_id: string;
    checkout_kitchen_id: string;
  }>(
    `SELECT cr.id, cr.receipt_filename, cr.deleted_by_admin_at, cr.deleted_by_member_at,
            c.user_id AS checkout_user_id, c.kitchen_id AS checkout_kitchen_id
     FROM checkout_receipts cr
     JOIN checkouts c ON cr.checkout_id = c.id
     WHERE cr.id = $1`,
    [receiptId]
  );
  if (rows.length === 0) throw new Error("Receipt not found.");
  const receipt = rows[0];
  if (receipt.checkout_kitchen_id !== kitchenId) {
    throw new Error("Receipt does not belong to this kitchen.");
  }

  if (side === "admin") {
    const isAdmin = await isUserKitchenAdmin(kitchenId, userId);
    if (!isAdmin) throw new Error("Unauthorized: Only kitchen admins can remove this.");
  } else if (receipt.checkout_user_id !== userId) {
    throw new Error("Unauthorized: This is not your purchase.");
  }

  const column = side === "admin" ? "deleted_by_admin_at" : "deleted_by_member_at";
  await pool.query(`UPDATE checkout_receipts SET ${column} = NOW() WHERE id = $1`, [receiptId]);

  const otherSideAlreadyDeleted =
    side === "admin" ? receipt.deleted_by_member_at !== null : receipt.deleted_by_admin_at !== null;

  if (otherSideAlreadyDeleted && receipt.receipt_filename) {
    try {
      await del(receipt.receipt_filename);
    } catch {
      // already gone — fine
    }
    await pool.query(`UPDATE checkout_receipts SET receipt_filename = NULL WHERE id = $1`, [receiptId]);
  }
}


/**
 * Atomically transfers guest-staged shopping list items to a logged-in user's active cart.
 * - Updates shopping_list_items setting is_purchased = true, purchased_by = userId, is_guest_staged = false.
 * - Restocks linked pantry items (is_out_of_stock = false).
 * - Ignores items that are already purchased, checked out, or deleted.
 */
export async function transferGuestCartToUser(
  kitchenId: string,
  itemIds: string[],
  userId: string
): Promise<number> {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return 0;
  }

  // Filter for valid UUID strings
  const validIds = itemIds.filter(
    (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
  if (validIds.length === 0) {
    return 0;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updateSql = `
      UPDATE shopping_list_items
      SET is_purchased = TRUE, purchased_by = $1, is_guest_staged = FALSE
      WHERE kitchen_id = $2
        AND id = ANY($3::uuid[])
        AND checkout_id IS NULL
      RETURNING id, pantry_item_id
    `;
    const { rows } = await client.query<{ id: string; pantry_item_id: string | null }>(
      updateSql,
      [userId, kitchenId, validIds]
    );

    if (rows.length > 0) {
      const pantryItemIds = rows
        .map((r) => r.pantry_item_id)
        .filter((id): id is string => id !== null);

      if (pantryItemIds.length > 0) {
        await client.query(
          `UPDATE pantry_items
           SET is_out_of_stock = FALSE, updated_at = NOW()
           WHERE kitchen_id = $1 AND id = ANY($2::uuid[])`,
          [kitchenId, pantryItemIds]
        );
      }
    }

    await client.query("COMMIT");
    return rows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Stages or unstages an item anonymously from the guest supermarket view.
 * Updates shopping_list_items.is_guest_staged flag.
 */
export async function stageGuestShoppingItem(
  kitchenId: string,
  itemId: string,
  isStaged: boolean
): Promise<ShoppingListItem> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query<{
      id: string;
      is_purchased: boolean;
      purchased_by: string | null;
      checkout_id: string | null;
      pantry_item_id: string | null;
    }>(
      `SELECT id, is_purchased, purchased_by, checkout_id, pantry_item_id
       FROM shopping_list_items
       WHERE id = $1 AND kitchen_id = $2`,
      [itemId, kitchenId]
    );

    if (existingRows.length === 0) {
      throw new Error("Shopping list item not found.");
    }
    const existing = existingRows[0];
    if (existing.checkout_id) {
      throw new Error("This item has already been checked out.");
    }
    if (existing.is_purchased && existing.purchased_by) {
      throw new Error("This item is already in a member's cart.");
    }

    const { rows } = await client.query<ShoppingListItem>(
      `UPDATE shopping_list_items
       SET is_guest_staged = $1, is_purchased = FALSE, purchased_by = NULL
       WHERE id = $2 AND kitchen_id = $3
       RETURNING id, kitchen_id, pantry_item_id, name, is_purchased, purchased_by, is_guest_staged, checkout_id, created_at`,
      [isStaged, itemId, kitchenId]
    );
    const item = rows[0];

    if (item.pantry_item_id) {
      await client.query(
        `UPDATE pantry_items SET is_out_of_stock = $1, updated_at = NOW()
         WHERE id = $2 AND kitchen_id = $3`,
        [!isStaged, item.pantry_item_id, kitchenId]
      );
    }

    await client.query("COMMIT");
    return { ...item, purchased_by_name: isStaged ? "Guest" : null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Allows a household admin to unstage an abandoned guest item.
 * Sets is_guest_staged = FALSE, returning it to Needed Items.
 */
export async function unstageGuestItem(
  kitchenId: string,
  itemId: string,
  adminUserId: string
): Promise<ShoppingListItem> {
  const isAdmin = await isUserKitchenAdmin(kitchenId, adminUserId);
  if (!isAdmin) {
    throw new Error("Unauthorized: Only kitchen admins can unstage guest items.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<ShoppingListItem>(
      `UPDATE shopping_list_items
       SET is_guest_staged = FALSE, is_purchased = FALSE, purchased_by = NULL
       WHERE id = $1 AND kitchen_id = $2
       RETURNING id, kitchen_id, pantry_item_id, name, is_purchased, purchased_by, is_guest_staged, checkout_id, created_at`,
      [itemId, kitchenId]
    );

    if (rows.length === 0) {
      throw new Error("Guest staged item not found.");
    }
    const item = rows[0];

    if (item.pantry_item_id) {
      await client.query(
        `UPDATE pantry_items SET is_out_of_stock = TRUE, updated_at = NOW()
         WHERE id = $1 AND kitchen_id = $2`,
        [item.pantry_item_id, kitchenId]
      );
    }

    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

import { del } from "@vercel/blob";

/**
 * Deletes receipt files (from Vercel Blob) for checkouts refunded 30+ days ago,
 * across every kitchen. Meant to run on a schedule (Vercel Cron), not per-request.
 */
export async function cleanupAllExpiredReceipts(): Promise<number> {
  const { rows } = await pool.query<{ id: string; receipt_filename: string }>(
    `SELECT cr.id, cr.receipt_filename
     FROM checkout_receipts cr
     JOIN checkouts c ON cr.checkout_id = c.id
     WHERE c.is_refunded = TRUE
       AND c.refunded_at < NOW() - INTERVAL '30 days'
       AND cr.receipt_filename IS NOT NULL`
  );

  for (const row of rows) {
    try {
      await del(row.receipt_filename);
    } catch {
      // already gone — fine
    }
    await pool.query(
      `UPDATE checkout_receipts SET receipt_filename = NULL WHERE id = $1`,
      [row.id]
    );
  }

  return rows.length;
}




import { pool } from "@/lib/db";
import { isUserKitchenAdmin } from "@/lib/kitchen";
import type { PantryItem, ShoppingListItem, Checkout, CheckoutWithDetails } from "@/types";


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
 * Clears and removes all bought/cart items that have not been checked out yet for a kitchen.
 */
export async function clearBoughtShoppingListItems(kitchenId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM shopping_list_items WHERE kitchen_id = $1 AND is_purchased = TRUE AND checkout_id IS NULL`,
    [kitchenId]
  );
  return result.rowCount ?? 0;
}

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
      sli.is_purchased,
      sli.purchased_by,
      sli.checkout_id,
      sli.created_at,
      COALESCE(km.kitchen_display_name, u.username) AS purchased_by_name
    FROM shopping_list_items sli
    LEFT JOIN users u ON sli.purchased_by = u.id
    LEFT JOIN kitchen_members km ON km.kitchen_id = sli.kitchen_id AND km.user_id = sli.purchased_by
    WHERE sli.kitchen_id = $1
    ORDER BY sli.is_purchased ASC, sli.created_at ASC
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
    INSERT INTO shopping_list_items (kitchen_id, pantry_item_id, name, is_purchased, created_at)
    VALUES ($1, NULL, $2, FALSE, NOW())
    RETURNING id, kitchen_id, pantry_item_id, name, is_purchased, purchased_by, checkout_id, created_at
  `;
  const { rows } = await pool.query<ShoppingListItem>(sql, [kitchenId, cleanName]);
  return rows[0];
}

/**
 * Marks a shopping list item as purchased/in-cart or unpurchased/needed.
 * If linked to a pantry item: marking purchased restocks it (is_out_of_stock = false),
 * unpurchased/returning to list marks it back as out-of-stock (is_out_of_stock = true).
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

    const { rows: existingRows } = await client.query(
      `SELECT checkout_id FROM shopping_list_items WHERE id = $1 AND kitchen_id = $2`,
      [itemId, kitchenId]
    );
    if (existingRows.length === 0) {
      throw new Error("Shopping list item not found.");
    }
    if (existingRows[0].checkout_id) {
      throw new Error("This item has already been checked out.");
    }

    const { rows } = await client.query<ShoppingListItem>(
      `UPDATE shopping_list_items
       SET is_purchased = $1, purchased_by = $2
       WHERE id = $3 AND kitchen_id = $4
       RETURNING id, kitchen_id, pantry_item_id, name, is_purchased, purchased_by, checkout_id, created_at`,
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
 * - If it's a custom item, simply deletes the record from shopping_list_items.
 */
export async function removeShoppingListItem(kitchenId: string, itemId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ pantry_item_id: string | null }>(
      `DELETE FROM shopping_list_items
       WHERE id = $1 AND kitchen_id = $2
       RETURNING pantry_item_id`,
      [itemId, kitchenId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const pantryItemId = rows[0].pantry_item_id;
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
 * Bundles all of a user's bought-but-uncheckedout items into one checkout with a receipt filename (stub — no real file storage yet).
 */
export async function createCheckout(
  kitchenId: string,
  userId: string,
  receiptFilename: string
): Promise<Checkout> {
  const cleanFilename = receiptFilename?.trim();
  if (!cleanFilename) {
    throw new Error("A receipt file is required to checkout.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: cartRows } = await client.query(
      `SELECT id FROM shopping_list_items
       WHERE kitchen_id = $1 AND purchased_by = $2 AND is_purchased = TRUE AND checkout_id IS NULL`,
      [kitchenId, userId]
    );
    if (cartRows.length === 0) {
      throw new Error("Your cart is empty.");
    }

    const { rows: checkoutRows } = await client.query<Checkout>(
      `INSERT INTO checkouts (kitchen_id, user_id, receipt_filename, is_refunded, created_at)
       VALUES ($1, $2, $3, FALSE, NOW())
       RETURNING id, kitchen_id, user_id, receipt_filename, is_refunded, created_at, refunded_at`,
      [kitchenId, userId, cleanFilename]
    );
    const checkout = checkoutRows[0];

    await client.query(
      `UPDATE shopping_list_items SET checkout_id = $1
       WHERE kitchen_id = $2 AND purchased_by = $3 AND is_purchased = TRUE AND checkout_id IS NULL`,
      [checkout.id, kitchenId, userId]
    );

    await client.query("COMMIT");
    return checkout;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function attachItems(checkouts: (Checkout & { username: string | null })[]): Promise<CheckoutWithDetails[]> {
  const results: CheckoutWithDetails[] = [];
  for (const checkout of checkouts) {
    const { rows: itemRows } = await pool.query<ShoppingListItem>(
      `SELECT id, kitchen_id, pantry_item_id, name, is_purchased, purchased_by, checkout_id, created_at
       FROM shopping_list_items WHERE checkout_id = $1`,
      [checkout.id]
    );
    results.push({ ...checkout, items: itemRows });
  }
  return results;
}

/** Admin view: all checkouts in a kitchen, newest first, with buyer + items. */
export async function getKitchenCheckouts(kitchenId: string): Promise<CheckoutWithDetails[]> {
  const { rows } = await pool.query<Checkout & { username: string | null }>(
    `SELECT c.id, c.kitchen_id, c.user_id, c.receipt_filename, c.is_refunded, c.created_at, c.refunded_at, u.username
     FROM checkouts c LEFT JOIN users u ON c.user_id = u.id
     WHERE c.kitchen_id = $1 ORDER BY c.created_at DESC`,
    [kitchenId]
  );
  return attachItems(rows);
}

/** A single user's own checkout history within a kitchen. */
export async function getUserCheckouts(kitchenId: string, userId: string): Promise<CheckoutWithDetails[]> {
  const { rows } = await pool.query<Checkout & { username: string | null }>(
    `SELECT c.id, c.kitchen_id, c.user_id, c.receipt_filename, c.is_refunded, c.created_at, c.refunded_at, u.username
     FROM checkouts c LEFT JOIN users u ON c.user_id = u.id
     WHERE c.kitchen_id = $1 AND c.user_id = $2 ORDER BY c.created_at DESC`,
    [kitchenId, userId]
  );
  return attachItems(rows);
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

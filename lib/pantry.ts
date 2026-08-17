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
 * Deletes a pantry item.
 */
export async function deletePantryItem(kitchenId: string, itemId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM pantry_items WHERE id = $1 AND kitchen_id = $2`,
    [itemId, kitchenId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Fetches all shopping list items for a kitchen (pending first).
 */
export async function getShoppingListItems(kitchenId: string): Promise<ShoppingListItem[]> {
  const sql = `
    SELECT id, kitchen_id, pantry_item_id, name, is_purchased, purchased_by, checkout_id, created_at
    FROM shopping_list_items
    WHERE kitchen_id = $1
    ORDER BY is_purchased ASC, created_at ASC
  `;
  const { rows } = await pool.query<ShoppingListItem>(sql, [kitchenId]);
  return rows;
}


/**
 * Marks a shopping list item as purchased/unpurchased.
 * Marking it purchased also restocks the linked pantry item.
 * Un-marking it puts the pantry item back to out-of-stock.
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

    await client.query(
      `UPDATE pantry_items SET is_out_of_stock = $1, updated_at = NOW()
       WHERE id = $2 AND kitchen_id = $3`,
      [!isPurchased, item.pantry_item_id, kitchenId]
    );

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
 * Removes an item from the shopping list.
 */
export async function removeShoppingListItem(kitchenId: string, itemId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM shopping_list_items WHERE id = $1 AND kitchen_id = $2`,
    [itemId, kitchenId]
  );
  return (result.rowCount ?? 0) > 0;
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

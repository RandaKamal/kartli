#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import Module from "node:module";

const KITCHEN_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const ITEM_1 = "33333333-3333-4333-8333-333333333333";
const ITEM_2 = "44444444-4444-4444-8444-444444444444";
const ITEM_3 = "55555555-5555-4555-8555-555555555555";
const PANTRY_1 = "66666666-6666-4666-8666-666666666666";
const PANTRY_2 = "77777777-7777-4777-8777-777777777777";
const CHECKOUT_1 = "88888888-8888-4888-8888-888888888888";
const CHECKOUT_2 = "99999999-9999-4999-8999-999999999999";

interface MockShoppingItem {
  id: string;
  kitchen_id: string;
  pantry_item_id: string | null;
  name: string;
  is_in_cart: boolean;
  is_purchased: boolean;
  purchased_by: string | null;
  is_guest_staged: boolean;
  checkout_id: string | null;
  item_price: number | null;
  currency: string | null;
}

interface MockPantryItem {
  id: string;
  kitchen_id: string;
  is_out_of_stock: boolean;
}

let mockSession: { user: { id: string } } | null = { user: { id: USER_ID } };
let checkoutSeq = 0;
let shoppingItems: MockShoppingItem[] = [];
let pantryItems: MockPantryItem[] = [];
let checkouts: Array<{ id: string; store_name: string | null; total_claimed_amount: number }> = [];
let revalidatedPaths: string[] = [];

function resetDb() {
  checkoutSeq = 0;
  checkouts = [];
  revalidatedPaths = [];
  pantryItems = [
    { id: PANTRY_1, kitchen_id: KITCHEN_ID, is_out_of_stock: true },
    { id: PANTRY_2, kitchen_id: KITCHEN_ID, is_out_of_stock: false },
  ];
  shoppingItems = [
    {
      id: ITEM_1,
      kitchen_id: KITCHEN_ID,
      pantry_item_id: PANTRY_1,
      name: "Milch",
      is_in_cart: true,
      is_purchased: false,
      purchased_by: USER_ID,
      is_guest_staged: false,
      checkout_id: null,
      item_price: null,
      currency: null,
    },
    {
      id: ITEM_2,
      kitchen_id: KITCHEN_ID,
      pantry_item_id: PANTRY_2,
      name: "Käse",
      is_in_cart: true,
      is_purchased: false,
      purchased_by: USER_ID,
      is_guest_staged: false,
      checkout_id: null,
      item_price: null,
      currency: null,
    },
    {
      id: ITEM_3,
      kitchen_id: KITCHEN_ID,
      pantry_item_id: null,
      name: "Hafermilch",
      is_in_cart: true,
      is_purchased: false,
      purchased_by: USER_ID,
      is_guest_staged: false,
      checkout_id: null,
      item_price: null,
      currency: null,
    },
  ];
}

const mockPool = {
  async query(sql: string, params: any[] = []) {
    if (sql.includes("FROM shopping_list_items") && sql.includes("LOWER(name) = LOWER($2)")) {
      const [kitchenId, name] = params;
      const found = shoppingItems.find(
        (i) =>
          i.kitchen_id === kitchenId &&
          i.name.toLowerCase() === String(name).toLowerCase() &&
          !i.is_purchased &&
          i.checkout_id === null
      );
      return { rows: found ? [{ id: found.id }] : [] };
    }
    return { rows: [] };
  },
  async connect() {
    return {
      async query(sql: string, params: any[] = []) {
        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
          return { rows: [], rowCount: 0 };
        }

        // Select user's cart items (must match is_in_cart = TRUE OR is_purchased = TRUE)
        if (sql.includes("SELECT id, pantry_item_id FROM shopping_list_items")) {
          const [kitchenId, userId, ids] = params;
          const hasExplicitIds = Array.isArray(ids);
          const rows = shoppingItems
            .filter(
              (i) =>
                i.kitchen_id === kitchenId &&
                i.purchased_by === userId &&
                (i.is_in_cart || i.is_purchased) &&
                !i.is_guest_staged &&
                i.checkout_id === null &&
                (!hasExplicitIds || ids.includes(i.id))
            )
            .map((i) => ({ id: i.id, pantry_item_id: i.pantry_item_id }));
          return { rows, rowCount: rows.length };
        }

        // Select valid items for submitReceiptCheckoutAction
        if (
          sql.includes("SELECT id, pantry_item_id") &&
          sql.includes("FROM shopping_list_items") &&
          sql.includes("id = ANY($1::uuid[])")
        ) {
          const [ids, kitchenId, userId] = params;
          const rows = shoppingItems
            .filter(
              (i) =>
                ids.includes(i.id) &&
                i.kitchen_id === kitchenId &&
                i.purchased_by === userId &&
                (i.is_in_cart || i.is_purchased) &&
                !i.is_guest_staged &&
                i.checkout_id === null
            )
            .map((i) => ({ id: i.id, pantry_item_id: i.pantry_item_id }));
          return { rows, rowCount: rows.length };
        }

        // Insert checkout
        if (sql.includes("INSERT INTO checkouts")) {
          const id = checkoutSeq++ === 0 ? CHECKOUT_1 : CHECKOUT_2;
          checkouts.push({
            id,
            store_name: params[2],
            total_claimed_amount: params[4],
          });
          return { rows: [{ id }], rowCount: 1 };
        }

        if (sql.includes("INSERT INTO checkout_receipts")) {
          return { rows: [], rowCount: 1 };
        }

        // Update shopping_list_items for receiptless checkout
        if (
          sql.includes("UPDATE shopping_list_items") &&
          sql.includes("SET is_purchased = TRUE, is_in_cart = FALSE, checkout_id = $1")
        ) {
          const [checkoutId, currency, ids, kitchenId, userId] = params;
          let count = 0;
          for (const item of shoppingItems) {
            if (
              ids.includes(item.id) &&
              item.kitchen_id === kitchenId &&
              item.purchased_by === userId &&
              item.checkout_id === null
            ) {
              item.is_purchased = true;
              item.is_in_cart = false;
              item.checkout_id = checkoutId;
              item.currency = currency;
              item.is_guest_staged = false;
              count++;
            }
          }
          return { rows: [], rowCount: count };
        }

        // Update single shopping_list_items for receipt checkout
        if (
          sql.includes("UPDATE shopping_list_items") &&
          sql.includes("item_price = $2")
        ) {
          const [checkoutId, price, currency, itemId, kitchenId, userId] = params;
          let count = 0;
          for (const item of shoppingItems) {
            if (
              item.id === itemId &&
              item.kitchen_id === kitchenId &&
              item.purchased_by === userId &&
              item.checkout_id === null
            ) {
              item.is_purchased = true;
              item.is_in_cart = false;
              item.checkout_id = checkoutId;
              item.item_price = price;
              item.currency = currency;
              item.is_guest_staged = false;
              count++;
            }
          }
          return { rows: [], rowCount: count };
        }

        // Return items to shopping queue
        if (
          sql.includes("UPDATE shopping_list_items") &&
          sql.includes("SET is_in_cart = FALSE, is_purchased = FALSE, purchased_by = NULL")
        ) {
          const [ids, kitchenId, userId] = params;
          const returnedRows: Array<{ pantry_item_id: string | null }> = [];
          for (const item of shoppingItems) {
            if (
              ids.includes(item.id) &&
              item.kitchen_id === kitchenId &&
              item.purchased_by === userId &&
              item.checkout_id === null
            ) {
              item.is_in_cart = false;
              item.is_purchased = false;
              item.purchased_by = null;
              item.is_guest_staged = false;
              returnedRows.push({ pantry_item_id: item.pantry_item_id });
            }
          }
          return { rows: returnedRows, rowCount: returnedRows.length };
        }

        // Restock or out-of-stock pantry_items
        if (sql.includes("UPDATE pantry_items SET is_out_of_stock = FALSE")) {
          if (Array.isArray(params[0])) {
            const [ids, kitchenId] = params;
            for (const p of pantryItems) {
              if (ids.includes(p.id) && p.kitchen_id === kitchenId) p.is_out_of_stock = false;
            }
          } else {
            const [id, kitchenId] = params;
            for (const p of pantryItems) {
              if (p.id === id && p.kitchen_id === kitchenId) p.is_out_of_stock = false;
            }
          }
          return { rows: [], rowCount: 1 };
        }

        if (sql.includes("UPDATE pantry_items SET is_out_of_stock = TRUE")) {
          const [ids, kitchenId] = params;
          for (const p of pantryItems) {
            if (ids.includes(p.id) && p.kitchen_id === kitchenId) p.is_out_of_stock = true;
          }
          return { rows: [], rowCount: 1 };
        }

        throw new Error(`Unhandled SQL in mock: ${sql}`);
      },
      release() {},
    };
  },
};

// Intercept Next.js & DB modules before importing app/actions/scan-receipt.ts
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/auth") {
    return { auth: async () => mockSession };
  }
  if (request === "next/cache") {
    return {
      revalidatePath: (p: string) => {
        revalidatedPaths.push(p);
      },
    };
  }
  if (request === "@/lib/kitchen") {
    return {
      getUserMembership: async () => ({
        kitchen_id: KITCHEN_ID,
        user_id: USER_ID,
        role: "MEMBER",
        kitchen_display_name: "Colin",
      }),
    };
  }
  if (request === "@/lib/push") {
    return {
      notifyKitchen: async () => {},
      pushMessages: { refundPending: () => ({ title: "", body: "" }) },
    };
  }
  if (request === "@/lib/db") {
    return { pool: mockPool };
  }
  return originalLoad.call(this, request, parent, isMain);
};

async function run() {
  const {
    receiptlessCheckoutAction,
    submitReceiptCheckoutAction,
  } = await import("../app/actions/scan-receipt");

  // 1. Direct receiptless checkout with basket-staged items (is_in_cart = true, is_purchased = false)
  resetDb();
  const fd1 = new FormData();
  fd1.append("kitchenId", KITCHEN_ID);
  fd1.append("storeName", "Lidl");
  fd1.append("totalAmount", "12.50");
  fd1.append("currency", "EUR");
  fd1.append("note", "Wocheneinkauf");
  fd1.append(
    "itemIds",
    JSON.stringify([
      { id: ITEM_1, name: "Milch" },
      { id: ITEM_2, name: "Käse" },
    ])
  );

  const res1 = await receiptlessCheckoutAction(fd1);
  assert.equal(res1.ok, true);
  assert.equal(res1.success, true);
  if (res1.ok) {
    assert.equal(res1.checkoutId, CHECKOUT_1);
    assert.equal(res1.totalClaimedAmount, 12.5);
  }
  assert.equal(shoppingItems.find((i) => i.id === ITEM_1)?.is_purchased, true);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_1)?.is_in_cart, false);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_1)?.checkout_id, CHECKOUT_1);
  assert.equal(pantryItems.find((p) => p.id === PANTRY_1)?.is_out_of_stock, false);
  console.log("✅ Test 1 passed: Direct receiptless checkout with is_in_cart=true items");

  // 2. Failed receipt scan -> fallback to receiptless + unmatched items ("forgot" vs "return")
  resetDb();
  const fd2 = new FormData();
  fd2.append("kitchenId", KITCHEN_ID);
  fd2.append("storeName", "EDEKA");
  fd2.append("totalAmount", "4.20");
  fd2.append("itemIds", JSON.stringify([{ id: ITEM_1, name: "Milch" }]));
  fd2.append("returnedItemIds", JSON.stringify([{ id: ITEM_2, name: "Käse" }]));

  const res2 = await receiptlessCheckoutAction(fd2);
  assert.equal(res2.ok, true);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_1)?.checkout_id, CHECKOUT_1);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_2)?.is_in_cart, false);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_2)?.is_purchased, false);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_2)?.purchased_by, null);
  assert.equal(pantryItems.find((p) => p.id === PANTRY_2)?.is_out_of_stock, true);
  console.log("✅ Test 2 passed: Failed scan fallback + unmatched 'forgot' & 'return' items");

  // 3. Optimistic temp-* ID resolution
  resetDb();
  const fd3 = new FormData();
  fd3.append("kitchenId", KITCHEN_ID);
  fd3.append("storeName", "REWE");
  fd3.append("totalAmount", "2.99");
  fd3.append("itemIds", JSON.stringify([{ id: "temp-1731700000", name: "Hafermilch" }]));

  const res3 = await receiptlessCheckoutAction(fd3);
  assert.equal(res3.ok, true);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_3)?.checkout_id, CHECKOUT_1);
  console.log("✅ Test 3 passed: Optimistic temp-* ID resolved without Postgres 22P02 error");

  // 4. Double-submit & unauthenticated safety (never throws -> never triggers React #441)
  const doubleSubmitRes = await receiptlessCheckoutAction(fd3);
  assert.equal(doubleSubmitRes.ok, false);
  assert.equal(doubleSubmitRes.success, false);
  if (!doubleSubmitRes.ok) {
    assert.ok(doubleSubmitRes.error.length > 0);
  }

  mockSession = null;
  const unauthRes = await receiptlessCheckoutAction(fd3);
  assert.equal(unauthRes.ok, false);
  assert.equal(unauthRes.success, false);
  if (!unauthRes.ok) {
    assert.equal(unauthRes.error, "You must be logged in.");
  }
  mockSession = { user: { id: USER_ID } };
  console.log("✅ Test 4 passed: Double-submit & unauthenticated calls return { ok: false } without throwing");

  // 5. submitReceiptCheckoutAction with is_in_cart=true + returnedItemIds
  resetDb();
  const fd5 = new FormData();
  fd5.append("kitchenId", KITCHEN_ID);
  fd5.append("currency", "EUR");
  fd5.append("receiptPaths", JSON.stringify([]));
  fd5.append("storeName", "ALDI Süd");
  fd5.append("note", "");
  fd5.append("totalReceiptAmount", "1.49");
  fd5.append("totalClaimedAmount", "1.49");
  fd5.append(
    "matchedItems",
    JSON.stringify([
      {
        shopping_list_item_id: ITEM_1,
        name: "Milch",
        price: 1.49,
        pantry_item_id: PANTRY_1,
      },
    ])
  );
  fd5.append("returnedItemIds", JSON.stringify([{ id: ITEM_2, name: "Käse" }]));

  const res5 = await submitReceiptCheckoutAction(fd5);
  assert.equal(res5.ok, true);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_1)?.checkout_id, CHECKOUT_1);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_1)?.is_in_cart, false);
  assert.equal(shoppingItems.find((i) => i.id === ITEM_2)?.purchased_by, null);
  console.log("✅ Test 5 passed: submitReceiptCheckoutAction with matched + returned items");

  console.log("\nALL CHECKOUT FLOW TESTS PASSED!");
}

run().catch((err) => {
  console.error("Checkout flow test failed:", err);
  process.exit(1);
});

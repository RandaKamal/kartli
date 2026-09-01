# Database Schema: kartli Core Architecture

This document outlines the PostgreSQL database schema for **kartli**. It powers email-free credentials authentication (JWT strategy), multi-tenant kitchen management with customizable space contexts (Flatshare, Family, Office, Neutral), tokenized invites, pantry tracking, ad-hoc shopping lists, disposable guest access tokens, and AI-assisted receipt refund workflows.

---

## 1. Custom Types

* `kitchen_role`: `ENUM('ADMIN', 'MEMBER')`
* `kitchen_space_type`: `ENUM('FLATSHARE', 'FAMILY', 'OFFICE', 'NEUTRAL')`

---

## 2. Schema Tables

### `users`
Stores registered user credentials and account timestamps.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)**: Unique user identifier.
* `username` (VARCHAR(255), Unique, NOT NULL): Unique login handle.
* `password_hash` (TEXT, NOT NULL): Bcrypt-hashed password.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`): Account creation timestamp.
* `updated_at` (TIMESTAMPTZ, Default: `NOW()`): Last update timestamp.

---

### `kitchens`
Represents a shared kitchen / household space.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)**: Primary key.
* `name` (VARCHAR(255), NOT NULL): Kitchen display name.
* `space_type` (ENUM: `kitchen_space_type`, Default: `'FLATSHARE'`, NOT NULL): Contextual space preset (`'FLATSHARE'`, `'FAMILY'`, `'OFFICE'`, `'NEUTRAL'`) dynamically controlling UI terminology (e.g., Roommates vs. Family vs. Team vs. Members).
* `public_view_token` (VARCHAR(255), Unique, NOT NULL): Secure, regeneratable token for unauthenticated supermarket read-only guest access.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`): Creation timestamp.
* `updated_at` (TIMESTAMPTZ, Default: `NOW()`): Last update timestamp.

---

### `kitchen_members`
Represents kitchen memberships, permissions, and claimable invite slots.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)**: Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)**: Associated kitchen.
* `user_id` **(FK -> `users.id`, ON DELETE SET NULL, Nullable)**: Linked user account (`NULL` until invite token is claimed).
* `kitchen_display_name` (VARCHAR(255), NOT NULL): Name assigned to the slot by the admin.
* `role` (ENUM: `kitchen_role`, Default: `'MEMBER'`, NOT NULL): Member permissions.
* `invite_token` (VARCHAR(255), Unique, Nullable): Secure one-time claim token (`NULL` once claimed).
* `joined_at` (TIMESTAMPTZ, Nullable): Timestamp when the invite was accepted (`NOW()` for creator).
* `created_at` (TIMESTAMPTZ, Default: `NOW()`): Record creation timestamp.
* **Constraints**: `UNIQUE(kitchen_id, user_id)`

---

### `pantry_items`
Persistent inventory of shared staples (spices, oil, sponges, cleaning supplies).
* `id` **(PK, UUID, Default: `gen_random_uuid()`)**: Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)**: Associated kitchen.
* `name` (VARCHAR(255), NOT NULL): Item name.
* `is_out_of_stock` (BOOLEAN, Default: `false`, NOT NULL): Empty alert status trigger.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`): Item creation timestamp.
* `updated_at` (TIMESTAMPTZ, Default: `NOW()`): Last update timestamp.

---

### `shopping_list_items`
Active shopping list entries. Supports synced pantry items, free ad-hoc custom items, authenticated member cart staging, itemized receipt prices, and anonymous guest cart reservations.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)**: Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)**: Associated kitchen.
* `pantry_item_id` **(FK -> `pantry_items.id`, ON DELETE CASCADE, Nullable)**: Linked pantry item (`NULL` for custom/ad-hoc entries).
* `name` (VARCHAR(255), NOT NULL): Item name.
* `item_price` (NUMERIC(10, 2), Nullable): Individual price extracted from matched receipt line item or manually entered.
* `is_purchased` (BOOLEAN, Default: `false`, NOT NULL): Checked/purchased status.
* `purchased_by` **(FK -> `users.id`, ON DELETE SET NULL, Nullable)**: User who staged or completed the purchase (`NULL` for guest-staged items).
* `is_guest_staged` (BOOLEAN, Default: `false`, NOT NULL): Flag indicating the item is currently reserved in an unauthenticated guest's active cart.
* `checkout_id` **(FK -> `checkouts.id`, ON DELETE SET NULL, Nullable)**: Associated refund/receipt batch.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`): Entry creation timestamp.

---

### `checkouts`
Receipt upload batches and manual checkouts for cost reimbursement.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)**: Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)**: Associated kitchen.
* `user_id` **(FK -> `users.id`, ON DELETE CASCADE, NOT NULL)**: User requesting the refund.
* `store_name` (VARCHAR(255), Nullable): Detected supermarket name or manually entered merchant.
* `note` (TEXT, Nullable): Optional note or message left by the user for the admin.
* `total_claimed_amount` (NUMERIC(10, 2), Default: `0.00`, NOT NULL): Total amount claimed for household reimbursement.
* `total_receipt_amount` (NUMERIC(10, 2), Nullable): Overall gross sum on receipt (null for receiptless checkouts).
* `receipt_filename` (VARCHAR(255), Nullable): Stored receipt image path/filename (`NULL` if checked out without receipt).
* `is_refunded` (BOOLEAN, Default: `false`, NOT NULL): Admin resolution status.
* `refunded_at` (TIMESTAMPTZ, Nullable): Timestamp when admin settled the refund.
* `receipt_deleted_at` (TIMESTAMPTZ, Nullable): Timestamp when receipt image was deleted.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`): Checkout creation timestamp.

---

## 3. Core Workflows

### Dynamic Space Context & Terminology
- Contextual terms propagate across UI based on `kitchens.space_type` (`FLATSHARE`, `FAMILY`, `OFFICE`, `NEUTRAL`).

### Receipt Scanning & Direct Checkout
- Users can checkout via OCR scanning or complete a quick receiptless checkout with an optional note for the admin.
- Images are purged upon settlement or via 14-day safety TTL.

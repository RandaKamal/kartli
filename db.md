# Database Schema: kartli Core Architecture

This document outlines the PostgreSQL database schema for **kartli**. It powers email-free credentials authentication (JWT strategy), multi-tenant kitchen management with customizable space contexts (Flatshare, Family, Neutral), tokenized invites, pantry tracking, ad-hoc shopping lists, disposable guest access tokens, and receipt refund workflows.

---

## 1. Custom Types

* `kitchen_role`: `ENUM('ADMIN', 'MEMBER')`
* `kitchen_space_type`: `ENUM('FLATSHARE', 'FAMILY', 'NEUTRAL')`

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
* `space_type` (ENUM: `kitchen_space_type`, Default: `'FLATSHARE'`, NOT NULL): Contextual space preset (`'FLATSHARE'`, `'FAMILY'`, `'NEUTRAL'`) dynamically controlling UI terminology (e.g. Roommates vs. Family Members vs. Members).
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
Active shopping list entries. Supports synced pantry items, free ad-hoc custom items, authenticated member cart staging, and anonymous guest cart reservations.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)**: Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)**: Associated kitchen.
* `pantry_item_id` **(FK -> `pantry_items.id`, ON DELETE CASCADE, Nullable)**: Linked pantry item (`NULL` for custom/ad-hoc entries).
* `name` (VARCHAR(255), NOT NULL): Item name.
* `is_purchased` (BOOLEAN, Default: `false`, NOT NULL): Checked/purchased status.
* `purchased_by` **(FK -> `users.id`, ON DELETE SET NULL, Nullable)**: User who staged or completed the purchase (`NULL` for guest-staged items).
* `is_guest_staged` (BOOLEAN, Default: `false`, NOT NULL): Flag indicating the item is currently reserved in an unauthenticated guest's active cart.
* `checkout_id` **(FK -> `checkouts.id`, ON DELETE SET NULL, Nullable)**: Associated refund/receipt batch.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`): Entry creation timestamp.

---

### `checkouts`
Receipt upload batches for cost reimbursement.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)**: Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)**: Associated kitchen.
* `user_id` **(FK -> `users.id`, ON DELETE CASCADE, NOT NULL)**: User requesting the refund.
* `receipt_filename` (VARCHAR(255), NOT NULL): Stored receipt image path/filename.
* `is_refunded` (BOOLEAN, Default: `false`, NOT NULL): Admin resolution status.
* `refunded_at` (TIMESTAMPTZ, Nullable): Timestamp when admin approved and marked as settled.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`): Upload timestamp.

---

## 3. Core Workflows & Dynamic Terminology

### Dynamic Space Context & Terminology
- When `kitchens.space_type` is set:
  - `'FLATSHARE'`: UI labels refer to **Roommates / Flatmates** (e.g., "Active Roommates", "Waiting for flatmate to claim").
  - `'FAMILY'`: UI labels refer to **Family Members** (e.g., "Active Family", "Waiting for family member").
  - `'NEUTRAL'`: UI labels refer to **Members** (e.g., "Active Members", "Household Members").

### Disposable Supermarket Guest Link
- The `kitchens.public_view_token` is unique and can be regenerated on demand by household admins in Kitchen Settings.
- Regenerating replaces the token with a cryptographically random value, instantly invalidating previous links.

### Anonymous Guest Cart Staging & Handover
- Guest check-offs set `is_guest_staged = true` and persist in client cookie `kartli_guest_cart_[kitchenId]`.
- Claimed automatically by member upon subsequent login.

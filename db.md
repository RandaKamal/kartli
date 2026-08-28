# Database Schema: kartli Core Architecture

This document outlines the PostgreSQL database schema for **kartli**. It powers email-free credentials authentication (JWT strategy), multi-tenant kitchen management with tokenized invites, pantry tracking, ad-hoc shopping lists, and receipt refund workflows.

---

## 1. Schema Tables

### `users`
Stores registered user credentials and account timestamps.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)** — Unique user identifier.
* `username` (VARCHAR(255), Unique, NOT NULL) — Unique login handle.
* `password_hash` (TEXT, NOT NULL) — Bcrypt-hashed password.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`) — Account creation timestamp.
* `updated_at` (TIMESTAMPTZ, Default: `NOW()`) — Last update timestamp.

---

### `kitchens`
Represents a shared kitchen / household space.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)** — Primary key.
* `name` (VARCHAR(255), NOT NULL) — Kitchen display name.
* `public_view_token` (VARCHAR(255), Unique, NOT NULL) — Secure token for unauthenticated supermarket read-only guest access.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`) — Creation timestamp.
* `updated_at` (TIMESTAMPTZ, Default: `NOW()`) — Last update timestamp.

---

### `kitchen_members`
Represents kitchen memberships, permissions, and claimable invite slots.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)** — Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)** — Associated kitchen.
* `user_id` **(FK -> `users.id`, ON DELETE SET NULL, Nullable)** — Linked user account (`NULL` until invite token is claimed).
* `kitchen_display_name` (VARCHAR(255), NOT NULL) — Name assigned to the slot by the admin.
* `role` (ENUM: `'ADMIN'`, `'MEMBER'`, Default: `'MEMBER'`, NOT NULL) — Member permissions.
* `invite_token` (VARCHAR(255), Unique, Nullable) — Secure one-time claim token (`NULL` once claimed).
* `joined_at` (TIMESTAMPTZ, Nullable) — Timestamp when the invite was accepted (`NOW()` for creator).
* `created_at` (TIMESTAMPTZ, Default: `NOW()`) — Record creation timestamp.
* **Constraints:** `UNIQUE(kitchen_id, user_id)`

---

### `pantry_items`
Persistent inventory of shared staples (spices, oil, sponges, cleaning supplies).
* `id` **(PK, UUID, Default: `gen_random_uuid()`)** — Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)** — Associated kitchen.
* `name` (VARCHAR(255), NOT NULL) — Item name.
* `is_out_of_stock` (BOOLEAN, Default: `false`, NOT NULL) — Empty alert status trigger.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`) — Item creation timestamp.
* `updated_at` (TIMESTAMPTZ, Default: `NOW()`) — Last update timestamp.

---

### `shopping_list_items`
Active shopping list entries. Supports both synced pantry items and free ad-hoc custom items.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)** — Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)** — Associated kitchen.
* `pantry_item_id` **(FK -> `pantry_items.id`, ON DELETE CASCADE, Nullable)** — Linked pantry item (`NULL` for custom/ad-hoc entries).
* `name` (VARCHAR(255), NOT NULL) — Item name.
* `is_purchased` (BOOLEAN, Default: `false`, NOT NULL) — Checked/purchased status.
* `purchased_by` **(FK -> `users.id`, ON DELETE SET NULL, Nullable)** — User who completed the purchase.
* `checkout_id` **(FK -> `checkouts.id`, ON DELETE SET NULL, Nullable)** — Associated refund/receipt batch.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`) — Entry creation timestamp.

---

### `checkouts`
Receipt upload batches for cost reimbursement.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)** — Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, NOT NULL)** — Associated kitchen.
* `user_id` **(FK -> `users.id`, ON DELETE CASCADE, NOT NULL)** — User requesting the refund.
* `receipt_filename` (VARCHAR(255), NOT NULL) — Stored receipt image path/filename.
* `is_refunded` (BOOLEAN, Default: `false`, NOT NULL) — Admin resolution status.
* `refunded_at` (TIMESTAMPTZ, Nullable) — Timestamp when admin approved and marked as settled.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`) — Upload timestamp.

---

## 2. Core Workflows & Logic

### Authentication (Credentials + JWT)
- Pure username/password signup with `bcryptjs` hashing.
- Client session maintained via secure JWT cookies (no database session lookups needed).
- Session object exposes `session.user.id` and `session.user.username`.

### Kitchen Invite & Claim Flow
1. **Creation**: Admin creates a kitchen. Admin is inserted as `ADMIN` with `joined_at = NOW()`. Invited names are created with `user_id = NULL` and unique `invite_token` values.
2. **Claiming (`/invite/[token]`)**:
   - If not authenticated: saves `pending_invite_token` cookie and prompts sign-up/login.
   - If authenticated: links `user_id = session.user.id`, sets `joined_at = NOW()`, nullifies `invite_token`, and routes to kitchen dashboard.

### Pantry vs. Shopping List Mechanics
- **Pantry Empty Alert**: Marking a pantry item as empty sets `pantry_items.is_out_of_stock = true` and creates an entry in `shopping_list_items` referencing `pantry_item_id`.
- **Custom Entries**: Creating an ad-hoc shopping item inserts a row into `shopping_list_items` with `pantry_item_id = NULL`.
- **Purchase & Clear**: Purchased items link to a `checkouts` batch. Removing a pantry-linked shopping list item resets `is_out_of_stock = false` on the associated `pantry_items` record.

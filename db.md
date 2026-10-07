# Database Schema: kartli Core Architecture

This document outlines the PostgreSQL database schema for **kartli**. It powers credentials authentication (JWT strategy), multi-tenant kitchen management with customizable space contexts (Flatshare, Family, Neutral, Office), member permission management, staple pantry tracking with proposal approvals, ad-hoc shopping lists and cart sync, web push notifications, AI-assisted receipt checkouts, and Neon Auth integration.

---

## 1. Custom Types / Enums

* **`kitchen_role`**: `ENUM('ADMIN', 'MEMBER')`
  * Requires uppercase enum values (`'ADMIN'`, `'MEMBER'`).
* **`kitchen_space_type`**: `ENUM('FLATSHARE', 'FAMILY', 'NEUTRAL', 'OFFICE')`
  * Requires uppercase enum values (`'FLATSHARE'`, `'FAMILY'`, `'NEUTRAL'`, `'OFFICE'`).

---

## 2. Core Domain Tables (`public` Schema)

### `users`
Stores registered user credentials, profile preferences, and account metadata.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | **PK**, `DEFAULT gen_random_uuid()` | Unique user identifier. |
| `username` | `VARCHAR(255)` | `NOT NULL`, **UNIQUE** (`users_username_key`) | Unique login handle. |
| `password_hash` | `TEXT` | `NOT NULL` | Bcrypt-hashed password string. |
| `preferred_currency` | `VARCHAR(3)` | `NOT NULL`, `DEFAULT 'EUR'` | ISO-4217 Currency code (e.g., `'EUR'`, `'CHF'`, `'USD'`, `'GBP'`). |
| `has_completed_tour` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Flag indicating if user completed or skipped the onboarding tour. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Account creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Last account update timestamp. |

* **Indexes**:
  * `users_pkey` UNIQUE (`id`)
  * `users_username_key` UNIQUE (`username`)

---

### `kitchens`
Represents a shared kitchen / household space.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | **PK**, `DEFAULT gen_random_uuid()` | Unique kitchen identifier. |
| `name` | `VARCHAR(255)` | `NOT NULL` | Kitchen display name. |
| `space_type` | `kitchen_space_type` | `NOT NULL`, `DEFAULT 'FLATSHARE'` | Contextual space preset (`'FLATSHARE'`, `'FAMILY'`, `'NEUTRAL'`, `'OFFICE'`). |
| `public_view_token` | `VARCHAR(255)` | `NOT NULL`, **UNIQUE** (`kitchens_public_view_token_key`) | Regeneratable token for unauthenticated supermarket read-only guest access. |
| `creator_id` | `UUID` | Nullable, **FK -> `users.id`** (NO ACTION / RESTRICT) | User who created the kitchen. |
| `staple_permission` | `TEXT` | `NOT NULL`, `DEFAULT 'open'` | Permission mode for managing staples (e.g., `'open'` vs restricted). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Kitchen creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Last kitchen update timestamp. |

* **Foreign Keys**:
  * `kitchens_creator_id_fkey`: `FOREIGN KEY ("creator_id") REFERENCES "users"("id")` (Default cascade behavior / NO ACTION).
* **Indexes**:
  * `kitchens_pkey` UNIQUE (`id`)
  * `kitchens_public_view_token_key` UNIQUE (`public_view_token`)

---

### `kitchen_members`
Represents kitchen memberships, roles, and claimable invitation slots.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | **PK**, `DEFAULT gen_random_uuid()` | Primary membership identifier. |
| `kitchen_id` | `UUID` | `NOT NULL`, **FK -> `kitchens.id` (ON DELETE CASCADE)** | Associated kitchen. |
| `user_id` | `UUID` | Nullable, **FK -> `users.id` (ON DELETE SET NULL)** | Linked user account (`NULL` until invite token is claimed). |
| `kitchen_display_name` | `VARCHAR(255)` | `NOT NULL` | Name assigned to the slot by the admin. |
| `role` | `kitchen_role` | `NOT NULL`, `DEFAULT 'MEMBER'` | Member permissions (`'ADMIN'` or `'MEMBER'`). |
| `invite_token` | `VARCHAR(255)` | Nullable, **UNIQUE** (`kitchen_members_invite_token_key`) | Secure one-time claim token (`NULL` once claimed). |
| `joined_at` | `TIMESTAMPTZ` | Nullable | Timestamp when invite was claimed (`now()` for creator). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | Nullable, `DEFAULT now()` | Record update timestamp. |

* **Constraints & Unique Indexes**:
  * `kitchen_members_pkey` UNIQUE (`id`)
  * `unique_kitchen_user` UNIQUE (`kitchen_id`, `user_id`)
  * `kitchen_members_invite_token_key` UNIQUE (`invite_token`)
* **Foreign Keys**:
  * `kitchen_members_kitchen_id_fkey`: `FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE CASCADE`
  * `kitchen_members_user_id_fkey`: `FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL`

---

### `pantry_items`
Persistent inventory of shared staples (spices, oil, cleaning supplies).

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | **PK**, `DEFAULT gen_random_uuid()` | Primary key. |
| `kitchen_id` | `UUID` | `NOT NULL`, **FK -> `kitchens.id` (ON DELETE CASCADE)** | Associated kitchen. |
| `name` | `VARCHAR(255)` | `NOT NULL` | Staple item name. |
| `is_out_of_stock` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Depletion / out-of-stock alert trigger. |
| `is_approved` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Approval status for proposed staples. |
| `proposed_by` | `UUID` | Nullable, **FK -> `users.id`** (NO ACTION / RESTRICT) | User who proposed the staple item. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Last update timestamp. |

* **Foreign Keys**:
  * `pantry_items_kitchen_id_fkey`: `FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE CASCADE`
  * `pantry_items_proposed_by_fkey`: `FOREIGN KEY ("proposed_by") REFERENCES "users"("id")` (Default cascade behavior / NO ACTION).
* **Indexes**:
  * `pantry_items_pkey` UNIQUE (`id`)
  * `idx_pantry_items_kitchen` (`kitchen_id`)
  * `idx_pantry_kitchen_id` (`kitchen_id`)

---

### `shopping_list_items`
Active shopping list entries. Supports synced staple pantry items, ad-hoc items, live member cart sync, itemized receipt prices, and guest cart reservations.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | **PK**, `DEFAULT gen_random_uuid()` | Primary key. |
| `kitchen_id` | `UUID` | `NOT NULL`, **FK -> `kitchens.id` (ON DELETE CASCADE)** | Associated kitchen. |
| `pantry_item_id` | `UUID` | Nullable, **FK -> `pantry_items.id` (ON DELETE CASCADE)** | Linked pantry item (`NULL` for custom ad-hoc items). |
| `name` | `VARCHAR(255)` | `NOT NULL` | Shopping item name. |
| `is_purchased` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Checked/purchased status. |
| `is_in_cart` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Live cart synchronization flag. |
| `is_guest_staged` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Flag indicating item is staged in unauthenticated guest cart. |
| `purchased_by` | `UUID` | Nullable, **FK -> `users.id` (ON DELETE SET NULL)** | User who staged or completed the purchase (`NULL` for guest items). |
| `checkout_id` | `UUID` | Nullable, **FK -> `checkouts.id` (ON DELETE SET NULL)** | Associated checkout / refund batch. |
| `item_price` | `NUMERIC(10, 2)` | Nullable | Matched line item receipt price or manual price. |
| `currency` | `VARCHAR(3)` | `NOT NULL`, `DEFAULT 'EUR'` | ISO-4217 Currency code. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Creation timestamp. |

* **Foreign Keys**:
  * `shopping_list_items_kitchen_id_fkey`: `FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE CASCADE`
  * `shopping_list_items_pantry_item_id_fkey`: `FOREIGN KEY ("pantry_item_id") REFERENCES "pantry_items"("id") ON DELETE CASCADE`
  * `shopping_list_items_checkout_id_fkey`: `FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE SET NULL`
  * `shopping_list_items_purchased_by_fkey`: `FOREIGN KEY ("purchased_by") REFERENCES "users"("id") ON DELETE SET NULL`
* **Indexes**:
  * `shopping_list_items_pkey` UNIQUE (`id`)
  * `idx_shopping_kitchen_id` (`kitchen_id`)
  * `idx_shopping_list_items_kitchen` (`kitchen_id`)
  * `idx_shopping_pantry_item_id` (`pantry_item_id`)
  * `idx_shopping_list_items_checkout` (`checkout_id`)
  * `idx_shopping_kitchen_status` (`kitchen_id`, `is_purchased`, `is_guest_staged`)
  * `idx_shopping_list_items_cart_sync` (`kitchen_id`, `is_in_cart`, `is_purchased`)

---

### `checkouts`
Receipt upload batches and manual checkouts for reimbursement.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | **PK**, `DEFAULT gen_random_uuid()` | Primary key. |
| `kitchen_id` | `UUID` | `NOT NULL`, **FK -> `kitchens.id` (ON DELETE CASCADE)** | Associated kitchen. |
| `user_id` | `UUID` | `NOT NULL`, **FK -> `users.id` (ON DELETE CASCADE)** | User requesting refund. |
| `receipt_filename` | `TEXT` | Nullable | Primary receipt filename (`NULL` for receiptless checkouts). |
| `is_refunded` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Admin settlement status. |
| `refunded_at` | `TIMESTAMPTZ` | Nullable | Timestamp when admin settled the refund. |
| `total_claimed_amount` | `NUMERIC(10, 2)` | `NOT NULL`, `DEFAULT '0.00'` | Total amount claimed for household reimbursement. |
| `total_receipt_amount` | `NUMERIC(10, 2)` | Nullable | Gross sum on receipt (`NULL` for receiptless checkouts). |
| `store_name` | `VARCHAR(255)` | Nullable | Detected supermarket name or manually entered merchant. |
| `receipt_deleted_at` | `TIMESTAMPTZ` | Nullable | Timestamp when receipt image was deleted. |
| `note` | `TEXT` | Nullable | Note or message left for the admin. |
| `currency` | `VARCHAR(3)` | `NOT NULL`, `DEFAULT 'EUR'` | ISO-4217 Currency code. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Creation timestamp. |

* **Foreign Keys**:
  * `checkouts_kitchen_id_fkey`: `FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE CASCADE`
  * `checkouts_user_id_fkey`: `FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`
* **Indexes**:
  * `checkouts_pkey` UNIQUE (`id`)
  * `idx_checkouts_kitchen` (`kitchen_id`)
  * `idx_checkouts_kitchen_refunded` (`kitchen_id`, `is_refunded`)
  * `idx_checkouts_kitchen_user` (`kitchen_id`, `user_id`)

---

### `checkout_receipts`
Multi-receipt records attached to a checkout with individual deletion tracking.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | **PK**, `DEFAULT gen_random_uuid()` | Primary key. |
| `checkout_id` | `UUID` | `NOT NULL`, **FK -> `checkouts.id` (ON DELETE CASCADE)** | Associated checkout. |
| `receipt_filename` | `TEXT` | `NOT NULL` | Stored receipt file path/name. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Creation timestamp. |
| `deleted_by_admin_at` | `TIMESTAMPTZ` | Nullable | Soft deletion timestamp by admin. |
| `deleted_by_member_at` | `TIMESTAMPTZ` | Nullable | Soft deletion timestamp by member. |

* **Foreign Keys**:
  * `checkout_receipts_checkout_id_fkey`: `FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE CASCADE`
* **Indexes**:
  * `checkout_receipts_pkey` UNIQUE (`id`)
  * `idx_checkout_receipts_checkout` (`checkout_id`)

---

### `push_subscriptions`
Web Push API notification subscriptions per user.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | **PK**, `DEFAULT gen_random_uuid()` | Primary key. |
| `user_id` | `UUID` | `NOT NULL`, **FK -> `users.id` (ON DELETE CASCADE)** | Subscribed user. |
| `endpoint` | `TEXT` | `NOT NULL`, **UNIQUE** (`push_subscriptions_endpoint_key`) | Push notification browser endpoint. |
| `p256dh` | `TEXT` | `NOT NULL` | Client public key. |
| `auth` | `TEXT` | `NOT NULL` | Authentication secret. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Subscription timestamp. |

* **Foreign Keys**:
  * `push_subscriptions_user_id_fkey`: `FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`
* **Indexes**:
  * `push_subscriptions_pkey` UNIQUE (`id`)
  * `push_subscriptions_endpoint_key` UNIQUE (`endpoint`)
  * `idx_push_subscriptions_user` (`user_id`)

---

## 3. Neon Auth Tables (`neon_auth` Schema)

Integrated Neon Auth provider tables for sessions, accounts, and organizations.

### `neon_auth.user`
* `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
* `name` (`TEXT`, NOT NULL)
* `email` (`TEXT`, NOT NULL, UNIQUE: `user_email_key`)
* `emailVerified` (`BOOLEAN`, NOT NULL)
* `image` (`TEXT`)
* `createdAt` (`TIMESTAMPTZ`, `DEFAULT CURRENT_TIMESTAMP`, NOT NULL)
* `updatedAt` (`TIMESTAMPTZ`, `DEFAULT CURRENT_TIMESTAMP`, NOT NULL)
* `role` (`TEXT`)
* `banned` (`BOOLEAN`)
* `banReason` (`TEXT`)
* `banExpires` (`TIMESTAMPTZ`)
* **Indexes**: `user_pkey` UNIQUE (`id`), `user_email_key` UNIQUE (`email`)

### `neon_auth.account`
* `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
* `accountId` (`TEXT`, NOT NULL)
* `providerId` (`TEXT`, NOT NULL)
* `userId` (`UUID`, NOT NULL, **FK -> `neon_auth.user.id` ON DELETE CASCADE**)
* `accessToken` (`TEXT`)
* `refreshToken` (`TEXT`)
* `idToken` (`TEXT`)
* `accessTokenExpiresAt` (`TIMESTAMPTZ`)
* `refreshTokenExpiresAt` (`TIMESTAMPTZ`)
* `scope` (`TEXT`)
* `password` (`TEXT`)
* `createdAt` (`TIMESTAMPTZ`, `DEFAULT CURRENT_TIMESTAMP`, NOT NULL)
* `updatedAt` (`TIMESTAMPTZ`, NOT NULL)
* **Indexes**: `account_pkey` UNIQUE (`id`), `account_userId_idx` (`userId`)

### `neon_auth.session`
* `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
* `expiresAt` (`TIMESTAMPTZ`, NOT NULL)
* `token` (`TEXT`, NOT NULL, UNIQUE: `session_token_key`)
* `createdAt` (`TIMESTAMPTZ`, `DEFAULT CURRENT_TIMESTAMP`, NOT NULL)
* `updatedAt` (`TIMESTAMPTZ`, NOT NULL)
* `ipAddress` (`TEXT`)
* `userAgent` (`TEXT`)
* `userId` (`UUID`, NOT NULL, **FK -> `neon_auth.user.id` ON DELETE CASCADE**)
* `impersonatedBy` (`TEXT`)
* `activeOrganizationId` (`TEXT`)
* **Indexes**: `session_pkey` UNIQUE (`id`), `session_token_key` UNIQUE (`token`), `session_userId_idx` (`userId`)

### `neon_auth.organization`
* `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
* `name` (`TEXT`, NOT NULL)
* `slug` (`TEXT`, NOT NULL, UNIQUE: `organization_slug_key`, `organization_slug_uidx`)
* `logo` (`TEXT`)
* `createdAt` (`TIMESTAMPTZ`, NOT NULL)
* `metadata` (`TEXT`)
* **Indexes**: `organization_pkey` UNIQUE (`id`), `organization_slug_key` UNIQUE (`slug`), `organization_slug_uidx` UNIQUE (`slug`)

### `neon_auth.member`
* `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
* `organizationId` (`UUID`, NOT NULL, **FK -> `neon_auth.organization.id` ON DELETE CASCADE**)
* `userId` (`UUID`, NOT NULL, **FK -> `neon_auth.user.id` ON DELETE CASCADE**)
* `role` (`TEXT`, NOT NULL)
* `createdAt` (`TIMESTAMPTZ`, NOT NULL)
* **Indexes**: `member_pkey` UNIQUE (`id`), `member_organizationId_idx` (`organizationId`), `member_userId_idx` (`userId`)

### `neon_auth.invitation`
* `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
* `organizationId` (`UUID`, NOT NULL, **FK -> `neon_auth.organization.id` ON DELETE CASCADE**)
* `email` (`TEXT`, NOT NULL)
* `role` (`TEXT`)
* `status` (`TEXT`, NOT NULL)
* `expiresAt` (`TIMESTAMPTZ`, NOT NULL)
* `createdAt` (`TIMESTAMPTZ`, `DEFAULT CURRENT_TIMESTAMP`, NOT NULL)
* `inviterId` (`UUID`, NOT NULL, **FK -> `neon_auth.user.id` ON DELETE CASCADE**)
* **Indexes**: `invitation_pkey` UNIQUE (`id`), `invitation_email_idx` (`email`), `invitation_organizationId_idx` (`organizationId`)

### `neon_auth.verification`
* `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
* `identifier` (`TEXT`, NOT NULL)
* `value` (`TEXT`, NOT NULL)
* `expiresAt` (`TIMESTAMPTZ`, NOT NULL)
* `createdAt` (`TIMESTAMPTZ`, `DEFAULT CURRENT_TIMESTAMP`, NOT NULL)
* `updatedAt` (`TIMESTAMPTZ`, `DEFAULT CURRENT_TIMESTAMP`, NOT NULL)
* **Indexes**: `verification_pkey` UNIQUE (`id`), `verification_identifier_idx` (`identifier`)

### `neon_auth.jwks`
* `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
* `publicKey` (`TEXT`, NOT NULL)
* `privateKey` (`TEXT`, NOT NULL)
* `createdAt` (`TIMESTAMPTZ`, NOT NULL)
* `expiresAt` (`TIMESTAMPTZ`)
* **Indexes**: `jwks_pkey` UNIQUE (`id`)

### `neon_auth.project_config`
* `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
* `name` (`TEXT`, NOT NULL)
* `endpoint_id` (`TEXT`, NOT NULL, UNIQUE: `project_config_endpoint_id_key`)
* `created_at` (`TIMESTAMPTZ`, `DEFAULT CURRENT_TIMESTAMP`, NOT NULL)
* `updated_at` (`TIMESTAMPTZ`, `DEFAULT CURRENT_TIMESTAMP`, NOT NULL)
* `trusted_origins` (`JSONB`, NOT NULL)
* `social_providers` (`JSONB`, NOT NULL)
* `email_provider` (`JSONB`)
* `email_and_password` (`JSONB`)
* `allow_localhost` (`BOOLEAN`, NOT NULL)
* `plugin_configs` (`JSONB`)
* `webhook_config` (`JSONB`)
* **Indexes**: `project_config_pkey` UNIQUE (`id`), `project_config_endpoint_id_key` UNIQUE (`endpoint_id`)

---

## 4. Foreign Key Relationships Summary

| Source Table (`Child`) | Source Column | Target Table (`Parent`) | Target Column | Cascade Behavior |
|---|---|---|---|---|
| `kitchens` | `creator_id` | `users` | `id` | `NO ACTION` (Default) |
| `kitchen_members` | `kitchen_id` | `kitchens` | `id` | `ON DELETE CASCADE` |
| `kitchen_members` | `user_id` | `users` | `id` | `ON DELETE SET NULL` |
| `pantry_items` | `kitchen_id` | `kitchens` | `id` | `ON DELETE CASCADE` |
| `pantry_items` | `proposed_by` | `users` | `id` | `NO ACTION` (Default) |
| `shopping_list_items` | `kitchen_id` | `kitchens` | `id` | `ON DELETE CASCADE` |
| `shopping_list_items` | `pantry_item_id` | `pantry_items` | `id` | `ON DELETE CASCADE` |
| `shopping_list_items` | `checkout_id` | `checkouts` | `id` | `ON DELETE SET NULL` |
| `shopping_list_items` | `purchased_by` | `users` | `id` | `ON DELETE SET NULL` |
| `checkouts` | `kitchen_id` | `kitchens` | `id` | `ON DELETE CASCADE` |
| `checkouts` | `user_id` | `users` | `id` | `ON DELETE CASCADE` |
| `checkout_receipts` | `checkout_id` | `checkouts` | `id` | `ON DELETE CASCADE` |
| `push_subscriptions` | `user_id` | `users` | `id` | `ON DELETE CASCADE` |
| `neon_auth.account` | `userId` | `neon_auth.user` | `id` | `ON DELETE CASCADE` |
| `neon_auth.invitation` | `inviterId` | `neon_auth.user` | `id` | `ON DELETE CASCADE` |
| `neon_auth.invitation` | `organizationId` | `neon_auth.organization` | `id` | `ON DELETE CASCADE` |
| `neon_auth.member` | `organizationId` | `neon_auth.organization` | `id` | `ON DELETE CASCADE` |
| `neon_auth.member` | `userId` | `neon_auth.user` | `id` | `ON DELETE CASCADE` |
| `neon_auth.session` | `userId` | `neon_auth.user` | `id` | `ON DELETE CASCADE` |

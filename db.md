# Database Schema: Lean Kitchen & Auth System

This document outlines the lean PostgreSQL database schema (3 tables total) for the application. It uses a pure username/password authentication model without email verification and a tokenized invite-claim lifecycle for kitchen management.

---

## 1. Schema Tables

### `users`
Stores registered user credentials.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)** — Unique user identifier.
* `username` (VARCHAR(255), Unique, Not Null) — Unique username for authentication.
* `password_hash` (TEXT, Not Null) — Bcrypt-hashed password.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`) — Record creation timestamp.
* `updated_at` (TIMESTAMPTZ, Default: `NOW()`) — Last update timestamp.

---

### `kitchens`
Represents a shared kitchen / household space.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)** — Primary key.
* `name` (VARCHAR(255), Not Null) — Name of the kitchen (e.g., "Apartment 4B", "Family Kitchen").
* `public_view_token` (VARCHAR(255), Unique, Not Null) — Unique secure token for unauthenticated read-only/guest access.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`) — Creation timestamp.
* `updated_at` (TIMESTAMPTZ, Default: `NOW()`) — Last update timestamp.

---

### `kitchen_members`
Represents memberships within a kitchen, including placeholder slots for invited members.
* `id` **(PK, UUID, Default: `gen_random_uuid()`)** — Primary key.
* `kitchen_id` **(FK -> `kitchens.id`, ON DELETE CASCADE, Not Null)** — Target kitchen.
* `user_id` **(FK -> `users.id`, ON DELETE SET NULL, Nullable)** — Linked user account. Remains `NULL` until the invite token is claimed.
* `kitchen_display_name` (VARCHAR(255), Not Null) — Member name (assigned initially by admin or chosen).
* `role` (ENUM: `'ADMIN'`, `'MEMBER'`, Not Null) — Member role and permission level.
* `invite_token` (VARCHAR(255), Unique, Nullable) — One-time claim token. Generated during invite creation, set to `NULL` once claimed.
* `joined_at` (TIMESTAMPTZ, Nullable) — Timestamp when the user accepted the invite. Set to `NOW()` immediately for the creator.
* `created_at` (TIMESTAMPTZ, Default: `NOW()`) — Record creation timestamp.
* **Constraints:** `UNIQUE(kitchen_id, user_id)` (prevents a user from joining the same kitchen multiple times).

---

## 2. Operational Lifecycles

### Authentication Flow (Credentials + JWT)
- **Sign Up / Login**: Uses username & password hashed with `bcryptjs`.
- **Session Management**: Pure JWT stored in secure session cookie (no database session table required).
- **Session Object**: Exposes `session.user.id` and `session.user.username`.

### Kitchen Creation (`/kitchen/new`)
1. Authenticated user submits kitchen name and initial member display names.
2. In a single database transaction:
   - Inserts `kitchens` row with a random `public_view_token`.
   - Inserts creator into `kitchen_members` with `role = 'ADMIN'`, `user_id = session.user.id`, `joined_at = NOW()`, `invite_token = NULL`.
   - Inserts each invited name into `kitchen_members` with `role = 'MEMBER'`, `user_id = NULL`, `joined_at = NULL`, and a unique secure `invite_token`.
3. Redirects to `/kitchen/[id]/admin`.

### Invite Claim Flow (`/invite/[token]`)
1. User visits `/invite/[token]`.
2. **If unauthenticated**:
   - Stores `pending_invite_token` cookie.
   - Shows welcome screen with invite details and inline Login/Register options that redirect back to `/invite/[token]`.
3. **If authenticated**:
   - Verifies the invite token is unclaimed (`user_id IS NULL`).
   - Verifies the user is not already in this kitchen.
   - Atomically updates `kitchen_members`: `user_id = session.user.id`, `joined_at = NOW()`, `invite_token = NULL`.
   - Clears `pending_invite_token` cookie.
   - Redirects to `/kitchen/[kitchen_id]`.

# kartli

kartli is a minimalist shared pantry and grocery management application designed for flatshares and co-living households. It features email-free authentication, live shopping collaboration, and receipt refund workflows.

---

## Features

- **Email-Free Authentication**: Frictionless signup and login using usernames and passwords powered by Auth.js with stateless JWT sessions.
- **Pantry and Stock Management**: Persistent inventory of shared household staples with one-click out-of-stock toggling.
- **Shared Shopping List**: Real-time synchronization between automatic pantry restock alerts and ad-hoc custom grocery items.
- **Cart Staging**: In-store shopping cart state allowing flatmates to stage active items and prevent duplicate purchases.
- **Receipts and Refunds**: Post-shopping receipt upload and admin reimbursement settlements.
- **Guest Supermarket View**: Tokenized read-only link optimized for quick, unauthenticated access under poor grocery store network conditions.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Database**: PostgreSQL ([Neon Serverless](https://neon.tech/)) via node-postgres (`pg`) connection pooling
- **Authentication**: [Auth.js](https://authjs.dev/) (NextAuth v5 beta, Credentials provider, JWT session strategy)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

---

## Database Architecture

For a detailed breakdown of relationships, constraints, and column definitions, refer to [db.md](./db.md).

The database consists of six core tables:

- `users`: User credentials (bcrypt-hashed passwords) and identity handles.
- `kitchens`: Household spaces and unique public guest view tokens.
- `kitchen_members`: Role-based memberships (`ADMIN` or `MEMBER`) and claimable one-time invite tokens.
- `pantry_items`: Persistent inventory items and out-of-stock flags.
- `shopping_list_items`: Active items needed for purchase, linked to pantry staples or ad-hoc custom entries.
- `checkouts`: Batches of purchased items associated with uploaded receipt images and reimbursement status.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18.18 or higher
- [PostgreSQL](https://www.postgresql.org/) database instance (e.g. Neon, Supabase, or local PostgreSQL)
- npm or pnpm

### 1. Clone the Repository

```bash
git clone https://github.com/randakamal/kartli.git
cd kartli
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Fill in the required environment variables:

```env
# PostgreSQL connection string
DATABASE_URL="postgres://user:password@host:port/database?sslmode=require"

# Auth.js secret key (generate with: openssl rand -base64 32)
AUTH_SECRET="your-generated-auth-secret"
NEXTAUTH_SECRET="your-generated-auth-secret"

# Canonical application URL
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Initialize Database Schema

Ensure your PostgreSQL instance is running, then apply the SQL schema defined in [db.md](./db.md).

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

- `npm run dev`: Start the Next.js development server with Turbopack.
- `npm run build`: Create an optimized production build and run TypeScript checks.
- `npm run start`: Start the Next.js production server.

---

## License

This project is available for personal and noncommercial use under the [PolyForm Noncommercial License](LICENSE).

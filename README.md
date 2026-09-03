<div align="center">

# kartli

**The modern, artisanal kitchen & pantry management platform for flatshares, families, and creative teams.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Vision_OCR-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Auth.js](https://img.shields.io/badge/Auth.js-NextAuth_v5-purple?style=flat-square)](https://authjs.dev/)

</div>

---

## Overview

**kartli** elevates household grocery shopping from a chaotic chore into a collaborative experience. Designed with privacy, tactile aesthetics, and frictionless collaboration in mind, it provides email free authentication, live shopping collaboration, automated pantry restock flows, and multimodal AI-powered receipt scanning.

---

## Key Features

### 🎨 Artisanal Culinary Themes
Switch between four carefully balanced, high-contrast colorways with instant dark and light mode adaptation:
- **Saffron Citrus**: Warm ochre and sun-drenched Mediterranean kitchen tones.
- **Black Truffle (Default)**: Deep obsidian, high-contrast monochrome, and understated luxury.
- **Midnight Plum**: Rich aubergine and moody bistro aesthetics.
- **Nordic Salt**: Crisp mineral whites, sage greens, and airy Scandinavian minimalism.

### 🏡 Dynamic Space Contexts
Spaces adjust their vocabulary, tone, and terminology to match your living environment:
- **Flatshare / Co-living**: Roommates, shared staples, chore rotations, and roommate invite links.
- **Family Household**: Family members, household supplies, and parent/guardian approvals.
- **Office / Studio**: Teammates, studio pantry, coffee beans, and petty cash reimbursements.
- **Neutral Space**: Minimal, straightforward kitchen management.

### 🧾 AI-Assisted Receipt OCR & Item Matching
- **Gemini Flash Vision Integration**: Ingests supermarket receipts (Rewe, Lidl, Aldi, Edeka, DM, Trader Joe's, etc.) via local upload.
- **Automatic Matching**: Fuzzy matches receipt line items against active cart items in real time.
- **Mixed Purchase Splits**: Exclude private items and calculate exact household refund amounts on the fly.
- **Mobile-First Review**: Collapsible accordion preview, touch-friendly checkboxes, and sticky action bar for on-the-go review.

### 💳 Flexible Checkouts & Admin Refunds
- **Direct Receiptless Checkouts**: Quickly check out staples with an optional note for the admin (e.g., *"Bought at farmer market"*).
- **Admin Audit Table**: High-resolution image preview dialog with one-click reimbursement settlement.
- **Unsettled Notification Badges**: Dynamic indicators notify household admins of pending refund requests.

### 🛒 Disposable Guest Supermarket Links
- Generates disposable, tokenized read-only links for friends or partners doing a grocery run.
- Zero login or registration required for the shopper.
- Security-first: Household admins can invalidate and regenerate tokens instantly with one click.

### 📦 Pantry & Auto-Restock Tracking
- Persistent digital catalog of household staples.
- One-tap *"Out of Stock"* alerts immediately populate the shared shopping list.
- Checking out items automatically resets the out-of-stock trigger and restocks the pantry.

### ⚡ Kitchen Pulse & Analytics
- Real-time household metrics covering monthly grocery expenditures and average receipts.
- Live pantry health index with restocking velocity and idle supply tracking.
- Merchant expenditure breakdowns and high-circulation kitchen staple statistics.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js (App Router, Server Actions, React 19) |
| **Language** | TypeScript (Strict mode) |
| **Styling & UI** | Tailwind CSS v4, shadcn/ui, Lucide React, Sonner |
| **Database** | PostgreSQL via [Neon Serverless](https://neon.tech/) & `pg` connection pool |
| **Authentication** | Auth.js (NextAuth v5 beta, Credentials provider, stateless JWT sessions) |
| **AI / Multimodal** | Google Gemini Vision (`@google/generative-ai`) |

---

## Database Architecture

For complete table definitions, relational foreign keys, and indexes, refer to [db.md](./db.md).

```mermaid
erDiagram
    users ||--o{ kitchen_members : "belongs to"
    users ||--o{ checkouts : "submits"
    kitchens ||--o{ kitchen_members : "contains"
    kitchens ||--o{ pantry_items : "stocks"
    kitchens ||--o{ shopping_list_items : "tracks"
    kitchens ||--o{ checkouts : "records"
    checkouts ||--o{ shopping_list_items : "settles"
    pantry_items ||--o{ shopping_list_items : "replenishes"
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18.18 or higher
- [PostgreSQL](https://www.postgresql.org/) database (e.g., [Neon](https://neon.tech/))
- [Google AI Studio](https://aistudio.google.com/) API Key for receipt OCR

### 1. Clone & Install

```bash
git clone https://github.com/randakamal/kartli.git
cd kartli
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Configure the required variables:

```env
# Database (PostgreSQL / Neon)
DATABASE_URL="postgres://user:password@ep-sample-pool.neon.tech/kartli?sslmode=require"

# Auth.js / NextAuth (generate secret via: openssl rand -base64 32)
AUTH_SECRET="your-secure-32-byte-base64-secret"

# Google Gemini API Key (for Receipt Scanner OCR)
GEMINI_API_KEY="AIzaSyYourGoogleAIStudioKeyHere"
```

### 3. Initialize Database Schema

Execute the SQL schema in [db.md](./db.md) against your PostgreSQL database to create tables and indexes.

### 4. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Testing on Mobile Devices (Local Network)

Next.js is configured with `allowedDevOrigins` to support seamless mobile testing across local IP addresses without CORS or cross-origin blocking:

```bash
npm run dev -- -H 0.0.0.0
```

Open `http://<your-local-ip>:3000` (e.g. `http://192.168.1.100:3000`) on your mobile browser.

---

## Scripts

- `npm run dev`: Starts the Next.js development server with Turbopack.
- `npm run build`: Generates an optimized production build with full TypeScript verification.
- `npm run start`: Starts the Next.js production server.
- `npm run lint`: Runs ESLint to check code quality.

---

## License

This project is available for personal and noncommercial use under the [PolyForm Noncommercial License](LICENSE).

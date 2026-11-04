<div align="center">

<img src="assets/readme/hero-banner.png" alt="kartli — The shared kitchen & household operating system." width="100%" />

Shared grocery lists, pantry tracking and receipt splitting for flatshares, families and small teams.

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

kartli is a shared kitchen app. Housemates keep one grocery list, track what is in the pantry, and split the cost of a shop by scanning the receipt. Sign-up needs no email address, just a username.

---

## Features

- Shared grocery list for a flat, family, office or neutral space
- Sign up with a username, no email
- Invite links for housemates
- Scan a receipt and items are matched to the cart
- Leave private items out of the split
- Check out without a receipt, with a note for the admin
- Admin view of refund requests with receipt images, one click to settle
- Read-only guest link for someone shopping for you, revocable
- Pantry: mark items out of stock and they go on the list
- Stats: monthly spend, average receipt, spend per store, most-bought items
- Color themes, dark and light
- Push notifications, including iPhone (iOS 16.4+, add to Home Screen)
- English and German

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

Table definitions, foreign keys and indexes are in [db.md](./db.md).

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

## Run it

```bash
git clone https://github.com/randakamal/kartli.git
cd kartli
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY, VAPID keys
npm run dev
```

---

## License

This project is available for personal and noncommercial use under the [PolyForm Noncommercial License](LICENSE).

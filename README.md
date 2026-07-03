# MiKai — Personal Finance

A personal finance dashboard for tracking income, expenses, savings goals, and investments in one place. Built with React + TypeScript + Vite, styled with Tailwind CSS, and backed by Firebase (Auth + Firestore).

Live app: https://budgeting-app-221d6.web.app/

## Features

- 📊 **Overview dashboard** — income, expenses, investments, and goal contributions charted over time (month / YTD / year views)
- 💰 **Expense tracking** — categorized expenses with per-category monthly budget limits, credit/debit account tagging
- 📈 **Income sources** — recurring (weekly / monthly / yearly) and one-time income
- 🎯 **Savings goals** — target amounts with individual contribution/withdrawal history
- 💼 **Investments** — lot-based position tracking (each purchase recorded separately), with:
  - Live stock/ETF prices via Alpha Vantage (optional API key)
  - Gold/commodity pricing with karat purity support
  - Manual valuation for real estate and other illiquid assets
  - USD/SAR currency conversion for cross-currency purchases
- 📑 **Reports** — expense and investment breakdowns by category
- 🌙 Dark, token-based design system; responsive with a mobile bottom nav and desktop sidebar

## Tech Stack

| Layer     | Choice                                   |
|-----------|------------------------------------------|
| Frontend  | React 18, TypeScript, Vite               |
| Styling   | Tailwind CSS (custom `ink`/`surface`/`primary` tokens) |
| Charts    | Recharts                                 |
| Backend   | Firebase Authentication + Cloud Firestore |
| Hosting   | Firebase Hosting                         |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pedrigalmico/budget-app
   cd budget-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173`

### Scripts

| Command         | Purpose                                  |
|-----------------|------------------------------------------|
| `npm run dev`   | Start the Vite dev server                |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run lint`  | Run ESLint (zero warnings allowed)       |
| `npm run preview` | Preview the production build locally   |

### Deployment

```bash
npm run build
firebase deploy
```

## Data Storage

Each user's data lives in a single Firestore document (`users/{uid}`), synced in real time and debounced on write. An account (email/password) is required; Firestore security rules restrict every user to their own document.

Legacy flat investment records are migrated automatically to the lot-based format on load — the migration is non-destructive.

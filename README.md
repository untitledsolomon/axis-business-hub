# Axis — Regent Business Hub

Axis is Regent's operations system for the businesses it runs and the clients
it serves directly. It is not built as a self-serve QuickBooks/Zoho
alternative — it's the product behind a done-for-you engagement: Regent sets
it up, configures it, and runs it alongside each client, rather than shipping
it as off-the-shelf software.

See `Axis V1 Roadmap.md` for the actual build plan, current scope decisions,
and what's explicitly out of scope for v1.

## Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Backend**: Supabase (Postgres, Auth, RLS, Edge Functions)
- **Data fetching**: TanStack Query
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS
- **Icons**: Lucide React

## Module status

This reflects the actual code, not aspiration. See the roadmap doc for the
full breakdown and phase plan.

**Wired to real data:**
- Auth (Supabase, multi-tenant orgs, RLS)
- Clients
- Invoices (+ PDF generation via Edge Function)
- Chart of Accounts
- Transactions, General Ledger, Banking — journal-entry-backed, using the
  `create_journal_entry_v1` double-entry RPC

**Not yet built:**
- Item-tracking core (inventory / asset custody / lifecycle views)
- Employee / HR / shift module
- Real running balance calculation on bank accounts

## Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- npm
- A Supabase project (URL + anon key)

### Installation

```sh
# Clone the repository
git clone https://github.com/untitledsolomon/axis-business-hub.git
cd axis-business-hub

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# then fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# Run migrations against your Supabase project (see supabase/migrations)

# Start the development server
npm run dev
```

### Build

```sh
npm run build
```

## License
Private — Regent

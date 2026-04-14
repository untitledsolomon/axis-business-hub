# AXIS – Business Operating System

AXIS is a modern business management platform designed to be a lightweight, powerful alternative to tools like QuickBooks.

## Phase 1: Core Foundation

The project has been migrated to **Next.js 15 (App Router)** and **React 19**.

### Core Modules (Phase 1)
- **Authentication**: Secure login system with protected routes via Middleware.
- **Layout System**: Modern SaaS UI with Sidebar navigation and Topbar.
- **Data Models**: Defined essential models for Clients, Invoices, Employees, and Transactions.

## Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- npm

### Installation

Due to peer dependency conflicts between React 19 and some UI libraries (like `cmdk`), you **must** use the `--legacy-peer-deps` flag when installing:

```sh
# Step 1: Clone the repository
git clone https://github.com/untitledsolomon/axis-business-hub.git

# Step 2: Navigate to the project directory
cd axis-business-hub

# Step 3: Install dependencies (IMPORTANT)
npm install --legacy-peer-deps

# Step 4: Start the development server
npm run dev
```

### Build

To create a production build:

```sh
npm run build
```

## Technologies Used
- **Framework**: Next.js 15 (App Router)
- **UI Library**: Shadcn UI (Radix UI)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Icons**: Sonner (Toast notifications)
- **State Management**: React Context

## License
Private

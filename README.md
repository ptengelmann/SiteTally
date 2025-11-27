# SiteTally

**Mobile-first asset tracking for construction and field teams.**

SiteTally helps construction companies, landscapers, and field service teams track their tools and equipment using QR codes. Scan to check out, scan to check in — it's that simple.

## Features

### Core Functionality
- **QR Code Scanning** - Scan any asset's QR code to instantly check it in or out
- **Real-time Status** - See what's available, checked out, or in maintenance at a glance
- **Activity History** - Full audit trail of every check-in and check-out
- **Asset Management** - Add, edit, and organize assets with categories

### Team Management
- **Role-based Access** - Managers can add assets and users; workers can check in/out
- **User Management** - Add team members, assign roles, deactivate accounts
- **Team Activity Feed** - See who checked out what and when

### Mobile Experience
- **PWA Support** - Install as a native app on iOS and Android
- **Offline-Ready** - Works without internet connection
- **Haptic Feedback** - Tactile confirmation on scan success
- **Camera Integration** - Use your phone's camera as a QR scanner

### Reporting & Alerts
- **Overdue Alerts** - Dashboard warnings for items checked out too long (7+ days)
- **CSV Export** - Export assets, activity, and team data for reporting
- **QR Label Printing** - Print QR labels for your equipment

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **Authentication**: NextAuth.js v5 with credentials provider
- **QR Scanning**: html5-qrcode library

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (we use [Neon](https://neon.tech))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ptengelmann/SiteTally.git
cd SiteTally
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```
DATABASE_URL=your_postgres_connection_string
AUTH_SECRET=your_auth_secret
NEXTAUTH_URL=http://localhost:3000
```

4. Run database migrations:
```bash
npm run db:migrate
```

5. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Usage

### For Managers
1. Log in with manager credentials
2. Add assets from the Dashboard → Assets tab → "Add Asset"
3. Print QR labels and attach to your equipment
4. Add team members from the Team tab
5. Monitor activity and overdue items

### For Workers
1. Log in with worker credentials
2. Scan QR codes to check equipment in/out
3. Add location and notes when checking out
4. View your activity history

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── dashboard/     # Dashboard page
│   ├── login/         # Login page
│   └── page.tsx       # Scan mode (home)
├── components/        # React components
├── lib/              # Utilities (auth, db)
└── types/            # TypeScript types
```

## License

MIT

## Contributing

This is a private project. For feature requests or bug reports, please contact the development team.

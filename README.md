# Nanjil Grove Academy

A connected five-page fictional school website and school-management ERP demonstration by Infinex Loop. All people, records and institutional claims are synthetic.

## Local setup

Use Node.js 24 or newer on macOS.

```bash
npm install
npm run db:setup
npm run dev
```

Open:

- Public website: `http://localhost:3000`
- ERP login: `http://localhost:3000/login`
- Demo persona selector: `http://localhost:3000/demo-access`

The database is a local SQLite file at `dev.db`. `npm run db:setup` creates the schema and applies the deterministic demonstration seed. The seed is idempotent once school data exists.

## Demo accounts

The shared demonstration password is displayed on `/demo-access`. It was rotated for the public release and must not be reused for any non-demo account.

| Username | Experience |
| --- | --- |
| `admin` | School administration |
| `principal` | Principal overview |
| `admissions` | Application pipeline and enrolment |
| `teacher` | Teaching workspace |
| `accountant` | Fees and collections |
| `hr` | Employees and payroll |
| `librarian` | Catalogue and circulation |
| `student` | Personal academic portal |
| `parent` | Linked-child portal |
| `alumni` | Alumni portal |

Change `DEMO_PASSWORD` and `SESSION_SECRET` before recreating a local database for any separate environment.

## Main architecture

- `src/app` — public pages, login, server actions and protected portal routes
- `src/components` — coordinated public and ERP shells
- `src/lib` — Prisma access, sessions, authorization and formatting
- `prisma/schema.prisma` — relational school model
- `prisma/seed.ts` — coherent synthetic school records
- `tokens.css` — shared institutional design tokens
- `public/uploads` — reserved local upload location

## Implemented scope

- Exactly five main public pages: Home, About, Academics, Campus Life, Admissions & Contact
- Database-backed username/email login, hashed passwords, protected sessions, roles and permissions
- Public admission application and private reference/code tracking
- Admissions pipeline with transactional enrolment into student, guardian, user, class and fee records
- Student, guardian, employee, academic-year, section, subject, attendance, exam, mark, assignment and fee records
- Manual fee payment recording with balance protection
- HR/payroll, library circulation, events, achievements, alumni, facilities, transport and audit records
- Role-aware dashboards and relationship-scoped student/guardian views
- Public CMS editing for seeded content blocks
- Print styles and report-oriented data views

## Deliberately simulated or incomplete

This is a local product demonstration, not a production-certified school deployment.

- Demo online payments do not process money.
- Email, SMS, WhatsApp and push delivery are not integrated.
- Public photography is illustrative and externally hosted; replace with licensed school-owned assets for a client deployment.
- File upload storage is reserved, but comprehensive upload/document-management screens are not implemented.
- Timetable conflict models exist, but the full timetable editor and a complete seeded weekly timetable are not implemented.
- Detailed CRUD interfaces are strongest for admissions, payments and website content; several operational modules are database-backed reporting views rather than complete edit suites.
- Certificate, report-card, receipt and payslip PDF generators are not implemented; print styling is present.
- Promotion, graduation-to-alumni automation, parent-teacher booking, visitor editing, asset maintenance, leave approval and assignment submission need further interaction work.
- No automated test suite, Playwright run, CI/CD workflow or formal QA gate was added, per the release brief.

## Cloudflare deployment

The public demonstration uses Cloudflare Workers through vinext and Cloudflare D1 for persistent relational records. The normal Next.js commands continue to use local SQLite; the vinext build aliases only the database transport to Prisma's D1 adapter.

- Website: <https://school-management.pied-mugger-0k.workers.dev>
- Login: <https://school-management.pied-mugger-0k.workers.dev/login>
- Demo accounts: <https://school-management.pied-mugger-0k.workers.dev/demo-access>
- Source: <https://github.com/InfinexLoop/school-management>

```bash
# Verify both supported build paths
npm run build
npm run build:vinext

# Apply committed D1 migrations
npm run cf:d1:migrate

# Deploy the Worker
npm run deploy
```

Deployment configuration is in `cloudflare.config.ts`; the database binding is `DB`. R2 is intentionally not configured because the current application does not implement durable upload workflows.

### Database initialization and reset

The initial remote demonstration dataset was copied from the deterministic synthetic local seed. To create a clean baseline locally:

```bash
rm -f dev.db
npm run db:setup
```

Resetting the public D1 database is an owner-operated maintenance action: create a fresh D1 database or restore D1 using its point-in-time recovery, apply `migrations/0001_initial.sql`, import a newly generated synthetic seed, update the `DB` binding ID, and redeploy. Do not expose a reset endpoint in the public application.

### Public-demo security notes

- Login attempts and public admission/contact submissions are rate-limited using persistent database records.
- The public application has no delete actions and no unrestricted file-download route.
- Shared demo accounts contain only synthetic records. Rotate their password whenever the public environment is reseeded.
- Local databases, `.env` files, generated Worker output and upload contents are excluded from Git.
- The deployment adapter currently carries a moderate transitive advisory in its unused Open Graph image-generation dependency; no high or critical audit finding remains.

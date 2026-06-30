# Alvéo - Closet Planning, Made Precise

> Carved for you. A closet design app that turns a room, a wardrobe, and a few simple choices into a build-ready layout.

## What problem this solves

Most closet planning starts with guesswork. People know they need more storage, but they do not know how to translate clothes, shoes, dimensions, and style preferences into a layout that actually works.

Alvéo solves that by turning a room and a wardrobe inventory into a precise, build-ready storage plan.

### In short

- Turns closet planning from guesswork into a measurable layout
- Translates wardrobe needs into shelf, rod, drawer, and shoe storage decisions
- Helps homeowners, renters, and designers move from inspiration to a usable design
- Produces layouts that can be reviewed, shared, exported, and built

## How Alvéo solves it

The app guides users through a short flow:

1. Choose who the design is for.
2. Enter closet dimensions and wardrobe details.
3. Review a live closet preview as the layout updates.
4. Compare, optimize, and refine the result.
5. Export the design as a PDF or share it with someone else.

Under the hood, the app uses a layout engine plus SVG-based renderers to convert user input into scaled closet elevations, isometric views, and floor-plan style visuals. The result is not just an idea board. It is an output you can actually use.

## What is already built

- Interactive landing page with clear positioning and user-type selection
- Step-by-step configurator with draft persistence and share-link hydration
- Live preview rendering for closet elevations and 3D/isometric views
- Floor-plan, cost, and cut-list outputs for more practical planning
- PDF export for sharing with contractors, clients, or family members
- Design comparison and layout optimization modes
- Mobile-friendly configure/preview tabs
- Optional authentication and cloud-saved designs
- Internal analytics dashboard for product and funnel visibility
- Collaboration features for saved designs, including comments, threaded replies, and @mentions
- Security hardening with middleware-level headers and rate limiting

### Key features

- Closet layout generation based on room dimensions and wardrobe inventory
- Real-time SVG and isometric previews
- Exportable PDF output for handoff or sharing
- Shareable draft links and local draft restore
- Cost estimation and cut-list support
- Collaboration tools for comments and role-based review
- Internal analytics for tracking product usage and funnel health

## Tech stack

- Next.js 14 with the App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- SVG-first rendering
- jsPDF and svg2pdf for export
- NextAuth for optional auth flows
- next-themes for theme handling
- Optional Supabase persistence for saved designs

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

If you want optional auth or cloud save support, create a local env file and add the relevant provider values before starting the app.

## Environment setup

To enable authentication and persistence across devices:

1. Set `NEXTAUTH_URL` and `NEXTAUTH_SECRET`.
2. Optionally add Google OAuth values with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. Optionally add email sign-in values with `EMAIL_SERVER` and `EMAIL_FROM`.
4. Optionally configure Supabase with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DESIGNS_TABLE`.

If Supabase is not configured, the app falls back to local in-memory storage for development.

For operations and monitoring:

- `MONITORING_WEBHOOK_URL` enables server-error reporting.
- `EVENTS_ADMIN_TOKEN` protects the analytics event API and the admin dashboard.

See `docs/release-checklist.md` for release readiness steps.

## Validation

```bash
npm test
npm run type-check
```

## Project structure

```text
src/
├── app/            # Pages, routes, layouts, and admin surfaces
├── components/     # Landing page and configurator UI
├── engine/         # Layout calculation logic
├── lib/            # Analytics, auth, storage, and utilities
├── renderer/       # SVG, isometric, and floor-plan renderers
└── types/          # Shared TypeScript types
```

## Roadmap

See `docs/next-ideas.md` for the current backlog. The next areas of focus are funnel visibility, collaboration depth, pricing logic, accessibility, and deployment health.

## Design intent

Alvéo is designed around a simple idea: storage should feel intentional, not generic. Every shelf, drawer, and hanging zone should have a reason to exist.
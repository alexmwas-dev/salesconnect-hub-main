# SalesConnect Organization Frontend

Organization-facing web app for managing WhatsApp messaging operations, contacts, campaigns, templates, team members, and subscription settings.

This frontend is built with Vite + React + TypeScript and talks to a backend API (configured via `VITE_API_URL`).

## Features

- Authentication (login, signup, protected routes)
- Dashboard with organization stats, activity, and subscription usage
- Contacts management (CRUD, assignment, bulk import)
- Campaigns management (create, send, pause/resume/cancel/resend)
- WhatsApp templates management (CRUD, status polling)
- WhatsApp numbers management and WhatsApp connection flow
- Team management (invite, roles, remove members)
- Settings for organization/profile/password and billing/subscription
- Public legal pages (`/privacy-policy`, `/data-deletion`)

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router
- TanStack Query
- shadcn/ui + Radix UI
- Tailwind CSS
- Vitest + Testing Library

## Prerequisites

- Node.js 20+ (Node 22 works)
- npm
- A running backend API for SalesConnect Organization

## Environment Variables

Create a `.env` file in the project root (if not already present):

```env
VITE_API_URL=http://localhost:3000
```

Notes:

- If `VITE_API_URL` is not set, the app defaults to `http://localhost:3000`.
- Auth tokens are stored in `localStorage` under `auth_token`.

## Getting Started

```sh
npm install
npm run dev
```

The Vite dev server runs on port `8080` by default (see `vite.config.ts`).

## Available Scripts

- `npm run dev` - Start the Vite dev server
- `npm run build` - Production build
- `npm run build:dev` - Development-mode build
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest once
- `npm run test:watch` - Run Vitest in watch mode

## Main App Routes

- `/login`, `/signup`
- `/dashboard`
- `/contacts`
- `/campaigns`
- `/templates`
- `/whatsapp-numbers`
- `/connect-whatsapp`
- `/team`
- `/settings`
- `/privacy-policy`
- `/data-deletion`

## Backend/API Expectations

- The frontend sends `Authorization: Bearer <token>` when a user is logged in.
- API responses with a `{ data: ... }` envelope are unwrapped automatically by the client.
- The app expects endpoints for auth, organization stats/activity, contacts, campaigns, WhatsApp templates/numbers, team management, and billing.

## Project Structure (High Level)

- `src/pages` - Route pages (dashboard, contacts, campaigns, settings, auth, legal pages)
- `src/components` - Reusable UI and feature components
- `src/contexts` - Auth and organization state providers
- `src/lib/api.ts` - API client and endpoint wrappers
- `src/types` - Shared TypeScript domain types

## Notes

- This project includes billing/subscription UI flows in `Settings`, including plan selection and payment verification handling.
- The UI uses protected/public route guards based on auth state from `AuthContext`.

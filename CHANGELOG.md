# Changelog - Elite Star HRM System

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-05-27

### Added
- **E2E Testing Suite (`tests/e2e/`)**:
  - Implemented `auth.spec.ts` testing protected route guards, invalid credentials format inputs, and successful admin login flow.
  - Implemented `leave.spec.ts` verifying time-off form submission, status visual cues (pending/approved), and manager feedback comment decisions.
  - Implemented `attendance.spec.ts` checking interactive terminal buttons (clocking check-in/out), tasks note inputs, and date updates in ledger tables.
  - Implemented `audit-logs.spec.ts` verifying rendering of administrative activity streams, old/new diff records, and query search filters.
- **Playwright Test Configuration (`playwright.config.ts`)**:
  - Setup unified config targeting `./tests/e2e/` with auto Next.js development server spawning hooks and ports listening checks.
  - Set test workers to 1 to run tests sequentially and avoid database state race conditions on concurrent authentications.
  - Pre-configured standard Chromium and Firefox projects.

### Verified
- Executed `npx tsc --noEmit` and successfully compiled the codebase with zero warnings or errors.
- Executed `npm run build` and successfully compiled all 11 static and dynamic pages of the Next.js full-stack application with optimized routes.

## [1.1.0] - 2026-05-27

### Added
- **Global Theme & Styles (`app/globals.css`, `app/layout.tsx`)**:
  - Implemented the bright corporate light theme styling utilizing HSL custom variables.
  - Setup clear primary deep teals (#0f766e), emerald gradients, custom select states, and scroll behaviors.
- **Context Providers & Layouts**:
  - Created `components/profile-provider.tsx` for caching and sharing user session properties across Client components.
  - Created `components/logout-button.tsx` to handle user sign out via browser-based clients.
  - Built `app/(dashboard)/layout.tsx` featuring Server-First Hydration (loading user details in server components to eliminate shifts) and full responsive capabilities (<800px) with desktop Sidebar and mobile Bottom Nav.
- **Core Interface Pages**:
  - **Login Page (`app/(auth)/login/page.tsx`)**: Modular card layout with email and password validations and unified error outputs.
  - **Home Dashboard Overview (`app/(dashboard)/dashboard/page.tsx`)**: Dynamic cards showing total active rosters, checked-in staff count today, approved leaves, and percentage of active roster checked in. Renders recent logs and pending approval items.
  - **Employee Directory (`app/(dashboard)/employees/page.tsx`)**: Search, dropdown filter by departments and titles, listing profile details, and dedicated HR edit/register modals syncing actions back to `audit_logs`.
  - **Leave Management (`app/(dashboard)/leave/page.tsx`)**: Leave request forms for staff and absence approval queue tracking with custom feedback comments and `audit_logs` integrations.
  - **Attendance Log (`app/(dashboard)/attendance/page.tsx`)**: Interactive Real-Time Clock, Check-In and Check-Out actions that automatically detect ca-late shifts (after 08:30 AM), and historical check-in card listings.
  - **Audit Logs Trail (`app/(dashboard)/audit-logs/page.tsx`)**: Immutable administrative activities lookup with color-coded tags and old/new JSON diff details.
  - **Route Handlers (`app/api/auth/callback/route.ts`)**: Route callback for standard authentication flows.

## [1.0.0] - 2026-05-27

### Added
- **Database Schema (`supabase/schema.sql`)**:
  - Implemented tables for departments, titles, profiles, leave requests, attendance logs, and audit logs.
  - Implemented `on_auth_user_created` trigger for automatic profile generation on user signup.
  - Implemented `on_profile_update` trigger to prevent unauthorized role escalation and department switches.
  - Implemented security definer functions `get_user_role` and `get_user_department` to bypass RLS recursion loops.
  - Configured RLS policies for four distinct system roles: Employee, Manager, HR, and Admin.
- **Database Seed (`supabase/seed.sql`)**:
  - Populated departments (Pickleball, F&B, HR, Ops) and corresponding professional titles.
  - Populated demo auth accounts including `toiminhvuive@gmail.com` as the bootstrapping admin.
  - Created mock leave requests, daily attendance logs, and system audit logs.
- **Supabase Integration & Cookie Bridge (`lib/supabase/`)**:
  - Created browser client helper in `lib/supabase/client.ts` with disabled cache configuration.
  - Created server-side client helper in `lib/supabase/server.ts` utilizing Legacy Cookie Bridge.
  - Created session updates and route guards in `lib/supabase/middleware.ts` to manage auth redirections and RBAC constraints.
- **Global Middleware (`middleware.ts`)**:
  - Created root-level Next.js middleware routing calls to the Supabase cookie/session bridge.
- **Architectural Documentation**:
  - Documented system constraints and patterns in `DECISIONS.md`.

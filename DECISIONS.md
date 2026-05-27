# Architecture Decisions - Elite Star HRM System

This document outlines the architectural decisions, design patterns, and technical strategies adopted for the Elite Star Human Resource Management (HRM) System.

## 1. Database Schema and Performance Strategy

### Decision: Relational Database with Specialized Entities
* **Rationale:** HRM systems require precise referential integrity. We use standard UUIDs for all entity IDs to facilitate secure, non-sequential database records.
* **Schema Design:**
  * `departments` tracks organizational units.
  * `titles` tracks specific roles mapped to departments.
  * `profiles` extends `auth.users` with standard metadata (role, status, hire date).
  * `leave_requests` manages vacation and sick leave requests with validation checks.
  * `attendance_logs` registers daily check-in and check-out logs with IP tracking.
  * `audit_logs` implements an insert-only, immutable ledger for all administrative actions.
* **Indexes:** Performance indexes are established on all foreign key lookups and date ranges to ensure lightning-fast dashboard loads.

---

## 2. Row Level Security (RLS) Strategy

### Decision: Statically-Defined Security Roles with Recursion Prevention
* **Rationale:** A simple recursive subquery in RLS policies (e.g. checking user roles by querying the `profiles` table) triggers infinite loop exceptions in PostgreSQL.
* **Implementation:**
  * Developed helper functions `public.get_user_role` and `public.get_user_department` marked with `SECURITY DEFINER` and specific `search_path`.
  * These helpers execute with superuser privileges, bypassing the RLS engine to read role/department metadata.
  * This guarantees O(1) performance and completely prevents recursion loops.
* **RBAC Specifications:**
  * **Employee:** Can read/update own profile, submit/cancel own leave requests, check-in/out own attendance, and view own audit trail.
  * **Manager:** Can read/update profiles, leave requests, attendance, and audit logs of employees belonging to their department.
  * **HR:** Complete CRUD operations across all tables (profiles, departments, titles, leave requests, attendance logs, and audit logs).
  * **Admin:** Complete bypass capabilities for system overrides.

---

## 3. Authentication and Cookie Refresh Strategy

### Decision: Legacy Cookie Bridge (Ported from WMS)
* **Rationale:** The `@supabase/ssr` package (v0.3.0) contains a known issue during auth redirections where the middleware and server actions engage in a redirect loop due to asynchronous cookie writing limits.
* **Implementation:**
  * Implemented the Legacy Cookie Bridge in `lib/supabase/client.ts`, `lib/supabase/server.ts`, and `lib/supabase/middleware.ts`.
  * Middleware actively intercepts cookie sets and deletes, synchronizing them with both the incoming request cookies and the outgoing response headers.
  * Uses `supabase.auth.getUser()` rather than `getSession()` on every request to securely refresh expired tokens and prevent client-side token spoofing.

---

## 4. Audit Log Immutability

### Decision: Insert-Only pattern for Ledger Logging
* **Rationale:** HR compliance audits require non-repudiation and high integrity.
* **Implementation:**
  * The `audit_logs` table has select and insert policies only.
  * Update and delete operations are completely omitted from the policy set, rendering the table structurally immutable from client-side APIs.
  * The Next.js middleware enforces a standard REST method guard that blocks `PUT`, `PATCH`, and `DELETE` requests targeting `/api/audit-logs/*`.

---

## 5. UI Layout, Hydration, and Responsiveness

### Decision: Server-First Hydration Layout with Mobile Responsive Bottom Navigation
* **Rationale:** Client-side routing checks lead to layout shifts and flashes of unstyled content during user profile fetching. 
* **Implementation:**
  * **Server-First Hydration:** The server-side layout `app/(dashboard)/layout.tsx` queries the Supabase auth user session and profile metadata directly in a secure environment. It forwards the verified state to the React context `ProfileProvider`.
  * **Responsive Adaptive Layout:** 
    * Screen sizes >= 800px display a clean, fixed desktop Sidebar.
    * Screen sizes < 800px display a mobile header and Bottom Navigation Bar for quick access on iOS/Android.
  * **Light Corporate Palette:** Adopts a clean light-colored theme featuring whites, soft grays, deep teals, and emerald highlights to guarantee a professional corporate atmosphere.

---

## 6. Employee Registration and Auth Sync

### Decision: Transactional Client-Side Auth SignUp to Profile Sync
* **Rationale:** When an administrative HR specialist registers a new employee, standard SQL triggers require a synchronized row in `auth.users`.
* **Implementation:**
  * Executed user registration via `supabase.auth.signUp()` from the client dashboard, embedding metadata (`first_name`, `last_name`, `role`, `phone`, `hire_date`).
  * The custom PostgreSQL trigger `on_auth_user_created` automatically listens to `auth.users` and maps user details to `public.profiles` in a safe, atomic database transaction.
  * The HR specialist can then safely associate department and title IDs via standard updates.

---

## 7. End-to-End (E2E) Testing Strategy and Build Health

### Decision: Playwright E2E Isolation with Sequential Test Flow
* **Rationale:** E2E testing of databases, authentication states, and state changes (like checking-in or approving leave) on a shared schema is prone to race conditions if tests execute in parallel.
* **Implementation:**
  * **Test Directory:** Centralized in `./tests/e2e/`.
  * **Execution Isolation:** Configured Playwright with `workers: 1` to run all specs sequentially. This guarantees that database rows inserted during tests do not conflict or cause validation overlaps.
  * **Target Testing Specs:**
    * `auth.spec.ts`: Validates credential forms, email formats, and redirect guards for unauthenticated routes.
    * `leave.spec.ts`: Simulates submission of a time-off request and the corresponding manager-side approval flow.
    * `attendance.spec.ts`: Validates clocking terminal check-in/out button states and historical log updates.
    * `audit-logs.spec.ts`: Validates visual visibility of ledger entries and query searches.
  * **Production Build Checks:**
    * Integrated type compilation check `npx tsc --noEmit` and production compiler `npm run build` as mandatory CI gates to guarantee software stability.

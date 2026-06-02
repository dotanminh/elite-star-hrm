# Changelog - Elite Star HRM System

All notable changes to this project will be documented in this file.

## [1.7.1] - 2026-06-02

### Fixed
- **Manual Attendance Logs with Missing Times (`app/(dashboard)/attendance/manage/page.tsx`, `app/(dashboard)/payroll/page.tsx`)**:
  - Fixed an issue where manual clock-in logs (added via "Thêm Bù Công" with blank check-in/out times) default to 'X' (absence) in the timesheet grid export and 0 valid days in payroll diligence calculations.
  - Updated timesheet grid export to default logs with status 'present' or 'late' but missing time stamps to 'V' (present, worked full day).
  - Updated payroll page calculations to recognize logs with status 'present' or 'late' but missing check-in/out timestamps as valid work days (1.0 công).

## [1.7.0] - 2026-06-02

### Added
- **Professional Excel Timesheet Styling (`app/(dashboard)/attendance/manage/page.tsx`)**:
  - Integrated `xlsx-js-style` package to replace standard `xlsx` for styling cell objects.
  - Formatted the first row (headers) as bold, center-aligned (left-aligned for names and departments), with a light gray background (`#F3F4F6`), and thin gray borders (`#9CA3AF`).
  - Added thin grid borders to all data rows and styled the symbols `V` (worked, emerald green text, light green bg), `V/2` (half-day, amber text, light amber bg), `P` (leave, blue text, light blue bg) and `X` (absence, gray text).
  - Merged columns A through the last column for Note rows to prevent truncation and clipping.
  - Set note title section `GHI CHÚ QUY TẮC TÍNH CÔNG & KỶ LUẬT ELITE STAR:` to bold, size 11, dark red color (`#991B1B`).
  - Set custom row heights (26pt for headers, 22pt for data rows, 20pt-24pt for notes/spacers) for a polished presentation.

## [1.6.0] - 2026-06-02

### Fixed
- **Attendance Management Excel Export Data Sync (`app/(dashboard)/attendance/manage/page.tsx`)**:
  - Filtered out non-active status profiles (`profiles.status = 'active'`) to exclude resigned/terminated employees (such as Đặng Ngọc Nhã Như) from both the management dropdowns and the Excel export.
  - Dynamically fetched approved leave requests (`leave_requests.status = 'approved'`) overlapping the selected timesheet period.
  - Placed a 'P' (Phép) symbol in the Excel timesheet cells on dates matching approved leave request ranges, and ensured leaves do not increment `totalWorkDays` to correctly scale down work days.

## [1.5.0] - 2026-06-02

### Changed
- **Attendance Management Excel Export Grid Redesign (`app/(dashboard)/attendance/manage/page.tsx`)**:
  - Redesigned the export output from raw sequential rows to a comprehensive **Timesheet Grid (Bảng lưới chấm công)**.
  - Set columns dynamically: Leftmost columns show Employee Code, Full Name, and Department; middle columns show dates (`DD/MM`) in the filtered range; rightmost columns show computed Total Work Days and Total Hours Worked.
  - Set cell values: 'V' for worked days (hours >= 7), 'V/2' for half days (morning time off), and 'X' for full absences/leaves or missing logs.
  - Added a dedicated formatted **Notes (Ghi chú)** section at the bottom of the worksheet describing internal payroll, allowed leaves, half-day calculations, and disciplinary deduction rules.

## [1.4.0] - 2026-06-02

### Added
- **Attendance Management Excel Export (`app/(dashboard)/attendance/manage/page.tsx`)**:
  - Integrated `xlsx` (SheetJS) package for native binary client-side Excel file generation.
  - Implemented the "Xuất Excel" action button in the management dashboard utilizing deep green Glassmorphic styling.
  - Coded `handleExportExcel` which formats attendance data into structured spreadsheet columns (NV Code, Name, Department, Date, Check-in, Check-out, Status, Total Hours, check-in IP, check-out IP).
  - Translated status codes to Viet translation mapping and implemented dynamic column width auto-fitting to prevent content truncation.
  - Enabled targeted exporting using table selection checkboxes (if active) or fallback to exporting all currently filtered records.
  - Generated dynamic filename based on period range labels (`Bang_Cham_Cong_Elite_Star_[startDate]_den_[endDate].xlsx`).

## [1.3.0] - 2026-06-02

### Fixed
- **Payroll Page (`app/(dashboard)/payroll/page.tsx`)**:
  - Fixed logic discrepancy between attendance logs and payroll calculations where status was ignored.
  - Added checks for `log.status` in `payrollData` memoization and calculations. Logs with `absent` or `on_leave` now correctly count as `0` valid days, and `half_day` counts as `0.5` valid days.
  - Correctly added absent, on leave, and half day logs to `missingDates` array to ensure accurate Diligence (Chuyên cần) eligibility evaluations.
- **Type Definitions (`components/profile-provider.tsx`, `app/(dashboard)/layout.tsx`)**:
  - Resolved TypeScript errors by defining and mapping the pre-existing database column `avatar_url` inside `UserProfile` interface and dashboard hydration layout.

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

# Restore Legacy Features Spec

## Why
The user reported that the migration to Next.js was incomplete and failed to carry over many features from the previous version (`AdminSys-001-his`). We need to scan the legacy codebase and restore missing functionality to ensure feature parity.

## What Changes
- **Frontend Pages**: Restore missing pages from `AdminSys-001-his/frontend/src/pages` to `AdminSys-001/src/app`.
- **Backend APIs**: Restore missing API endpoints from `AdminSys-001-his/backend/src/api` to `AdminSys-001/src/app/api`.
- **Components**: Port necessary UI components.
- **Logic**: Ensure business logic (e.g., authentication, data fetching) matches the legacy system.

## Impact
- **New Files**: Multiple new `page.tsx`, `route.ts`, and component files.
- **Modified Files**: `Layout.tsx`, `Sidebar.tsx` (for navigation), `middleware.ts` (for auth).
- **Database**: Ensure Supabase schema matches requirements (schema migration might be needed if local dev drift occurred).

## ADDED Requirements
### Requirement: Feature Parity
The new Next.js system SHALL provide all functional capabilities present in the legacy `AdminSys-001-his` system.

#### Scenario: Verify Pages
- **WHEN** user navigates to any menu item present in the legacy sidebar
- **THEN** the corresponding page should load with correct data and UI.

#### Scenario: Verify APIs
- **WHEN** frontend makes API calls
- **THEN** the backend should respond correctly, matching legacy behavior.

## MODIFIED Requirements
### Requirement: Architecture Alignment
Legacy code (React SPA + Express) MUST be adapted to Next.js App Router patterns (Server Components, API Routes).

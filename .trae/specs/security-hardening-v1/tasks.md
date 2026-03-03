# Tasks

- [ ] Task 1: Enforce Middleware Authentication: Re-enable commented-out authentication checks in middleware.ts.
  - [ ] SubTask 1.1: Uncomment and fix auth logic in `middleware.ts` to protect `/api/admin/*` routes.
  - [ ] SubTask 1.2: Ensure public routes (like `/auth`, `/api/public`) are excluded from checks.

- [ ] Task 2: Eliminate Raw SQL Endpoint: Remove the dangerous SQL execution API endpoint.
  - [ ] SubTask 2.1: Delete `src/app/api/database/sql/route.ts` (or `src/app/api/admin/database/sql/route.ts` if moved).
  - [ ] SubTask 2.2: (Optional) Remove any client-side references to this endpoint if they exist.

- [ ] Task 3: Strengthen Encryption Key Security: Prevent the system from using insecure default encryption keys.
  - [ ] SubTask 3.1: Modify `src/lib/encryption.ts` to throw an error if `ENCRYPTION_KEY` is missing or invalid.
  - [ ] SubTask 3.2: Verify that the application fails fast without a valid key in development/production.

# Task Dependencies
- [Task 1] is independent but critical for immediate API protection.
- [Task 2] is independent but critical for data safety.
- [Task 3] is independent but critical for data confidentiality.

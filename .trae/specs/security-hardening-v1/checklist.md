- [ ] Middleware Authentication Enforcement
  - [ ] Uncomment and fix authentication logic in `middleware.ts` for `/api/admin/*`
  - [ ] Ensure public routes (`/api/public/*`, `/auth/*`) are excluded from checks
  - [ ] Verify access to `/api/admin/*` is denied for unauthenticated users

- [ ] Eliminate Raw SQL Endpoint
  - [ ] Delete `src/app/api/database/sql/route.ts` (or `src/app/api/admin/database/sql/route.ts` if moved)
  - [ ] Confirm the endpoint no longer exists and returns 404

- [ ] Strengthen Encryption Key Security
  - [ ] Modify `src/lib/encryption.ts` to throw an error if `ENCRYPTION_KEY` is missing or invalid
  - [ ] Verify application fails to start or encryption fails immediately without a valid key in development/production

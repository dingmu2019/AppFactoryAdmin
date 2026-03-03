# Security Hardening Spec (v1)

## Why
A recent security audit identified three critical vulnerabilities that expose the system to unauthorized access, data loss, and sensitive information leakage. Immediate remediation is required to secure the platform.
1. **Authentication Bypass**: Middleware authentication logic is commented out, leaving admin APIs exposed.
2. **Arbitrary SQL Execution**: An exposed endpoint allows raw SQL execution, posing a severe risk of data destruction or exfiltration.
3. **Weak Encryption**: The system defaults to a zero-filled key if `ENCRYPTION_KEY` is missing, compromising encrypted data security.

## What Changes
- **Enable Middleware Authentication**: Uncomment and enforce authentication checks in `middleware.ts` for `/api/admin` routes.
- **Remove Dangerous Endpoint**: Delete the `/api/admin/database/sql` endpoint to eliminate the risk of arbitrary SQL execution.
- **Enforce Strong Encryption**: Modify `EncryptionService` to throw a fatal error if `ENCRYPTION_KEY` is missing or invalid, preventing the use of weak default keys.

## Impact
- **Affected Specs**: None directly, but security posture is significantly improved.
- **Affected Code**:
    - `middleware.ts`: Re-enabling auth logic.
    - `src/app/api/admin/database/sql/route.ts`: File deletion.
    - `src/lib/encryption.ts`: enforcing key presence.
    - `src/services/EncryptionService.ts`: (if applicable) ensuring service initialization fails without a key.

## MODIFIED Requirements

### Requirement: Middleware Authentication
The system SHALL enforce authentication for all protected routes.
- **Scenario: Admin Access**
    - **WHEN** an unauthenticated user accesses `/api/admin/*`
    - **THEN** the system MUST return a 401 Unauthorized response or redirect to login.
- **Scenario: Public Access**
    - **WHEN** a user accesses public routes (e.g., `/api/public/*`, `/auth/*`)
    - **THEN** the system MUST allow access without authentication.

### Requirement: Encryption Key Management
The system SHALL NOT start or operate if a secure encryption key is not provided.
- **Scenario: Missing Key**
    - **WHEN** the application starts without `ENCRYPTION_KEY` environment variable
    - **THEN** the Encryption Service MUST throw an error and prevent the application from using unsafe defaults.

## REMOVED Requirements

### Requirement: Raw SQL Execution Endpoint
**Reason**: The `/api/admin/database/sql` endpoint poses an unacceptable security risk (SQL Injection / Arbitrary Execution) and violates security best practices.
**Migration**: Administrators must use direct database access tools (e.g., Supabase Dashboard, pgAdmin) for ad-hoc queries.

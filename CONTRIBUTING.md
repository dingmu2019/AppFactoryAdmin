# Contributing to AppFactoryAdmin

We welcome contributions! Please follow these guidelines to help keep the project organized and efficient.

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dingmu2019/AppFactoryAdmin.git
   cd AppFactoryAdmin
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Copy `.env.example` to `.env.local` and fill in the required keys.
   ```bash
   cp .env.example .env.local
   ```
   *Required variables*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (Direct Connection for Migrations)
   - `ENCRYPTION_KEY` (32-byte hex string)

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## 📁 Project Structure

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: Reusable UI components.
- `src/services`: Business logic, integrations, and service layers.
- `src/lib`: Utility functions and shared helpers.
- `supabase/migrations`: Database schema changes.
- `docs/`: Project documentation.

## 🧪 Testing

- Run linting: `npm run lint`
- Run type checking: `npx tsc --noEmit`
- (Optional) Run tests: `npm test` (if configured)

## 📝 Commit Guidelines

- Use clear, descriptive commit messages.
- Follow conventional commits if possible (e.g., `feat: add new payment gateway`, `fix: resolve login bug`).

## ⚠️ Important Notes

- **Do not commit sensitive keys**: Ensure `.env.local` and other secrets are ignored.
- **Respect the architecture**: Place business logic in `src/services`, not directly in components or API routes.
- **Update documentation**: If you add a new feature, update `docs/FEATURES.md` or `docs/API_REFERENCE.md`.

## 🤝 Code of Conduct

Be respectful and constructive in all interactions. We aim to build a welcoming community.

# AppFactoryAdmin (AdminSys-001)

A powerful, production-ready Admin System Factory framework designed for building scalable SaaS applications. It integrates advanced AI capabilities, multi-channel payments, and robust enterprise features out of the box.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat-square&logo=tailwindcss)

## 🚀 Key Features

- **🤖 AI-First Architecture**: Built-in Agent Debate engine with "System 1/2" thinking, Reflexion Loop, and episodic memory.
- **💳 Global Payments**: Seamless integration with Stripe, Alipay, WeChat Pay, and Lakala.
- **🏢 Enterprise SaaS Ready**: Multi-tenancy, RBAC, Audit Logs, and Metered Billing.
- **⚡ High Performance**: Powered by Next.js App Router and Edge-compatible services.
- **🌐 Internationalization**: Full i18n support (English/Chinese) with auto-detection.

👉 **[View Detailed Features](docs/FEATURES.md)**

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI.
- **Backend**: Next.js API Routes, Supabase (PostgreSQL), Redis (Upstash/Self-hosted).
- **AI**: OpenAI, Google Gemini, Custom Agent Framework.
- **Infrastructure**: Vercel (Serverless), pg-boss (Job Queue).

👉 **[View Full Tech Stack](docs/TECH_STACK.md)**

## 📚 Documentation

- [**Architecture Overview**](docs/ARCHITECTURE.md) (If available)
- [**Agent Debate System**](docs/AGENT_DEBATE_ARCHITECTURE.md)
- [**SaaS Onboarding Guide**](docs/SAAS_APP_ONBOARDING.md)
- [**API Integration Guide**](docs/SaaS_API_GUIDE.md)
- [**Vercel Deployment Report**](docs/VERCEL_DEPLOYMENT_REPORT.md)

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm
- Supabase Project (or local instance)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dingmu2019/AppFactoryAdmin.git
   cd AppFactoryAdmin
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `.env.local` and fill in your credentials.
   ```bash
   cp .env.example .env.local
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is proprietary software. Please check the license file for details.

---

*Built with ❤️ by the AppFactoryAdmin Team*

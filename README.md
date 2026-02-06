<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AdminSys - Next-Gen Full-Stack Management Platform

**AdminSys** is a comprehensive management platform designed for super individuals and developers. It deeply integrates AI agent orchestration, visual database management, full-link log auditing, and powerful API gateway capabilities, helping you quickly build, deploy, and operate high-availability SaaS applications.

## Key Features

- **🤖 AI Agent Factory**: Built-in extensible AI Agent framework and skills marketplace. Support natural language Ops and custom business logic execution.
- **👁️ System Observability**: Granular audit logs (user actions) and real-time system error monitoring with stack trace analysis.
- **🗄️ Data Center**: Intuitive database Schema visualization, data browsing, and one-click DDL script generation.
- **🔌 API Governance**: Automated API documentation generation, authentication management, and access control.
- **🧩 Skills System**: Plugin-based architecture allowing dynamic extension of system capabilities via ZIP packages.

## Quick Start

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   # or
   cd frontend && npm install
   cd backend && npm install
   ```

2. Configure Environment:
   Set the `GEMINI_API_KEY` and database credentials in `.env` file.

3. Run the app:
   ```bash
   # Frontend
   cd frontend && npm run dev
   
   # Backend
   cd backend && npm run dev
   ```

## 项目开发规范 (Global Specifications)

### 1. 编码规范 (Coding Standards)
- **简洁性**：在实现功能时，优先选择简洁、清晰、易于维护的代码方案。避免过度设计和不必要的复杂性，能用简单逻辑和标准库/框架功能实现的，就不引入复杂的第三方库或设计模式。
- **中文注释**：所有代码块（包括函数、类、方法、复杂逻辑段）都必须添加清晰的中文注释。注释应说明代码块的功能、关键逻辑、输入输出参数的含义以及重要的业务规则或算法说明。
- **文件大小**：如果代码超过1000行，强烈建议分拆，包括前端页面文件。

### 2. 日志记录说明 (Logging Standards)
- **审计日志（行为日志）**：所有用户的关键操作行为（如登录、登出、数据增删改查、配置修改等）都必须记录到审计日志中。
  - **内容要求**：操作时间、用户标识、操作类型、操作对象、操作结果（成功/失败）以及必要的上下文信息（如IP地址、请求参数等）。
- **系统错误日志**：所有系统运行时错误、异常和警告都必须记录到系统错误日志中。
  - **内容要求**：错误类型、错误消息、堆栈跟踪、发生错误的模块、函数以及触发错误的相关数据或请求ID，以便于快速定位、排查和修复问题。

### 3. 数据库DDL规范 (Database DDL Standards)
所有数据定义语言（DDL）脚本（表、视图、索引、触发器、存储过程、函数等）都必须包含详细的中文注释。
- **表注释**：说明表的业务用途和存储的核心数据。
- **列注释**：说明每个字段的业务含义、数据类型约束以及与其他表字段的关联关系。
- **索引注释**：说明创建索引的目的、优化查询的类型以及涉及的字段。
- **触发器/存储过程注释**：说明其功能、触发条件、执行逻辑以及在整个数据流程中的作用。
- **脚本文件名称**：所有新增加的脚本都用新的文件，文件命名中应该包含序号。

### 4. UI规范 (UI/UX Standards)
- **一致性**：保持整个前端应用界面风格、组件样式、交互逻辑的高度一致性。使用统一的设计系统、色彩体系、字体、间距和图标库。
- **自定义弹窗**：所有交互弹窗、提示框、通知消息必须使用自定义的精美UI组件，**禁止**使用浏览器或操作系统的原生默认提示样式（如 `alert`, `confirm`）。
- **组件化**：遵循组件化原则，将可复用UI元素和业务逻辑封装为独立组件，确保职责单一、接口清晰。
- **国际化 (i18n)**：确保所有界面文本、提示信息、日期/数字格式支持动态切换语言。
- **主题适配**：完整支持浅色与深色主题模式。所有UI元素的颜色、背景、边框必须适配当前主题，确保在两种模式下都有良好的对比度与视觉体验。

### 5. API 设计规范加入项目核心记忆：

- **规范标准** ：严格遵循 Open API 3.0。
- **参数要求** ：必须包含名称、类型、必填性、范围及示例值。
- **返回值要求** ：涵盖所有状态码、响应体结构及字段含义。
- **错误码要求** ：提供结构化的错误响应（Code, Message, Solution）。

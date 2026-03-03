# Tasks

- [x] Task 1: 增强 `login-with-code` API 以支持自动注册和密码同步
  - [x] 1.1: 在 [login-with-code/route.ts](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/auth/login-with-code/route.ts) 中增加查询用户是否存在（通过 `admin.listUsers` 或查询 `public.users`）的逻辑。
  - [x] 1.2: 如果用户不存在，调用 `admin.createUser`：设置 `email`, `password` (为当前验证码), `email_confirm: true`, 并在 `user_metadata` 中设置 `role: 'user'`。
  - [x] 1.3: 如果用户已存在，调用 `admin.updateUserById`：将其 `password` 更新为当前的验证码。
- [x] Task 2: 在中间件中实现基于角色的访问拦截
  - [x] 2.1: 在 [middleware.ts](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/middleware.ts) 中，获取 `user` 后，检查其 `user_metadata.role` 或 `app_metadata.roles`。
  - [x] 2.2: 实现逻辑：如果用户已登录，且其角色**仅**包含 `user`（不包含 `admin`, `editor`, `viewer`），且当前访问的路径不是 `/auth/*` 或 `/api/public/*`，则判定为越权。
  - [x] 2.3: 对于越权的请求：
    - 如果是页面请求（不包含 `/api/`），重定向至 `/auth/login?error=unauthorized`。
    - 如果是 API 请求，返回 403 Forbidden 响应。
- [x] Task 3: 完善前端提示与自动退出逻辑
  - [x] 3.1: 在 [login/page.tsx](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/auth/login/page.tsx) 中增加对 `error=unauthorized` 参数的处理，显示“无权访问本系统”的提示。
  - [x] 3.2: 确保在显示提示的同时，清除客户端的 Supabase 会话（调用 `auth.signOut()`）。

# Task Dependencies
- Task 2 依赖 Task 1 (需要有用户才能测试拦截)
- Task 3 依赖 Task 2 (需要拦截触发重定向)

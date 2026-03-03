# 验证码登录自动注册与普通用户限制 Spec

## Why
目前系统在通过邮箱验证码登录时，如果邮箱不存在，不会自动创建用户，导致新用户无法登录。此外，系统需要限制普通用户（role='user'）访问管理端，以确保系统安全性并提供明确的反馈。

## What Changes
- **自动注册**: 修改 `login-with-code` API，在验证码校验通过后，如果用户不存在，则自动在 `auth.users` 中创建用户。
- **密码同步**: 新创建用户的密码默认为登录所使用的验证码；已存在用户的密码也会更新为当前的验证码，以满足“密码默认为登录验证码”的要求。
- **角色分配**: 新注册用户默认分配 `user`（普通用户）角色。
- **访问限制**: 更新中间件 `middleware.ts`，检查登录用户的角色。如果用户仅拥有 `user` 角色且没有管理权限（admin, editor, viewer），则禁止其访问受保护的管理页面。
- **前端反馈**: 当普通用户登录后，如果检测到权限不足，系统应提示“无权访问本系统”并强制退出登录。

## Impact
- Affected code:
  - [login-with-code/route.ts](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/auth/login-with-code/route.ts): 增加用户创建、密码更新和角色设置逻辑。
  - [middleware.ts](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/middleware.ts): 增加基于角色的访问控制逻辑。
  - [login/page.tsx](file:///Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/auth/login/page.tsx): 登录成功后的权限预检与反馈。

## ADDED Requirements
### Requirement: 自动注册与密码同步
系统应在验证码登录流程中实现自动注册。
#### Scenario: 邮箱不存在时自动注册
- **WHEN** 用户使用未注册的邮箱和正确的验证码调用 `login-with-code`
- **THEN** 系统应创建 `auth.users` 记录，密码设为该验证码，角色设为 `user`，并返回登录 Token。

#### Scenario: 邮箱已存在时同步密码
- **WHEN** 用户使用已注册邮箱和正确的验证码登录
- **THEN** 系统应将该用户的密码更新为当前的验证码，并返回登录 Token。

### Requirement: 普通用户登录拦截
系统应拦截并提示普通用户。
#### Scenario: 普通用户尝试进入系统
- **WHEN** 角色仅为 `user` 的用户登录成功后尝试访问非公开页面
- **THEN** 中间件或前端逻辑应识别其权限不足，显示“无权访问本系统”并强制退出。

## MODIFIED Requirements
### Requirement: 登录 API 安全逻辑
- **WHEN** `login-with-code` 校验成功
- **THEN** 必须确保 `public.users` 中也有对应记录（通过现有触发器自动完成）。

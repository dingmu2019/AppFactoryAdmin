# 实施方案：2C SaaS 工厂 RBAC 权限系统

我们已经完成了数据库层面的设计与迁移脚本生成。接下来的实施将按照以下步骤进行：

## 1. 数据库部署 (Database Migration)
将生成的 `25_rbac_system.sql` 应用到 Supabase 数据库，建立核心表结构并初始化基础数据（权限、角色）。

## 2. 后端中间件开发 (Backend Middleware)
在 `backend/src/middleware/` 目录下创建 `rbac.ts`，实现以下核心逻辑：
1.  **Scope 解析**: 从请求 Header (`x-app-id`) 或路径参数中提取当前操作的 App Context。
2.  **Permission Check**: 编写 `requirePermission(code)` 中间件，调用数据库查询当前用户是否在当前 Scope 下拥有指定权限。
3.  **Global Admin Override**: 确保拥有全局 Super Admin 角色的用户可以无视 App 限制。

## 3. 业务接口集成 (Integration)
选择关键的高风险接口进行权限加固（示例）：
*   `POST /orders/:id/refund` -> 增加 `requirePermission('order.refund')`
*   `POST /apps` -> 增加 `requirePermission('app.create')` (仅全局管理员可调)

## 4. 前端适配 (Frontend)
1.  **State Management**: 在全局 Context 中存储当前用户的 `permissions` 列表（根据当前选中的 App 动态变化）。
2.  **UI Control**: 封装 `<AccessControl permission="code">` 组件，用于控制按钮/菜单的显隐。

## 5. 验证 (Verification)
创建一个测试脚本或手动流程：
1.  创建一个仅有 "Operator" 角色的用户。
2.  尝试调用 "创建应用" 接口 -> 预期失败 (403)。
3.  尝试调用 "退款" 接口 -> 预期成功 (200)。

---
name: "supabase-db-backup"
description: "通用 Supabase 数据库备份技能。自动识别项目名称并从 .env.local 提取 DIRECT_URL 备份数据库并压缩为 ZIP。格式：[ProjectName]-DB-BK-yyyyMMddHHmmss.zip。"
---

# Supabase 数据库备份技能 (通用版)

该技能用于完整备份项目的 Supabase 数据库（包含架构和数据），并根据项目名称动态生成 ZIP 文件名。

## 使用场景
- 用户要求“备份数据库”或“备份本项目数据库”时。
- 在不同项目中通用，无需手动修改项目名称。

## 执行步骤

1. **自动识别项目名称**：
   - 首先尝试从根目录的 `package.json` 中读取 `"name"` 字段。
   - 如果 `package.json` 不存在或没有名称，则使用当前工作目录的文件夹名称。
   - 过滤掉名称中的特殊字符（如 `@/`），确保文件名合法。

2. **提取数据库连接信息**：
   - 从项目根目录的 `.env.local` 或 `.env` 文件中读取 `DIRECT_URL` 变量。
   - `DIRECT_URL` 格式通常为：`postgresql://[user]:[password]@[host]:[port]/[database]`

3. **生成带时间戳的文件名**：
   - 格式：`backups/[ProjectName]-DB-BK-yyyyMMddHHmmss.zip` (保存到项目根目录下的 backups/ 文件夹中)
   - 例如：`backups/AdminSys-001-DB-BK-20260310153045.zip`

4. **执行备份与压缩**：
   ```bash
   # 创建备份目录（如果不存在）
   mkdir -p backups
   # 导出数据
   pg_dump "YOUR_DATABASE_URL" > backup.sql
   # 压缩文件并保存到 backups 目录
   zip "backups/[ProjectName]-DB-BK-$(date +%Y%m%d%H%M%S).zip" backup.sql
   # 清理临时文件
   rm backup.sql
   ```

5. **反馈结果**：
   - 告知用户备份文件的完整名称及其保存位置（项目根目录下的 backups/ 文件夹）。

## 注意事项
- **环境要求**：本地必须安装 `pg_dump` 和 `zip` 命令行工具。
- **权限**：确保 `DIRECT_URL` 拥有足够的导出权限（通常是 postgres 用户）。
- **安全性**：备份文件包含敏感数据，严禁提交到 Git 仓库，建议将其加入 `.gitignore`。

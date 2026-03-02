---
name: "备份项目代码"
description: "智能备份项目代码。当用户要求备份项目、打包源码或进行快照时调用。自动排除依赖文件，生成轻量级ZIP包。"
---

# 备份项目代码 (Project Backup Skill)

此技能用于快速、智能地备份当前项目的源代码和核心配置，自动排除庞大的依赖库和临时文件，生成易于传输和存储的 ZIP 压缩包。

## 适用场景 (When to Use)

- 当用户说 "帮我备份一下项目"
- 当用户说 "打包源代码"
- 当用户说 "生成项目快照"
- 当用户询问 "怎么把代码发给别人"
- 在进行重大重构或危险操作前，建议用户备份时

## 功能特性 (Features)

1.  **智能排除**：自动识别并排除 `node_modules`, `.next`, `.git`, `.trae` 等非核心大文件。
2.  **时间戳命名**：文件名包含精确到秒的时间戳（格式：`AdminSys-001 yyyyMMddHHmmss.zip`），防止覆盖。
3.  **安全存放**：备份文件存放在项目根目录的上一级目录（或指定目录），避免污染源代码。
4.  **快速验证**：备份完成后自动显示文件大小和路径，并尝试在文件管理器中打开。

## 执行逻辑 (Execution Steps)

此技能将自动执行以下 Bash 脚本逻辑（无需用户手动输入命令）：

```bash
#!/bin/bash

# 1. 配置参数
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
PROJECT_NAME="AdminSys-001"
BACKUP_FILENAME="${PROJECT_NAME} ${TIMESTAMP}.zip"
DEST_DIR="/Users/mac/Desktop/软件项目/mc-cwin"  # 默认存放路径，可根据需要调整
OUTPUT_FILE="${DEST_DIR}/${BACKUP_FILENAME}"

# 2. 确保目标目录存在
mkdir -p "$DEST_DIR"

# 3. 执行压缩 (排除大文件)
echo "正在备份 ${PROJECT_NAME}..."
zip -r -q "$OUTPUT_FILE" . \
    -x "node_modules/*" \
    -x ".next/*" \
    -x ".git/*" \
    -x ".trae/*" \
    -x "*.DS_Store" \
    -x "*.zip"

# 4. 验证结果
if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "✅ 备份成功！"
    echo "文件名: ${BACKUP_FILENAME}"
    echo "路径: ${OUTPUT_FILE}"
    echo "大小: ${FILE_SIZE}"
    
    # 尝试打开存放目录 (仅 macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -R "$OUTPUT_FILE"
    fi
else
    echo "❌ 备份失败，请检查权限或磁盘空间。"
    exit 1
fi
```

## 注意事项

- 此技能生成的备份包含所有源代码、配置文件 (.env, package.json) 和数据库迁移脚本。
- **不包含** `node_modules`，恢复时需运行 `npm install`。
- **不包含** `.next` 构建缓存，恢复后首次运行 `npm run dev` 会自动重新生成。

#!/bin/bash

# 获取当前时间，格式为 yyyyMMddHHmmss
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# 定义源目录（当前脚本所在目录的上一级，或者是当前目录，取决于脚本存放位置）
# 假设脚本放在项目根目录下运行，或者直接在项目根目录运行命令
SOURCE_DIR="."

# 定义目标文件名
BACKUP_FILENAME="AdminSys-001 ${TIMESTAMP}.zip"

# 定义目标存放路径
DEST_DIR="/Users/mac/Desktop/软件项目/mc-cwin"

# 确保目标目录存在
mkdir -p "$DEST_DIR"

# 完整的输出文件路径
OUTPUT_FILE="${DEST_DIR}/${BACKUP_FILENAME}"

echo "开始备份项目..."
echo "源目录: $(pwd)"
echo "排除目录: node_modules, .next, .git, .trae"
echo "目标文件: ${OUTPUT_FILE}"

# 使用 zip 命令进行压缩
# -r: 递归处理
# -q: 安静模式
# -x: 排除文件或目录
# 注意：排除模式需要匹配相对路径
zip -r "$OUTPUT_FILE" . -x "node_modules/*" -x ".next/*" -x ".git/*" -x ".trae/*" -x "*.DS_Store"

# 检查是否成功
if [ $? -eq 0 ]; then
    echo "✅ 备份成功！"
    echo "文件已保存至: ${OUTPUT_FILE}"
    
    # 显示文件大小
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "备份文件大小: ${FILE_SIZE}"
    
    # 在 Finder 中显示
    open -R "$OUTPUT_FILE"
else
    echo "❌ 备份失败！请检查权限或路径是否正确。"
    exit 1
fi

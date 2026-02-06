export const skills = {
    title: "Skills 管理",
    subtitle: "管理 AI 技能（插件）。上传包含 manifest.json 的 ZIP 包以扩展能力。",
    total: "技能总数",
    active: "已启用",
    refresh: "刷新",
    upload: "上传技能",
    searchPlaceholder: "按名称或指令搜索...",
    filter: "筛选",
    noSkills: "未找到技能",
    noSkillsDesc: "暂无安装 AI 技能。请上传技能包以扩展能力。",
    uploadNow: "立即上传",
    card: {
      version: "版本",
      by: "作者",
      command: "指令",
      enable: "启用",
      disable: "禁用",
      delete: "删除"
    },
    uploadModal: {
      title: "上传新技能",
      dragDrop: "点击上传或拖拽文件至此",
      fileLimit: "仅支持 ZIP 文件 (最大 50MB)",
      manifestHint: "包内必须包含",
      cancel: "取消",
      uploading: "上传中...",
      upload: "上传技能",
      remove: "移除文件"
    },
    messages: {
      uploadSuccess: "技能上传成功",
      deleteSuccess: "技能已删除",
      statusUpdated: "技能状态已更新",
      deleteConfirmTitle: "删除技能",
      deleteConfirmDesc: "确定要删除此技能吗？此操作无法撤销。",
      deleteConfirmBtn: "确认删除"
    },
    errors: {
        invalidFile: "仅支持 .zip 文件",
        sizeExceeded: "文件大小超过 50MB 限制",
        uploadFailed: "上传失败",
        generic: "操作失败"
    }
};
export const apps = {
    subtitle: "管理您的 SaaS 应用接入、API 密钥及权限配置",
    yourApps: "您的应用",
    users: "用户",
    credentials: "API 凭证",
    appId: "应用 ID",
    pubKey: "API Key (公钥)",
    secretKey: "Secret Key (私钥)",
    secretWarning: "请妥善保管您的 Secret Key，切勿在前端代码中直接使用。",
    intelligence: "智能配置",
    aiModel: "AI 模型",
    aiModelDesc: "当前应用使用的底层大模型",
    difyBinding: "Dify 绑定",
    difyBindingDesc: "关联的 Dify 应用 ID",
    verify: "已验证",
    webhooks: "Webhooks",
    noWebhooks: "未配置 Webhooks",
    noWebhooksDesc: "配置 Webhook URL 以接收实时事件通知。",
    addEndpoint: "添加端点",
    selectApp: "选择一个应用",
    selectAppDesc: "查看详情和配置选项",
    status: {
      active: "运行中",
      development: "开发中",
      suspended: "已暂停"
    },
    form: {
      createTitle: "创建新应用",
      editTitle: "编辑应用",
      appName: "应用名称",
      description: "描述",
      status: "状态",
      selectModel: "选择模型",
      selectTemplate: "选择应用模板",
      ipWhitelist: "IP 白名单 (逗号分隔，使用 * 代表全部允许)",
      advancedConfig: "高级配置"
    },
    templates: {
      blank: "空白应用",
      blankDesc: "空配置",
      ecommerce: "电商应用",
      ecommerceDesc: "订单 & 支付",
      aiAgent: "AI 智能体",
      aiAgentDesc: "AI 网关 & 对话",
      devTool: "开发者工具",
      devToolDesc: "API & Webhooks"
    },
    actions: {
      deleteConfirm: "确定要删除此应用吗？此操作将立即吊销所有 API 密钥。",
      deleteSuccess: "应用删除成功"
    },
    alerts: {
      enterName: "请输入应用名称。"
    },
    placeholders: {
      appName: "例如：Awesome SaaS",
      customId: "可选的自定义 UUID 或 ID",
      description: "应用的简要描述...",
      difyId: "可选的 Dify 应用 ID",
      ipWhitelist: "例如：192.168.1.1, 10.0.0.5 或 *"
    },
    hints: {
      autoUUID: "留空以自动生成 UUID"
    }
};

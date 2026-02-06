export const integration = {
  title: '集成管理',
  subtitle: '配置外部服务与系统集成参数',
  categories: {
    llm: '大模型 (LLM)',
    email: '邮件 (Email)',
    database: '数据库 (DB)',
    payment: '支付 (Payment)',
    notification: '消息 (Notify)',
    wechat: '企业微信',
    feishu: '飞书',
    lark: 'Lark',
    whatsapp: 'WhatsApp',
    enterprise: '企业信息配置',
    selectCategory: '请选择集成类别进行配置'
  },
  llm: {
    title: '大模型配置 (LLM)',
    subtitle: '配置多个模型以实现负载均衡与故障转移',
    addModel: '添加模型',
    editModel: '编辑模型',
    noModels: '暂无模型配置',
    addFirst: '点击添加第一个模型',
    enableModel: '启用此模型',
    enableDesc: '启用后将参与负载均衡与故障转移',
    setPrimary: '设为主要模型 (Primary)',
    primaryDesc: '主要模型将优先用于处理请求',
    provider: 'AI 提供商',
    modelName: '模型名称',
    baseUrl: '接口地址 (Base URL)',
    apiKey: 'API Key',
    azureHint: 'Azure URL 需包含 {resource} 和 {deployment}',
    maxTokens: 'Max Tokens',
    temperature: 'Temperature',
    primary: '主要',
    enabled: '已启用',
    disabled: '已禁用'
  },
  payment: {
    title: '支付通道配置',
    provider: '支付服务商',
    merchantId: '商户号 (Merchant ID)',
    appId: '应用 ID (App ID)',
    publicKey: '公钥 / Publishable Key',
    secretKey: '私钥 / Secret Key',
    webhookSecret: 'Webhook 密钥',
    certificatePath: '证书路径',
    sandbox: '沙箱环境 (Sandbox Mode)',
    selectProvider: '请选择支付服务商进行配置',
    providers: {
      wechat: '微信支付',
      alipay: '支付宝'
    },
    placeholder: {
      merchantId: '请输入商户号',
      appId: '请输入 App ID',
      publicKey: 'pk_test_...',
      secretKey: 'sk_test_... 或 私钥内容',
      webhookSecret: 'whsec_...'
    }
  },
  email: {
    title: '邮件发送配置',
    host: 'SMTP 服务器',
    port: '端口',
    user: '账户',
    pass: '密码',
    senderName: '发送者名称',
    testRecipient: '测试收件人',
    testSubject: '测试主题',
    testContent: '来自 Admin 系统的测试邮件',
    sendTest: '发送测试邮件'
  },
  database: {
    title: '数据库连接配置',
    type: '数据库类型',
    host: '主机 (Host)',
    port: '端口 (Port)',
    database: '数据库名 (Database)',
    user: '用户名 (User)',
    password: '密码 (Password)',
    testConnection: '测试连接',
    supabaseHint: {
      title: 'Supabase 连接提示',
      body: '建议使用 Transaction Pooler 连接信息（通常端口为 6543 或 5432）。请确保启用了 IPv4 支持。'
    }
  },
  notification: {
    title: '消息通道（Notification Channels）',
    channel: '通道',
    messageType: '消息类型',
    config: '通道配置',
    name: '通道名称',
    providerType: 'Provider 类型',
    providerName: 'Provider 名称',
    providerStatus: 'Provider 状态',
    webhookUrl: 'Webhook URL',
    headers: 'Headers (JSON)',
    template: '模板',
    format: '格式',
    formatOptions: {
      text: '文本 (TEXT)',
      html: '网页 (HTML)',
      json: 'JSON'
    },
    subject: '主题（邮件可选）',
    body: '模板内容',
    testRecipient: '测试收件人',
    recipientPlaceholder: {
      email: 'user@example.com',
      im: '接收人 ID / OpenID',
      sms: '手机号',
      whatsapp: '手机号 (含国家代码)'
    },
    variables: '变量 (JSON)',
    sendTest: '测试发送',
    types: {
      email: '邮件',
      sms: '短信',
      im: '即时消息',
      whatsapp: 'WhatsApp'
    },
    messageTypes: {
      login_verification: '登录验证码',
      generic: '通用通知',
      test: '测试'
    },
    providers: {
      smtp: 'SMTP (邮件)',
      webhook: 'Webhook (通用)'
    },
    errors: {
      invalidHeaders: 'Headers JSON 无效：{error}',
      webhookUrlRequired: 'Webhook URL 必填',
      templateBodyRequired: '模板内容必填'
    }
  },
  wechat: {
    title: '企业微信集成',
    corpId: '企业 ID (Corp ID)',
    agentId: '应用 ID (Agent ID)',
    secret: '应用密钥 (Secret)',
    recipient: '接收人 (User ID)',
    content: '内容',
    testContent: '来自 Admin 系统的测试消息',
    placeholder: {
      corpId: '请输入 Corp ID',
      agentId: '请输入 Agent ID',
      recipient: 'e.g. ZhangSan'
    }
  },
  feishu: {
    title: '飞书集成 (Feishu)',
    appId: 'App ID',
    appSecret: 'App Secret',
    encryptKey: 'Encrypt Key (可选)',
    verificationToken: 'Verification Token (可选)',
    recipient: '接收人 (OpenID / Email)',
    content: '内容',
    testContent: '来自 Admin 系统的测试消息 (飞书)',
    placeholder: {
      appId: 'cli_...',
      encryptKey: '事件订阅加密Key',
      verificationToken: '事件验证Token',
      recipient: 'e.g. ou_xxx 或 user@example.com'
    }
  },
  lark: {
    title: 'Lark集成 (国际版)',
    appId: 'App ID',
    appSecret: 'App Secret',
    encryptKey: 'Encrypt Key (可选)',
    verificationToken: 'Verification Token (可选)',
    recipient: '接收人 (OpenID / Email)',
    content: '内容',
    testContent: '来自 Admin 系统的测试消息 (Lark)',
    placeholder: {
      appId: 'cli_...',
      recipient: 'e.g. user@example.com'
    }
  },
  whatsapp: {
    title: 'WhatsApp Business API',
    phoneNumberId: '电话号码 ID',
    accountId: 'WhatsApp 商业账号 ID',
    token: '访问令牌 (System User Token)',
    recipient: '接收人电话号码',
    content: '内容',
    placeholder: {
      phoneNumberId: '例如: 100555555555555',
      accountId: '例如: 100999999999999',
      token: 'EAAB...',
      recipient: '例如: 15551234567',
      testContent: '来自 Admin 系统 (WhatsApp) 的测试消息'
    },
    hint: {
      token: '* 请确保令牌拥有 whatsapp_business_messaging 权限',
      recipient: '必须包含国家代码 (例如: 美国为1, 中国为86)'
    }
  },
  enterprise: {
    title: '企业信息配置',
    name: '企业名称',
    address: '总部地址',
    description: '企业简介',
    departments: '部门简介',
    placeholder: {
      departments: '例如：研发部、市场部、人力资源部...'
    }
  }
};

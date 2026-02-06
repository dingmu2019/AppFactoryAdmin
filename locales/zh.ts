
export const zh = {
  common: {
    adminUser: "超级管理员",
    overview: "概览",
    // Menu Items
    appManagement: "应用管理",
    aiAssistant: "AI 助理",
    partnerManagement: "伙伴中心",
    partnerList: "伙伴列表",
    partnerRebates: "伙伴返利",
    productCenter: "商品中心",
    userManagement: "用户中心",
    orderCenter: "订单中心",
    orderList: "订单列表",
    orderRefund: "订单退款",
    dataCenter: "报表中心",
    trafficReports: "流量与成本",
    userReports: "用户报表",
    feedbackCenter: "反馈中心",
    systemManagement: "系统管理",
    aboutSystem: "关于系统",
    // System Sub-menus
    dictionary: "字典管理",
    integration: "集成管理",
    databaseStructure: "数据库结构",
    aiAgentManagement: "AI Agent 管理",
    ai: {
        noDesc: "暂无描述"
    },
    apiManagement: "API管理",
    rulesTriggers: "规则&触发器",
    auditLog: "审计日志",
    systemErrorLog: "系统错误日志",
    roles: "用户角色管理",
    
    settings: "设置",
    comingSoon: "敬请期待",
    devMessage: "该模块正在开发中。",
    newApp: "新建应用",
    filter: "筛选",
    viewAll: "查看全部",
    loading: "加载中...",
    logout: "登出",
    theme: "主题",
    language: "语言",
    save: "保存",
    cancel: "取消",
    delete: "删除",
    edit: "编辑",
    allApps: "所有应用",
    confirmDelete: "确认删除",
    
    // Pagination & Common Filters
    showing: "显示",
    to: "至",
    of: "共",
    results: "条记录",
    rowsPerPage: "每页显示",
    prev: "上一页",
    next: "下一页",
    allCategories: "所有分类",
    allStatus: "所有状态",
    allRoles: "所有角色"
  },
  login: {
      subtitle: "Admin Console",
      tabPassword: "使用密码登录",
      tabCode: "使用验证码登录",
      labelEmail: "邮箱",
      emailPlaceholder: "name@company.com",
      labelPassword: "密码",
      labelCode: "验证码",
      sendCode: "发送验证码",
      codeHint: "必须包含8位字符（字母+数字+符号）",
      signIn: "登录系统",
      themeToggle: "切换主题",
      secureConnection: "已启用 256位 TLS 安全连接",
      codeSent: "验证码已发送至邮箱",
      welcomeBack: "欢迎归来，指挥官",
      error: {
          emailRequired: "请输入邮箱地址",
          invalidCredentials: "邮箱或密码错误",
          invalidCodeFormat: "验证码格式错误 (8位混合字符)",
          invalidCode: "验证码无效"
      }
  },
  about: {
    title: "关于 SaaS Factory",
    description: "本系统是专为超级个体打造的综合性 SaaS 管理平台。集成了多租户管理、统一身份认证、全球化支付处理以及 AI 网关聚合等核心能力，助力快速孵化与变现。",
    copyright: "© 2026 mc-cwin. All rights reserved."
  },
  dashboard: {
    totalRevenue: "月总收入",
    activeUsers: "活跃用户",
    apiRequests: "API 请求",
    activeApps: "活跃应用",
    revenueOverview: "收入概览",
    systemActivity: "系统动态",
    viewLogs: "查看日志",
    last12Months: "最近12个月",
    last30Days: "最近30天",
    last7Days: "最近7天"
  },
  apps: {
    yourApps: "我的应用",
    selectApp: "选择一个应用查看详情",
    selectAppDesc: "管理 API 密钥、计费设置和 AI 配置。",
    credentials: "API 凭证",
    appId: "应用 ID (公开)",
    pubKey: "发布密钥 (Public)",
    secretKey: "安全密钥 (Secret)",
    secretWarning: "⚠️ 严禁在客户端代码中泄露 Secret Key。",
    intelligence: "智能与 Dify 集成",
    aiModel: "AI 模型配置",
    aiModelDesc: "该应用使用的默认基础模型。",
    difyBinding: "Dify Agent 绑定",
    difyBindingDesc: "关联 Dify App ID 以启用高级 Agent 工作流。",
    verify: "验证",
    webhooks: "Webhooks",
    noWebhooks: "未配置端点",
    noWebhooksDesc: "监听如 `order.created` 或 `ai.completed` 等事件。",
    addEndpoint: "添加端点",
    status: {
      active: "运行中",
      development: "开发中",
      suspended: "已暂停"
    },
    users: "用户",
    form: {
      createTitle: "创建新应用",
      editTitle: "编辑应用",
      appName: "应用名称",
      description: "应用描述",
      status: "应用状态",
      selectModel: "选择 AI 模型"
    },
    actions: {
      deleteConfirm: "确定要删除该应用吗？此操作无法撤销。",
      deleteSuccess: "应用已删除"
    }
  },
  commerce: {
    title: "订单与交易",
    subtitle: "查看全平台的流水与交易状态。",
    stripe: "Stripe 仪表盘",
    export: "导出报表",
    recentTx: "近期交易",
    txId: "交易 ID",
    source: "应用来源",
    customer: "客户",
    date: "日期",
    amount: "金额",
    status: "状态",
    statusMap: {
      succeeded: "成功",
      pending: "处理中",
      failed: "失败"
    }
  },
  ai: {
    title: "报表中心",
    subtitle: "监控 AI 网关流量与成本分析。",
    operational: "系统正常",
    consumption: "Token 消耗 (近7日)",
    providers: "模型供应商",
    primary: "主要供应商",
    backup: "备用供应商",
    configure: "配置密钥",
    costOpt: "成本优化",
    savedMsgPrefix: "通过使用 Gemini Flash 处理二级流量，本月您已节省约",
    budgetUsed: "预算使用率"
  },
  products: {
    title: "商品及服务",
    subtitle: "管理全球化定价策略、商品类型及税务规则。",
    tabs: {
      list: "商品列表",
      categories: "分类管理"
    },
    newProduct: "新建商品",
    newCategory: "新建分类",
    table: {
      name: "商品名称",
      sku: "SKU",
      app: "所属应用",
      type: "类型",
      category: "分类",
      pricing: "定价概览",
      status: "状态"
    },
    form: {
      basicInfo: "基本信息",
      pricingStrategy: "多区域定价策略",
      pricingNote: "所有价格均为含税价（Tax Inclusive）。系统将根据买家IP自动匹配区域。",
      productName: "商品名称",
      productDesc: "商品描述",
      skuCode: "SKU 编码",
      selectApp: "所属应用",
      selectCategory: "选择分类",
      selectType: "选择类型",
      region: "区域 (Region)",
      currency: "币种",
      amount: "含税金额",
      addPrice: "添加区域定价",
      status: "商品状态",
      lang: {
        en: "英文 (English)",
        zh: "中文 (Chinese)"
      }
    },
    status: {
      active: "销售中",
      inactive: "已禁售"
    },
    types: {
      subscription: "订阅制 (Subscription)",
      one_time: "一次性 (One-time)",
      usage_based: "用量计费 (Usage-based)"
    }
  },
  users: {
    title: "用户中心",
    subtitle: "管理全平台的管理员及终端用户。",
    newUser: "新建用户",
    table: {
      user: "用户",
      role: "角色",
      app: "来源应用",
      status: "状态",
      joinDate: "加入时间",
      location: "所在地区",
      lastLogin: "最后登录"
    },
    roles: {
      admin: "管理员",
      editor: "编辑",
      viewer: "访客",
      user: "终端用户"
    },
    status: {
      active: "正常",
      suspended: "封禁",
      pending: "待激活"
    },
    form: {
      userInfo: "用户信息",
      name: "姓名",
      email: "邮箱地址",
      gender: "性别",
      phone: "手机号码",
      regionInfo: "地区信息",
      country: "国家/地区",
      province: "省/州",
      city: "城市",
      selectApp: "关联应用",
      selectRole: "选择角色",
      selectStatus: "账户状态",
      platformAdmin: "平台超级管理员 (Platform)"
    },
    gender: {
      male: "男",
      female: "女",
      other: "其他"
    }
  }
};

export const audit = {
    title: "审计日志",
    subtitle: "追踪和监控系统内的所有用户活动。",
    todayStats: "今日活动",
    failedStats: "失败操作",
    searchPlaceholder: "按用户ID搜索...",
    allApps: "所有应用",
    allActions: "所有动作",
    allResources: "所有资源",
    export: "导出",
    empty: "未找到匹配的审计日志。",
    loading: "日志加载中...",
    table: {
      time: "时间",
      user: "用户",
      action: "动作",
      resource: "资源",
      status: "状态",
      details: "详情",
      success: "成功",
      failed: "失败"
    },
    detail: {
      title: "审计日志详情",
      requestId: "请求 ID",
      timestamp: "时间戳",
      clientInfo: "客户端信息",
      payload: "变更内容 / Payload",
      close: "关闭"
    },
    anonymous: "系统 / 匿名",
    actionType: {
      create: "创建 (POST)",
      update: "更新 (PUT)",
      delete: "删除 (DELETE)",
      read: "读取 (GET)",
      login: "登录"
    },
    resourceType: {
      database: "数据库",
      users: "用户",
      settings: "设置",
      auth: "认证"
    }
};

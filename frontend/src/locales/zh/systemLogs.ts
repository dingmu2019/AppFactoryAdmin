export const systemLogs = {
    title: "系统日志",
    subtitle: "系统错误日志表，记录后端运行时抛出的所有异常。",
    searchPlaceholder: "筛选：模块 / 内容 / 用户 / IP",
    empty: "暂无日志",
    stats: {
        today: "今日错误",
        unresolved: "未解决",
        fatal: "致命错误"
    },
    table: {
      time: "时间",
      level: "级别",
      module: "模块",
      message: "内容",
      path: "路径",
      resolved: "解决状态",
      details: "详情",
      status: {
          resolved: "已解决",
          open: "未解决"
      },
      actions: {
          resolve: "标记为已解决",
          reopen: "重新打开"
      }
    },
    detail: {
        title: "错误详情",
        message: "错误信息",
        timestamp: "时间戳",
        app: "应用",
        path: "请求路径",
        stack: "堆栈跟踪",
        copyTrace: "复制堆栈",
        context: "上下文数据",
        system: "系统 / 全局",
        close: "关闭"
    }
};
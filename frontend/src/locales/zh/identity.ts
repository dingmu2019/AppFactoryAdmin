export const identity = {
    title: "身份与权限中心",
    subtitle: "统一身份认证 (SSO) 与基于策略的访问控制 (RBAC) 管理。",
    tabs: {
        roles: "角色管理",
        permissions: "权限定义",
        policies: "访问策略",
        oauth: "OAuth 应用"
    },
    roles: {
        title: "角色列表",
        create: "创建角色",
        name: "角色名称",
        description: "描述",
        system: "系统内置",
        actions: "操作",
        builtin: {
            super_admin: "超级管理员",
            app_admin: "应用管理员",
            operator: "运营人员",
            auditor: "审计员"
        }
    },
    oauth: {
        title: "OAuth2 客户端",
        create: "注册应用",
        clientId: "Client ID",
        redirectUris: "回调地址",
        grants: "授权模式",
        secretWarning: "Client Secret 仅显示一次，请妥善保存。"
    },
    permissions: {
        title: "权限定义",
        code: "权限代码",
        name: "名称",
        category: "分类",
        description: "描述"
    },
    policies: {
        title: "访问策略",
        name: "策略名称",
        effect: "效果",
        resource: "资源",
        action: "动作"
    }
};
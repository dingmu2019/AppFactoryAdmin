export const identity = {
    title: "Identity & Access",
    subtitle: "Unified Identity (SSO) and Policy-based Access Control (RBAC).",
    tabs: {
        roles: "Roles",
        permissions: "Permissions",
        policies: "Policies",
        oauth: "OAuth Apps"
    },
    roles: {
        title: "Roles",
        create: "Create Role",
        name: "Role Name",
        description: "Description",
        system: "System",
        actions: "Actions",
        builtin: {
            super_admin: "Super Admin",
            app_admin: "App Admin",
            operator: "Operator",
            auditor: "Auditor"
        }
    },
    oauth: {
        title: "OAuth2 Clients",
        create: "Register App",
        clientId: "Client ID",
        redirectUris: "Redirect URIs",
        grants: "Grants",
        secretWarning: "Client Secret is shown only once. Please save it securely."
    },
    permissions: {
        title: "Permissions",
        code: "Permission Code",
        name: "Name",
        category: "Category",
        description: "Description"
    },
    policies: {
        title: "Access Policies",
        name: "Policy Name",
        effect: "Effect",
        resource: "Resource",
        action: "Action"
    }
};
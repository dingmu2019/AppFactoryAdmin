export const apps = {
    subtitle: "Manage your SaaS applications, API keys, and permissions",
    yourApps: "Your Apps",
    selectApp: "Select an app to view details",
    selectAppDesc: "Manage API keys, billing settings, and AI configurations.",
    credentials: "API Credentials",
    appId: "App ID (Public)",
    pubKey: "Publishable Key",
    secretKey: "Secret Key",
    secretWarning: "⚠️ Never expose your Secret Key on the client side.",
    intelligence: "Intelligence & Dify Integration",
    aiModel: "AI Model Config",
    aiModelDesc: "The default model used for this app.",
    difyBinding: "Dify Agent Binding",
    difyBindingDesc: "Link a Dify App ID to enable advanced agentic workflows.",
    verify: "Verify",
    webhooks: "Webhooks",
    noWebhooks: "No endpoints configured",
    noWebhooksDesc: "Listen to events like `order.created` or `ai.completed`.",
    addEndpoint: "Add Endpoint",
    status: {
      active: "Active",
      development: "Development",
      suspended: "Suspended"
    },
    users: "Users",
    form: {
      createTitle: "Create New App",
      editTitle: "Edit App",
      appName: "App Name",
      description: "Description",
      status: "Status",
      selectModel: "Select AI Model",
      selectTemplate: "Select Template",
      ipWhitelist: "IP Whitelist (Comma separated, use * for all)",
      advancedConfig: "Advanced Configuration"
    },
    templates: {
      blank: "Blank App",
      blankDesc: "Empty configuration",
      ecommerce: "E-commerce",
      ecommerceDesc: "Orders & Payments",
      aiAgent: "AI Agent",
      aiAgentDesc: "AI Gateway & Chat",
      devTool: "Dev Tool",
      devToolDesc: "API & Webhooks"
    },
    actions: {
      deleteConfirm: "Are you sure you want to delete this app? This action cannot be undone.",
      deleteSuccess: "App deleted successfully"
    },
    alerts: {
      enterName: "Please enter an app name."
    },
    placeholders: {
      appName: "e.g. Awesome SaaS",
      customId: "Optional custom UUID or ID",
      description: "Brief description of the application...",
      difyId: "Optional Dify App ID",
      ipWhitelist: "e.g. 192.168.1.1, 10.0.0.5 or *"
    },
    hints: {
      autoUUID: "Leave empty to auto-generate UUID"
    }
};

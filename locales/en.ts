
export const en = {
  common: {
    adminUser: "Super Admin",
    overview: "Overview",
    // Menu Items
    appManagement: "Apps",
    partnerManagement: "Partner Center",
    partnerList: "Partner List",
    partnerRebates: "Rebates",
    productCenter: "Products",
    userManagement: "User Center",
    orderCenter: "Orders",
    orderList: "Order List",
    orderRefund: "Order Refunds",
    dataCenter: "Report Center",
    trafficReports: "Traffic & Cost",
    userReports: "User Reports",
    feedbackCenter: "Feedback",
    systemManagement: "System",
    aboutSystem: "About System",
    // System Sub-menus
    dictionary: "Dictionary",
    integration: "Integrations",
    apiManagement: "API Management",
    rulesTriggers: "Rules & Triggers",
    auditLog: "Audit Logs",
    systemErrorLog: "System Error Logs",
    roles: "User Roles",

    settings: "Settings",
    comingSoon: "Coming Soon",
    devMessage: "This module is currently under development.",
    newApp: "New App",
    filter: "Filter",
    viewAll: "View All",
    loading: "Loading...",
    logout: "Log out",
    theme: "Theme",
    language: "Language",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    allApps: "All Apps",
    confirmDelete: "Confirm Delete",
    
    // Pagination & Common Filters
    showing: "Showing",
    to: "to",
    of: "of",
    results: "results",
    rowsPerPage: "Rows per page",
    prev: "Previous",
    next: "Next",
    allCategories: "All Categories",
    allStatus: "All Statuses",
    allRoles: "All Roles"
  },
  login: {
      subtitle: "Admin Console",
      tabPassword: "Use Password",
      tabCode: "Use Email Code",
      labelEmail: "Email",
      emailPlaceholder: "name@company.com",
      labelPassword: "Password",
      labelCode: "Verification Code",
      sendCode: "Send Code",
      codeHint: "Must contain 8 mixed characters",
      signIn: "Sign In",
      themeToggle: "Toggle theme",
      secureConnection: "Secure 256-bit TLS Connection",
      codeSent: "Verification code sent to email",
      welcomeBack: "Welcome back, Commander",
      error: {
          emailRequired: "Please enter your email address",
          invalidCredentials: "Invalid email or password",
          invalidCodeFormat: "Invalid code format (8 chars, mixed types)",
          invalidCode: "Invalid verification code"
      }
  },
  about: {
    title: "About SaaS Factory",
    description: "A comprehensive SaaS management platform designed for super individuals. Integrates multi-tenant management, unified identity authentication, global payments, and AI gateway aggregation to accelerate incubation and monetization.",
    copyright: "© 2026 mc-cwin. All rights reserved."
  },
  dashboard: {
    totalRevenue: "Total Monthly Revenue",
    activeUsers: "Active Users",
    apiRequests: "API Requests",
    activeApps: "Active Apps",
    revenueOverview: "Revenue Overview",
    systemActivity: "System Activity",
    viewLogs: "View All Logs",
    last12Months: "Last 12 Months",
    last30Days: "Last 30 Days",
    last7Days: "Last 7 Days"
  },
  apps: {
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
      selectModel: "Select AI Model"
    },
    actions: {
      deleteConfirm: "Are you sure you want to delete this app? This action cannot be undone.",
      deleteSuccess: "App deleted successfully"
    }
  },
  commerce: {
    title: "Orders & Transactions",
    subtitle: "View transaction history across all platforms.",
    stripe: "Stripe Dashboard",
    export: "Export Report",
    recentTx: "Recent Transactions",
    txId: "Transaction ID",
    source: "App Source",
    customer: "Customer",
    date: "Date",
    amount: "Amount",
    status: "Status",
    statusMap: {
      succeeded: "Succeeded",
      pending: "Pending",
      failed: "Failed"
    }
  },
  ai: {
    title: "Report Center",
    subtitle: "Monitor AI gateway traffic and cost analysis.",
    operational: "Systems Operational",
    consumption: "Token Consumption (Last 7 Days)",
    providers: "Model Providers",
    primary: "Primary Provider",
    backup: "Backup Provider",
    configure: "Configure Keys",
    costOpt: "Cost Optimization",
    savedMsgPrefix: "You have saved approx.",
    budgetUsed: "Budget Used"
  },
  products: {
    title: "Products & Services",
    subtitle: "Manage global pricing strategies, product types, and tax rules.",
    tabs: {
      list: "Product List",
      categories: "Categories"
    },
    newProduct: "New Product",
    newCategory: "New Category",
    table: {
      name: "Product Name",
      sku: "SKU",
      app: "App",
      type: "Type",
      category: "Category",
      pricing: "Pricing Overview",
      status: "Status"
    },
    form: {
      basicInfo: "Basic Information",
      pricingStrategy: "Multi-region Pricing",
      pricingNote: "All prices are Tax Inclusive. Region is matched automatically by IP.",
      productName: "Product Name",
      productDesc: "Description",
      skuCode: "SKU Code",
      selectApp: "Select App",
      selectCategory: "Select Category",
      selectType: "Select Type",
      region: "Region",
      currency: "Currency",
      amount: "Amount (Inc. Tax)",
      addPrice: "Add Region Price",
      status: "Product Status",
      lang: {
        en: "English",
        zh: "Chinese"
      }
    },
    status: {
      active: "Active",
      inactive: "Disabled"
    },
    types: {
      subscription: "Subscription",
      one_time: "One-time",
      usage_based: "Usage-based"
    }
  },
  users: {
    title: "User Management",
    subtitle: "Manage platform administrators and end-users across all applications.",
    newUser: "Add User",
    table: {
      user: "User",
      role: "Role",
      app: "Source App",
      status: "Status",
      joinDate: "Joined",
      location: "Location",
      lastLogin: "Last Login"
    },
    roles: {
      admin: "Admin",
      editor: "Editor",
      viewer: "Viewer",
      user: "End User"
    },
    status: {
      active: "Active",
      suspended: "Suspended",
      pending: "Pending"
    },
    form: {
      userInfo: "User Information",
      name: "Name",
      email: "Email Address",
      gender: "Gender",
      phone: "Phone Number",
      regionInfo: "Region Info",
      country: "Country/Region",
      province: "State/Province",
      city: "City",
      selectApp: "Linked App",
      selectRole: "Select Role",
      selectStatus: "Account Status",
      platformAdmin: "Platform Super Admin"
    },
    gender: {
      male: "Male",
      female: "Female",
      other: "Other"
    }
  }
};

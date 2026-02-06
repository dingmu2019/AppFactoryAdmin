export const integration = {
  title: 'Integration Management',
  subtitle: 'Configure external services and system integrations',
  categories: {
    llm: 'LLM',
    email: 'Email',
    database: 'Database',
    payment: 'Payment',
    notification: 'Notification',
    wechat: 'WeChat Work',
    feishu: 'Feishu',
    lark: 'Lark',
    whatsapp: 'WhatsApp',
    enterprise: 'Enterprise Info',
    selectCategory: 'Please select a category to configure'
  },
  llm: {
    title: 'LLM Configuration',
    subtitle: 'Configure multiple models for load balancing and failover',
    addModel: 'Add Model',
    editModel: 'Edit Model',
    noModels: 'No models configured',
    addFirst: 'Click to add your first model',
    enableModel: 'Enable this model',
    enableDesc: 'Enabled models will participate in load balancing and failover',
    setPrimary: 'Set as Primary',
    primaryDesc: 'Primary model will be prioritized for requests',
    provider: 'AI Provider',
    modelName: 'Model Name',
    baseUrl: 'Base URL',
    apiKey: 'API Key',
    azureHint: 'Azure URL must include {resource} and {deployment}',
    maxTokens: 'Max Tokens',
    temperature: 'Temperature',
    primary: 'Primary',
    enabled: 'Enabled',
    disabled: 'Disabled'
  },
  payment: {
    title: 'Payment Gateway',
    provider: 'Provider',
    merchantId: 'Merchant ID',
    appId: 'App ID',
    publicKey: 'Publishable Key',
    secretKey: 'Secret Key',
    webhookSecret: 'Webhook Secret',
    certificatePath: 'Certificate Path',
    sandbox: 'Sandbox Mode',
    selectProvider: 'Select a provider to configure',
    providers: {
      wechat: 'WeChat Pay',
      alipay: 'Alipay'
    },
    placeholder: {
      merchantId: 'Enter Merchant ID',
      appId: 'Enter App ID',
      publicKey: 'pk_test_...',
      secretKey: 'sk_test_... or Private Key',
      webhookSecret: 'whsec_...'
    }
  },
  email: {
    title: 'Email Configuration',
    host: 'SMTP Host',
    port: 'Port',
    user: 'Username',
    pass: 'Password',
    senderName: 'Sender Name',
    testRecipient: 'Test Recipient',
    testSubject: 'Test Subject',
    testContent: 'Test email from Admin System',
    sendTest: 'Send Test Email'
  },
  database: {
    title: 'Database Connection',
    type: 'Database Type',
    host: 'Host',
    port: 'Port',
    database: 'Database',
    user: 'Username',
    password: 'Password',
    testConnection: 'Test Connection',
    supabaseHint: {
      title: 'Supabase Connection Tip',
      body: 'Recommended to use Transaction Pooler connection info (usually port 6543 or 5432). Ensure IPv4 is enabled.'
    }
  },
  notification: {
    title: 'Notification Channels',
    channel: 'Channel',
    messageType: 'Message Type',
    config: 'Config',
    name: 'Name',
    providerType: 'Provider Type',
    providerName: 'Provider Name',
    providerStatus: 'Status',
    webhookUrl: 'Webhook URL',
    headers: 'Headers (JSON)',
    template: 'Template',
    format: 'Format',
    formatOptions: {
      text: 'TEXT',
      html: 'HTML',
      json: 'JSON'
    },
    subject: 'Subject',
    body: 'Content',
    testRecipient: 'Test Recipient',
    recipientPlaceholder: {
      email: 'user@example.com',
      im: 'Recipient ID / OpenID',
      sms: 'Phone Number',
      whatsapp: 'Phone (with country code)'
    },
    variables: 'Variables (JSON)',
    sendTest: 'Send Test',
    types: {
      email: 'Email',
      sms: 'SMS',
      im: 'IM',
      whatsapp: 'WhatsApp'
    },
    messageTypes: {
      login_verification: 'Login Verification',
      generic: 'Generic',
      test: 'Test'
    },
    providers: {
      smtp: 'SMTP (Email)',
      webhook: 'Webhook (General)'
    },
    errors: {
      invalidHeaders: 'Invalid Headers JSON: {error}',
      webhookUrlRequired: 'Webhook URL is required',
      templateBodyRequired: 'Template body is required'
    }
  },
  wechat: {
    title: 'WeChat Work',
    corpId: 'Corp ID',
    agentId: 'Agent ID',
    secret: 'Secret',
    recipient: 'Recipient (User ID)',
    content: 'Content',
    testContent: 'Test message from Admin System',
    placeholder: {
      corpId: 'Enter Corp ID',
      agentId: 'Enter Agent ID',
      recipient: 'e.g. ZhangSan'
    }
  },
  feishu: {
    title: 'Feishu Integration',
    appId: 'App ID',
    appSecret: 'App Secret',
    encryptKey: 'Encrypt Key (Optional)',
    verificationToken: 'Verification Token (Optional)',
    recipient: 'Recipient (OpenID / Email)',
    content: 'Content',
    testContent: 'Test message from Admin System (Feishu)',
    placeholder: {
      appId: 'cli_...',
      encryptKey: 'Event Subscription Encrypt Key',
      verificationToken: 'Event Verification Token',
      recipient: 'e.g. ou_xxx or user@example.com'
    }
  },
  lark: {
    title: 'Lark Integration',
    appId: 'App ID',
    appSecret: 'App Secret',
    encryptKey: 'Encrypt Key (Optional)',
    verificationToken: 'Verification Token (Optional)',
    recipient: 'Recipient (OpenID / Email)',
    content: 'Content',
    testContent: 'Test message from Admin System (Lark)',
    placeholder: {
      appId: 'cli_...',
      recipient: 'e.g. user@example.com'
    }
  },
  whatsapp: {
    title: 'WhatsApp Business API',
    phoneNumberId: 'Phone Number ID',
    accountId: 'WhatsApp Business Account ID',
    token: 'Access Token (System User Token)',
    recipient: 'Recipient Phone Number',
    content: 'Content',
    placeholder: {
      phoneNumberId: 'e.g. 100555555555555',
      accountId: 'e.g. 100999999999999',
      token: 'EAAB...',
      recipient: 'e.g. 15551234567',
      testContent: 'Test message from Admin System (WhatsApp)'
    },
    hint: {
      token: '* Make sure the token has whatsapp_business_messaging permission',
      recipient: 'Must include country code (e.g. 1 for US, 86 for CN)'
    }
  },
  enterprise: {
    title: 'Enterprise Info',
    name: 'Enterprise Name',
    address: 'Address',
    description: 'Description',
    departments: 'Departments',
    placeholder: {
      departments: 'e.g. R&D, Marketing, HR...'
    }
  }
};

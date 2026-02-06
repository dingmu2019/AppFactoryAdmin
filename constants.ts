
import { AppStatus, SaaSApp, Transaction, ChartDataPoint, Notification, Product, ProductCategory, User, SystemLog } from './types';

import versionData from './version.json';

export const SYSTEM_CONFIG = {
  version: `V${versionData.version}`,
  // Automatically sets the build date to today in yyyyMMdd format
  build: new Date().toISOString().slice(0, 10).replace(/-/g, ''), 
  copyright: '© 2026 mc-cwin'
};

export const MOCK_APPS: SaaSApp[] = [
  {
    id: 'app_id_001',
    name: 'ID Photo Pro',
    description: 'AI-powered professional ID photo generation service.',
    status: AppStatus.ACTIVE,
    apiKey: 'pk_live_51M...',
    apiSecret: 'sk_live_22K...',
    totalUsers: 12450,
    monthlyRevenue: 8540.00,
    aiModelConfig: 'gemini-3-pro-image-preview',
    difyAppId: 'dify_app_8823',
    createdAt: '2023-11-15',
  },
  {
    id: 'app_id_002',
    name: 'Annual Meeting Lottery',
    description: 'Enterprise grade lottery system for company events.',
    status: AppStatus.ACTIVE,
    apiKey: 'pk_live_99J...',
    apiSecret: 'sk_live_11L...',
    totalUsers: 450,
    monthlyRevenue: 1200.00,
    aiModelConfig: 'gemini-3-flash-preview',
    createdAt: '2023-12-01',
  },
  {
    id: 'app_id_003',
    name: 'Super Agent Chat',
    description: 'Customer service bot for SaaS platforms.',
    status: AppStatus.DEVELOPMENT,
    apiKey: 'pk_test_77H...',
    apiSecret: 'sk_test_33P...',
    totalUsers: 12,
    monthlyRevenue: 0.00,
    aiModelConfig: 'gemini-3-pro-preview',
    difyAppId: 'dify_app_9912',
    createdAt: '2024-01-20',
  },
];

export const REVENUE_DATA: ChartDataPoint[] = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
  { name: 'Aug', value: 5490 },
  { name: 'Sep', value: 6500 },
  { name: 'Oct', value: 7200 },
  { name: 'Nov', value: 8500 },
  { name: 'Dec', value: 9740 },
];

export const AI_USAGE_DATA: ChartDataPoint[] = [
  { name: 'Mon', value: 1200, value2: 2400 },
  { name: 'Tue', value: 1900, value2: 1398 },
  { name: 'Wed', value: 3000, value2: 9800 },
  { name: 'Thu', value: 2780, value2: 3908 },
  { name: 'Fri', value: 1890, value2: 4800 },
  { name: 'Sat', value: 2390, value2: 3800 },
  { name: 'Sun', value: 3490, value2: 4300 },
];

export const RECENT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_1',
    appId: 'app_id_001',
    appName: 'ID Photo Pro',
    amount: 9.99,
    currency: 'USD',
    status: 'succeeded',
    date: '2024-05-20T14:30:00Z',
    customerEmail: 'user1@example.com',
  },
  {
    id: 'tx_2',
    appId: 'app_id_001',
    appName: 'ID Photo Pro',
    amount: 19.99,
    currency: 'USD',
    status: 'succeeded',
    date: '2024-05-20T13:15:00Z',
    customerEmail: 'alex.dev@corp.com',
  },
  {
    id: 'tx_3',
    appId: 'app_id_002',
    appName: 'Annual Meeting Lottery',
    amount: 299.00,
    currency: 'USD',
    status: 'pending',
    date: '2024-05-19T09:00:00Z',
    customerEmail: 'hr@bigtech.com',
  },
  {
    id: 'tx_4',
    appId: 'app_id_001',
    appName: 'ID Photo Pro',
    amount: 9.99,
    currency: 'USD',
    status: 'failed',
    date: '2024-05-18T16:45:00Z',
    customerEmail: 'fraud@suspicious.com',
  },
];

export const NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Webhook Failure', message: 'Endpoint /notify for App 002 returned 500.', type: 'warning', date: '10 min ago' },
  { id: '2', title: 'Daily Payout', message: '$450.00 transferred to Stripe Connected Account.', type: 'success', date: '2 hours ago' },
];

export const MOCK_CATEGORIES: ProductCategory[] = [
  { id: 'cat_01', name: 'SaaS Subscription', description: 'Recurring revenue plans' },
  { id: 'cat_02', name: 'Add-on Service', description: 'One-time purchases like AI credits' },
  { id: 'cat_03', name: 'Enterprise', description: 'Custom deployment licenses' },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod_001',
    appId: 'app_id_001',
    sku: 'BASIC_MONTHLY',
    name: {
      en: 'Basic Plan (Monthly)',
      zh: '基础版 (月付)'
    },
    description: {
      en: 'Perfect for individuals starting out. Includes 50 photos.',
      zh: '适合个人用户入门。包含50张照片生成额度。'
    },
    type: 'subscription',
    categoryId: 'cat_01',
    status: 'active',
    updatedAt: '2024-05-20',
    prices: [
      { region: 'Global', currency: 'USD', amount: 9.99 },
      { region: 'CN', currency: 'CNY', amount: 68.00 },
    ]
  },
  {
    id: 'prod_002',
    appId: 'app_id_001',
    sku: 'PRO_YEARLY',
    name: {
      en: 'Pro Plan (Yearly)',
      zh: '专业版 (年付)'
    },
    description: {
      en: 'For power users. Unlimited photos and priority support.',
      zh: '适合专业用户。不限生成次数，享受优先客服支持。'
    },
    type: 'subscription',
    categoryId: 'cat_01',
    status: 'active',
    updatedAt: '2024-05-18',
    prices: [
      { region: 'Global', currency: 'USD', amount: 99.99 },
      { region: 'CN', currency: 'CNY', amount: 698.00 },
      { region: 'EU', currency: 'EUR', amount: 95.00 },
    ]
  },
  {
    id: 'prod_003',
    appId: 'app_id_002',
    sku: 'EVENT_STD',
    name: {
      en: 'Standard Event License',
      zh: '标准活动授权'
    },
    description: {
      en: 'Single event license for up to 500 participants.',
      zh: '单次活动授权，支持最多500人参与。'
    },
    type: 'one_time',
    categoryId: 'cat_03',
    status: 'active',
    updatedAt: '2024-05-15',
    prices: [
      { region: 'Global', currency: 'USD', amount: 299.00 },
      { region: 'CN', currency: 'CNY', amount: 1999.00 },
    ]
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'u_1',
    name: 'Admin User',
    email: 'admin@super-indie.com',
    role: 'admin',
    appId: 'platform',
    status: 'active',
    joinDate: '2023-01-01',
    lastLogin: '2024-05-21T08:30:00Z',
    gender: 'male',
    phone: '+1 415-555-0100',
    region: { country: 'US', province: 'California', city: 'San Francisco' }
  },
  {
    id: 'u_2',
    name: 'Sarah Connor',
    email: 'sarah@skynet.com',
    role: 'user',
    appId: 'app_id_001',
    status: 'active',
    joinDate: '2023-11-20',
    lastLogin: '2024-05-20T10:15:00Z',
    gender: 'female',
    phone: '+44 20 7946 0958',
    region: { country: 'GB', province: 'London', city: 'London' }
  },
  {
    id: 'u_3',
    name: 'John Doe',
    email: 'john.doe@gmail.com',
    role: 'user',
    appId: 'app_id_001',
    status: 'suspended',
    joinDate: '2024-02-15',
    lastLogin: '2024-04-01T09:00:00Z',
    gender: 'male',
    phone: '+86 138 0013 8000',
    region: { country: 'CN', province: 'Beijing', city: 'Chaoyang' }
  },
  {
    id: 'u_4',
    name: 'Corporate HR',
    email: 'hr@bigcorp.com',
    role: 'admin',
    appId: 'app_id_002',
    status: 'active',
    joinDate: '2023-12-05',
    lastLogin: '2024-05-19T14:20:00Z',
    gender: 'female',
    phone: '+1 212-555-0199',
    region: { country: 'US', province: 'New York', city: 'New York' }
  },
  {
    id: 'u_5',
    name: 'Test Account',
    email: 'test@dev.com',
    role: 'viewer',
    appId: 'app_id_003',
    status: 'pending',
    joinDate: '2024-05-20',
    lastLogin: '-',
    gender: 'other',
    phone: '+81 90-5555-0199',
    region: { country: 'JP', province: 'Tokyo', city: 'Shibuya' }
  },
  {
    id: 'u_6',
    name: 'Alice Smith',
    email: 'alice@example.com',
    role: 'user',
    appId: 'app_id_001',
    status: 'active',
    joinDate: '2024-03-10',
    lastLogin: '2024-05-21T11:00:00Z',
    gender: 'female',
    phone: '+61 412 345 678',
    region: { country: 'AU', province: 'New South Wales', city: 'Sydney' }
  }
];

export const MOCK_LOGS: SystemLog[] = [
  {
    id: 'log_1',
    timestamp: '2024-05-21T10:30:15Z',
    level: 'info',
    module: 'Auth',
    message: 'User u_1 logged in successfully.',
    userId: 'u_1',
    ip: '192.168.1.1'
  },
  {
    id: 'log_2',
    timestamp: '2024-05-21T10:32:00Z',
    level: 'warn',
    module: 'Billing',
    message: 'Payment retry for tx_4 failed.',
    ip: '10.0.0.5'
  },
  {
    id: 'log_3',
    timestamp: '2024-05-21T11:00:05Z',
    level: 'error',
    module: 'System',
    message: 'Database connection timeout detected.',
    ip: 'localhost'
  },
  {
    id: 'log_4',
    timestamp: '2024-05-21T11:15:22Z',
    level: 'info',
    module: 'API',
    message: 'API Key created for App 003.',
    userId: 'u_1',
    ip: '192.168.1.1'
  },
  {
    id: 'log_5',
    timestamp: '2024-05-21T12:00:00Z',
    level: 'debug',
    module: 'Scheduler',
    message: 'Daily report job started.',
    ip: 'system'
  },
  {
      id: 'log_6',
      timestamp: '2024-05-21T12:05:00Z',
      level: 'info',
      module: 'Scheduler',
      message: 'Daily report job finished successfully.',
      ip: 'system'
  }
];

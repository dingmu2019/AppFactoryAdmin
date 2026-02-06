
export enum AppStatus {
  ACTIVE = 'Active',
  DEVELOPMENT = 'Development',
  SUSPENDED = 'Suspended',
}

export interface SaaSApp {
  id: string;
  name: string;
  description: string;
  status: AppStatus;
  apiKey: string;
  apiSecret: string;
  totalUsers: number;
  monthlyRevenue: number;
  aiModelConfig: string; // e.g., 'gpt-4-turbo'
  difyAppId?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  appId: string;
  appName: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  date: string;
  customerEmail: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  date: string;
}

// --- Product & Commerce Types ---

export type ProductType = 'subscription' | 'one_time' | 'usage_based';

export interface ProductPrice {
  region: string; // e.g., 'Global', 'CN', 'US', 'EU'
  currency: string; // e.g., 'USD', 'CNY', 'EUR'
  amount: number; // Tax inclusive
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

export type LocalizedText = Record<string, string>; // e.g. { en: "Name", zh: "名字" }

export interface Product {
  id: string;
  appId: string; // Link to SaaSApp
  sku: string;
  name: LocalizedText;
  description: LocalizedText;
  type: ProductType;
  categoryId: string;
  status: 'active' | 'archived';
  prices: ProductPrice[];
  updatedAt: string;
}

// --- User Types ---

export type UserRole = 'admin' | 'editor' | 'viewer' | 'user';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type UserGender = 'male' | 'female' | 'other';

export interface UserRegion {
  country: string; // ISO Code e.g., 'CN', 'US'
  province?: string;
  city?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  appId?: string; // 'platform' or specific app id
  status: UserStatus;
  joinDate: string;
  lastLogin: string;
  avatar?: string;
  // New Fields
  gender?: UserGender;
  phone?: string;
  region?: UserRegion;
}

// --- System Logs ---

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SystemLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  userId?: string;
  ip?: string;
}

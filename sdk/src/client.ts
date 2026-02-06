import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import CryptoJS from 'crypto-js';

export interface AdminSysConfig {
  baseUrl: string;
  appKey: string;
  appSecret: string;
}

export class AdminSysClient {
  private client: AxiosInstance;
  private config: AdminSysConfig;

  constructor(config: AdminSysConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = Math.random().toString(36).substring(7);
      
      const method = (req.method || 'GET').toUpperCase();
      
      // Resolve Full Path (Path + Query)
      let fullPath = req.url || '';
      const baseURL = req.baseURL || '';
      
      // If url is not absolute
      if (!fullPath.startsWith('http')) {
        let basePath = '';
        try {
           // Try to parse baseURL as URL to extract pathname
           if (baseURL.startsWith('http')) {
               const urlObj = new URL(baseURL);
               basePath = urlObj.pathname;
           } else {
               basePath = baseURL;
           }
        } catch (e) {
           basePath = baseURL;
        }
        
        // Normalize slashes
        basePath = basePath.replace(/\/$/, '');
        const relPath = fullPath.startsWith('/') ? fullPath : '/' + fullPath;
        fullPath = basePath + relPath;
      } else {
         try {
             const urlObj = new URL(fullPath);
             fullPath = urlObj.pathname + urlObj.search;
         } catch (e) {}
      }

      // Handle Body
      let bodyStr = '';
      if (req.data) {
          if (typeof req.data === 'string') {
              bodyStr = req.data;
          } else {
              // Naive stringify to match backend's naive stringify
              bodyStr = JSON.stringify(req.data);
          }
      }
      
      const rawString = `${method}${fullPath}${timestamp}${nonce}${bodyStr}`;
      const signature = CryptoJS.HmacSHA256(rawString, this.config.appSecret).toString(CryptoJS.enc.Hex);

      req.headers.set('x-app-key', this.config.appKey);
      req.headers.set('x-timestamp', timestamp);
      req.headers.set('x-nonce', nonce);
      req.headers.set('x-signature', signature);

      return req;
    });
  }

  public async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }
  
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}

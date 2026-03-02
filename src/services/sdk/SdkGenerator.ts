import { supabase } from '../../lib/supabase';

export class SdkGenerator {
  
  async generateTsSdk(): Promise<string> {
    // 1. Fetch active API definitions
    const { data: apis, error } = await supabase
      .from('sys_api_definitions')
      .select('*')
      .eq('is_active', true)
      .order('path');

    if (error) throw error;
    if (!apis || apis.length === 0) return '// No APIs defined';

    // 2. Build Code
    const lines: string[] = [
      '// Auto-generated AdminSys SDK',
      '// Do not edit manually',
      '',
      'import axios, { AxiosInstance, AxiosRequestConfig } from "axios";',
      '',
      'export interface SdkOptions {',
      '  baseUrl?: string;',
      '  appKey?: string;',
      '  appSecret?: string;',
      '  token?: string;',
      '}',
      '',
      'export class AdminSysClient {',
      '  private client: AxiosInstance;',
      '',
      '  constructor(options: SdkOptions) {',
      '    this.client = axios.create({',
      '      baseURL: options.baseUrl || "https://api.your-saas.com",',
      '      headers: {',
      '        "Content-Type": "application/json"',
      '      }',
      '    });',
      '',
      '    this.client.interceptors.request.use(config => {',
      '      if (options.token) {',
      '        config.headers.Authorization = `Bearer ${options.token}`;',
      '      } else if (options.appKey && options.appSecret) {',
      '        config.headers["x-app-key"] = options.appKey;',
      '        config.headers["x-app-secret"] = options.appSecret;',
      '      }',
      '      return config;',
      '    });',
      '  }',
      ''
    ];

    // 3. Generate Methods
    for (const api of apis) {
      const methodName = this.pathToMethodName(api.method, api.path);
      const hasBody = ['POST', 'PUT', 'PATCH'].includes(api.method.toUpperCase());
      
      // Basic type inference (could be improved with JSON Schema to TS converter)
      const reqType = 'any';
      const resType = 'any';

      lines.push(`  /**`);
      lines.push(`   * ${api.summary || api.path}`);
      lines.push(`   */`);
      
      const args = ['params?: Record<string, any>'];
      if (hasBody) args.unshift('data: any');

      lines.push(`  async ${methodName}(${args.join(', ')}): Promise<${resType}> {`);
      
      // Handle path parameters replacement
      let url = api.path;
      lines.push(`    let url = "${url}";`);
      lines.push(`    if (params) {`);
      lines.push(`      Object.keys(params).forEach(key => {`);
      lines.push(`        if (url.includes(\`:\${key}\`)) {`);
      lines.push(`          url = url.replace(\`:\${key}\`, encodeURIComponent(params[key]));`);
      lines.push(`          delete params[key];`);
      lines.push(`        }`);
      lines.push(`      });`);
      lines.push(`    }`);

      const axiosArgs = ['url'];
      if (hasBody) axiosArgs.push('data');
      axiosArgs.push('{ params }');

      lines.push(`    const res = await this.client.${api.method.toLowerCase()}(${axiosArgs.join(', ')});`);
      lines.push(`    return res.data;`);
      lines.push(`  }`);
      lines.push('');
    }

    lines.push('}');
    return lines.join('\n');
  }

  private pathToMethodName(method: string, path: string): string {
    // e.g., GET /api/v1/users/:id -> getUsers
    const parts = path.split('/').filter(p => p && !p.startsWith(':') && p !== 'api' && p !== 'v1');
    const action = method.toLowerCase();
    const resource = parts.join('_').replace(/_([a-z])/g, (g) => g[1].toUpperCase()); // camelCase
    return `${action}${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
  }
}

export const sdkGenerator = new SdkGenerator();

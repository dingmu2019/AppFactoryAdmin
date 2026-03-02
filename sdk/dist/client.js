"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSysClient = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_js_1 = __importDefault(require("crypto-js"));
class AdminSysClient {
    constructor(config) {
        this.config = config;
        this.client = axios_1.default.create({
            baseURL: config.baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        this.client.interceptors.request.use((req) => {
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
                    }
                    else {
                        basePath = baseURL;
                    }
                }
                catch (e) {
                    basePath = baseURL;
                }
                // Normalize slashes
                basePath = basePath.replace(/\/$/, '');
                const relPath = fullPath.startsWith('/') ? fullPath : '/' + fullPath;
                fullPath = basePath + relPath;
            }
            else {
                try {
                    const urlObj = new URL(fullPath);
                    fullPath = urlObj.pathname + urlObj.search;
                }
                catch (e) { }
            }
            // Handle Body
            let bodyStr = '';
            if (req.data) {
                if (typeof req.data === 'string') {
                    bodyStr = req.data;
                }
                else {
                    // Naive stringify to match backend's naive stringify
                    bodyStr = JSON.stringify(req.data);
                }
            }
            const rawString = `${method}${fullPath}${timestamp}${nonce}${bodyStr}`;
            const signature = crypto_js_1.default.HmacSHA256(rawString, this.config.appSecret).toString(crypto_js_1.default.enc.Hex);
            req.headers.set('x-app-key', this.config.appKey);
            req.headers.set('x-timestamp', timestamp);
            req.headers.set('x-nonce', nonce);
            req.headers.set('x-signature', signature);
            return req;
        });
    }
    async request(config) {
        const response = await this.client.request(config);
        return response.data;
    }
    async get(url, config) {
        return this.request({ ...config, method: 'GET', url });
    }
    async post(url, data, config) {
        return this.request({ ...config, method: 'POST', url, data });
    }
    async put(url, data, config) {
        return this.request({ ...config, method: 'PUT', url, data });
    }
    async delete(url, config) {
        return this.request({ ...config, method: 'DELETE', url });
    }
}
exports.AdminSysClient = AdminSysClient;

import type { ProviderSendInput, ProviderSendResult } from '../types.ts';
import { safeJsonParse } from '../templating.ts';

type WebhookProviderConfig = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export class WebhookProvider {
  private config: WebhookProviderConfig;

  constructor(config: WebhookProviderConfig) {
    this.config = config;
  }

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 8000);
    try {
      const method = (this.config.method || 'POST').toUpperCase();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(this.config.headers || {})
      };

      let bodyPayload: any = {
        to: input.to,
        subject: input.subject,
        body: input.body,
        format: input.format,
        payload: input.payload
      };

      if (input.format === 'json') {
        const parsed = safeJsonParse(input.body);
        if (parsed.ok) {
          bodyPayload = { ...bodyPayload, data: parsed.value };
        }
      }

      const started = Date.now();
      const resp = await fetch(this.config.url, {
        method,
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });
      const latencyMs = Date.now() - started;
      const text = await resp.text();
      const parsed = safeJsonParse(text);

      if (!resp.ok) {
        return {
          success: false,
          errorMessage: `Webhook HTTP ${resp.status}`,
          response: { status: resp.status, latencyMs, body: parsed.ok ? parsed.value : text }
        };
      }

      return { success: true, response: { status: resp.status, latencyMs, body: parsed.ok ? parsed.value : text } };
    } catch (err: any) {
      const message = err?.name === 'AbortError' ? 'Webhook timeout' : err?.message || 'Webhook send failed';
      return { success: false, errorMessage: message };
    } finally {
      clearTimeout(timeout);
    }
  }
}



import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const schema = {
    title: "App Configuration",
    type: "object",
    properties: {
      ai_model: {
        type: "string",
        title: "AI Model",
        enum: ["gemini-3-flash-preview", "gemini-3-pro-preview", "gpt-4o", "claude-3-opus"],
        default: "gemini-3-flash-preview"
      },
      dify_app_id: {
        type: "string",
        title: "Dify App ID",
        description: "Binding ID for Dify.ai Agent"
      },
      feishu_config: {
        type: "object",
        title: "Feishu Integration",
        properties: {
          app_id: { type: "string", title: "App ID" },
          app_secret: { type: "string", title: "App Secret", format: "password" },
          encrypt_key: { type: "string", title: "Encrypt Key" }
        }
      },
      features: {
        type: "array",
        title: "Enabled Features",
        items: {
          type: "string",
          enum: ["ai_gateway", "webhooks", "orders", "payments", "knowledge_base"]
        },
        uniqueItems: true
      },
      rate_limit: {
        type: "integer",
        title: "Rate Limit (req/min)",
        default: 60,
        minimum: 0
      }
    }
  };

  return NextResponse.json(schema);
}

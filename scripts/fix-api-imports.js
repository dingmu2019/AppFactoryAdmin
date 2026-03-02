
const fs = require('fs');
const path = require('path');

const files = [
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/prompts/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/alerts/rule/[appId]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/policies/[appId]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/orders/[orderId]/refunds/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/system-logs/[id]/resolve/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/webhooks/events/[id]/retry/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/webhooks/[id]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/coupons/[id]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/skills/[id]/status/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/skills/[id]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/users/[id]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/identity/roles/[id]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/apps/[id]/rotate-credentials/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/apps/[id]/credentials/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/apps/[id]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/agents/[id]/prompts/[promptId]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/agents/[id]/prompts/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/agents/[id]/status/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/agents/[id]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/product-categories/[id]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/products/[id]/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/orders/stats/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/orders/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/coupons/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/product-categories/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/products/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/apps/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/webhooks/events/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/webhooks/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/skills/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/policies/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/requests/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/usage/trends/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/usage/today/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/alerts/preview/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/alerts/rule/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/models/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/ai-gateway/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/agents/reorder/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/agents/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/identity/users/remove/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/identity/users/assign/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/identity/policies/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/identity/permissions/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/identity/roles/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/apis/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/system-logs/stats/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/system-logs/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/users/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/dashboard/route.ts',
  '/Users/mac/Desktop/软件项目/mc-cwin/AdminSys-001/src/app/api/admin/integrations/route.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const newContent = content.replace("import { supabase } from '@/lib/supabase'", "import { supabaseAdmin as supabase } from '@/lib/supabase'");
    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated: ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});

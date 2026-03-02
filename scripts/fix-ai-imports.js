
const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/ai/debates/route.ts',
  'src/app/api/ai/debates/[id]/route.ts',
  'src/app/api/ai/debates/[id]/stop/route.ts',
  'src/app/api/ai/debates/[id]/share/route.ts'
];

files.forEach(file => {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace imports
    content = content.replace(
      "import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';",
      "import { supabaseAdmin as supabase } from '@/lib/supabase';"
    );
    
    // Remove unused imports
    content = content.replace("import { cookies } from 'next/headers';", "");
    
    // Remove client initialization code
    // const supabase = createRouteHandlerClient({ cookies });
    content = content.replace(/const supabase = createRouteHandlerClient\({ cookies }\);/g, "");
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});

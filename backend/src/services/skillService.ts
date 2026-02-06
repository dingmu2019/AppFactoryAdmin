import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface SkillManifest {
  name: string;
  command: string;
  description: string;
  version: string;
  entry?: string; // Entry file, default index.js
  function?: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface LoadedSkill {
  id: string;
  name: string;
  command: string;
  storage_path: string;
  manifest: SkillManifest;
}

export const getActiveSkills = async (): Promise<LoadedSkill[]> => {
  const { data, error } = await supabase
    .from('ai_skills')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch skills:', error);
    return [];
  }

  return data as LoadedSkill[];
};

import { EmailService } from './emailService.ts';

async function loadIsolatedVm() {
  try {
    // @ts-ignore
    const mod: any = await import('isolated-vm');
    return mod?.default || mod;
  } catch {
    return null;
  }
}

/**
 * Sandboxed Execution using isolated-vm
 * Prevents RCE and infinite loops.
 */
export const executeSkill = async (skillName: string, args: any) => {
  if (process.env.VERCEL && process.env.ENABLE_VERCEL_SKILLS !== 'true') {
    throw new Error('Skill runtime disabled on Vercel. Set ENABLE_VERCEL_SKILLS=true to enable (may require native build).');
  }

  const { data: skill } = await supabase
    .from('ai_skills')
    .select('*')
    .eq('is_active', true)
    .filter('manifest->function->>name', 'eq', skillName)
    .single();

  if (!skill) {
    throw new Error(`Skill ${skillName} not found or inactive`);
  }

  const entryFile = skill.manifest.entry || 'index.js';
  const modulePath = path.resolve(skill.storage_path, entryFile);

  if (!fs.existsSync(modulePath)) {
    throw new Error(`Skill entry file not found: ${modulePath}`);
  }

  // Read the code
  const code = fs.readFileSync(modulePath, 'utf8');

  const ivm = await loadIsolatedVm();
  if (!ivm) {
    throw new Error('isolated-vm is not available in this runtime.');
  }

  // Create Isolate
  const isolate = new ivm.Isolate({ memoryLimit: 128 }); // 128MB limit
  const context = isolate.createContextSync();
  const jail = context.global;

  try {
    // 1. Inject Host APIs (Restricted)
    jail.setSync('global', jail.derefInto());
    jail.setSync('_args', new ivm.ExternalCopy(args).copyInto());

    // Host.db.query (Safe Wrapper)
    jail.setSync('host_db_query', new ivm.Reference(async (table: string, query: any) => {
        // Enforce Tenant Isolation Here if we had app_id
        // For now, just a raw wrapper
        const { data, error } = await supabase.from(table).select('*').match(query).limit(10);
        if (error) throw error.message;
        return new ivm.ExternalCopy(data).copyInto();
    }));

    // Host.log
    jail.setSync('host_log', new ivm.Reference((msg: string) => {
        console.log(`[Skill:${skillName}]`, msg);
    }));

    // 2. Compile and Run Script
    // We wrap the user code in an IIFE that calls the default export or handler
    // Assuming the user code is CommonJS-like or simple JS for now.
    // Since ivm doesn't support 'import' easily, we assume the code defines a function `handler(args, host)`.
    // OR we expect the code to be just the function body.
    // For compatibility with previous "export default", we might need a bundler.
    // BUT for simplicity in this migration: We assume the file content IS the script.
    
    // Let's assume the file sets `global.handler = function...` or just executes.
    // To support `export default`, we need a transpile step. 
    // HACK: We inject a mock `module.exports`.
    
    const wrapper = `
        const module = { exports: {} };
        const exports = module.exports;
        
        // Host Interface
        const host = {
            db: {
                query: (t, q) => host_db_query.applySync(undefined, [t, q])
            },
            log: (m) => host_log.applySync(undefined, [m])
        };

        // User Code
        ${code}

        // Execution
        let fn = module.exports.default || module.exports.handler || module.exports;
        if (typeof fn !== 'function') {
            // Try finding a global function named 'handler'
            if (typeof handler === 'function') fn = handler;
        }

        if (typeof fn === 'function') {
            // Execute
            const result = fn(_args, host);
            // Handle Promise if async
            if (result && typeof result.then === 'function') {
                result; // Return promise to host? No, ivm async handling is tricky.
                // For MVP, we use resultSync if possible, or wait.
                // IVM doesn't auto-await inside the sandbox for the return value of the script itself easily.
                // We'll return the result object.
                result; 
            } else {
                result;
            }
        } else {
            "No handler function found";
        }
    `;

    const script = isolate.compileScriptSync(wrapper);
    const result = await script.run(context, { timeout: 1000 }); // 1s timeout

    // Handle async result (PromiseReference)
    if (result instanceof ivm.Reference && result.typeof === 'object') {
         // It might be a promise
         // @ts-ignore
         const resultVal = await result.promise; 
         return resultVal; // This might be an ExternalCopy
    }
    
    // If it's a value
    return result;

  } catch (err: any) {
    throw new Error(`Sandboxed Execution Failed: ${err.message}`);
  } finally {
    // Cleanup
    context.release();
    // isolate.dispose(); // Can reuse or dispose
  }
};

export const getSkillTools = async () => {
    const skills = await getActiveSkills();
    return skills
        .filter(s => s.manifest.function) // Only those with function def
        .map(s => ({
            functionDeclarations: [{
                name: s.manifest.function!.name,
                description: s.manifest.function!.description,
                parameters: s.manifest.function!.parameters
            }]
        }));
};

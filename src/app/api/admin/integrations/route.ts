
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { EncryptionService } from '@/services/EncryptionService';

const SENSITIVE_CONFIG_KEYS = [
  'apiKey', 'api_key', 'pass', 'password', 'secret', 'apiSecret', 'secretKey', 'accessToken', 'token', 'encryptKey'
];

const processSensitiveFields = (obj: any, action: 'encrypt' | 'decrypt'): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in newObj) {
    if (SENSITIVE_CONFIG_KEYS.includes(key) && typeof newObj[key] === 'string' && newObj[key]) {
      try {
        if (action === 'encrypt') {
           newObj[key] = EncryptionService.encrypt(newObj[key]);
        } else {
             // decrypt
             if (newObj[key].includes(':')) {
                newObj[key] = EncryptionService.decrypt(newObj[key]);
             }
        }
      } catch (e) {
        console.warn(`Failed to ${action} field ${key}`, e);
      }
    } else if (typeof newObj[key] === 'object') {
      newObj[key] = processSensitiveFields(newObj[key], action);
    }
  }
  
  return newObj;
};

export async function GET(req: NextRequest) {
  try {
    // Attempt to fetch with is_deleted filter, but fallback if column doesn't exist
    let query = supabase.from('integration_configs').select('*');
    
    // We can't easily check column existence with the JS client without a separate query,
    // so we just run the query and catch errors if they happen.
    // However, since we know migration 63 adds it, we'll try the filtered query first.
    let { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .or('is_deleted.is.null,is_deleted.eq.false');

    if (error && error.message.includes('column "is_deleted" does not exist')) {
      // Fallback for older schema
      const fallback = await supabase.from('integration_configs').select('*');
      data = fallback.data;
      error = fallback.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const decryptedData = data?.map(item => ({
      ...item,
      config: processSensitiveFields(item.config, 'decrypt')
    }));

    return NextResponse.json(decryptedData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, category, config, is_enabled } = body;

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'category is required' }, { status: 400 });
    }

    const encryptedConfig = processSensitiveFields(config, 'encrypt');

    const payload = {
      category,
      config: encryptedConfig,
      is_enabled,
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    if (id && typeof id === 'string') {
      const { data, error } = await supabase
        .from('integration_configs')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      
      // If found and updated, return success
      if (data) return NextResponse.json(data);
      
      // If not found, and it's NOT LLM, return 404
      if (category !== 'llm') {
        return NextResponse.json({ error: 'Integration config not found' }, { status: 404 });
      }
      
      // If it IS LLM and not found by ID, it might be a model _id from a legacy array.
      // We will fall through to the singleton-style check below to see if we can update by model/provider.
    }

    // Special handling for LLM: try to find an existing row with same model/provider before inserting
    if (category === 'llm') {
         const provider = config.provider || 'openai';
         const model = config.model;

         if (model) {
             // Try to find existing standalone row with same provider/model
             const { data: existing, error: findError } = await supabase
                .from('integration_configs')
                .select('id')
                .eq('category', 'llm')
                .eq('config->>model', model)
                .eq('config->>provider', provider)
                .or('is_deleted.is.null,is_deleted.eq.false')
                .maybeSingle();
            
             if (!findError && existing?.id) {
                 // Update the existing standalone row
                 const { data: updated, error: updateError } = await supabase
                    .from('integration_configs')
                    .update(payload)
                    .eq('id', existing.id)
                    .select()
                    .single();
                 if (!updateError) return NextResponse.json(updated);
             }
         }

         // If no existing standalone row found, insert as a new row
         const { data, error } = await supabase.from('integration_configs').insert(payload).select().single();
         if (error) return NextResponse.json({ error: error.message }, { status: 500 });
         return NextResponse.json(data);
    }

    const { data: existing, error: findError } = await supabase
      .from('integration_configs')
      .select('id')
      .eq('category', category)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .limit(1)
      .maybeSingle();
    
    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });

    if (existing?.id) {
      const { data, error } = await supabase
        .from('integration_configs')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    const { data, error } = await supabase.from('integration_configs').insert(payload).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('integration_configs')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

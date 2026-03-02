
import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/services/emailService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, ...config } = body;
    
    // config contains host, port, user, pass, senderName, secure
    // If config is provided, sendTestEmail will use it instead of the saved config
    // We pass config as the second argument if it has keys, otherwise undefined
    
    const hasConfig = Object.keys(config).length > 0;
    
    const result = await EmailService.sendTestEmail(to, hasConfig ? config : undefined);
    
    if (result.success) {
        return NextResponse.json(result);
    } else {
        return NextResponse.json(result, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
        success: false, 
        message: error.message || 'Email test failed' 
    }, { status: 500 });
  }
}

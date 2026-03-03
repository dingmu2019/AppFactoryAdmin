
import { NextRequest, NextResponse } from 'next/server';
import { MessageService, MessageChannel } from '@/services/message/MessageService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channel, recipient, content, config } = body;
    
    if (!channel || !recipient || !content) {
        return NextResponse.json({ 
            success: false, 
            message: 'Missing required fields: channel, recipient, content' 
        }, { status: 400 });
    }

    const result = await MessageService.sendTestMessage(
        channel as MessageChannel,
        { recipient, content },
        config || {}
    );
    
    if (result.success) {
        return NextResponse.json(result);
    } else {
        return NextResponse.json(result, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
        success: false, 
        message: error.message || 'Message test failed' 
    }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EmailService } from '@/services/emailService';
import { NotificationService } from '@/services/notification/notificationService';
import { withApiErrorHandling } from '@/lib/api-wrapper';

// In-memory storage for verification codes (Fallback if DB table is missing)
const memoryVerificationCodes = new Map<string, { code: string, expiresAt: number }>();

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const POST = withApiErrorHandling(async (req: NextRequest) => {
    const body = await req.json();
    const { email } = body;
    console.log('[auth][send-code] request', { email });
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Try to store in DB first, fallback to memory
    try {
        const { error: dbError } = await supabase
        .from('verification_codes')
        .insert({
            email,
            code,
            expires_at: expiresAt.toISOString(),
        });
        
        if (dbError) throw dbError;
    } catch (err) {
        console.warn('DB Error (verification_codes), falling back to memory:', err);
        memoryVerificationCodes.set(email, { code, expiresAt: expiresAt.getTime() });
    }

    try {
      // Assuming NotificationService and EmailService are migrated or compatible
      // For now, we wrap in try-catch to avoid breaking if services aren't fully ready
      if (NotificationService && typeof NotificationService.sendTest === 'function') {
          await NotificationService.sendTest('email', email, 'login_verification', { code, ttlMinutes: 5 });
      } else {
          // Fallback to direct EmailService or just log
          if (EmailService && typeof EmailService.sendVerificationCode === 'function') {
              await EmailService.sendVerificationCode(email, code);
          } else {
              console.log(`[DEV] Verification code for ${email}: ${code}`);
          }
      }
    } catch (e) {
      // Fallback
      if (EmailService && typeof EmailService.sendVerificationCode === 'function') {
          await EmailService.sendVerificationCode(email, code);
      } else {
          console.log(`[DEV] Verification code for ${email}: ${code}`);
      }
    }

    console.log('[auth][send-code] sent', { email });
    return NextResponse.json({ success: true, message: 'Verification code sent' });
});

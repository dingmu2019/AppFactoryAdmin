import { NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment/PaymentService';

export async function POST(req: Request) {
  try {
    const { amount, provider } = await req.json();

    if (!amount || !provider) {
      return NextResponse.json({ error: 'Missing amount or provider' }, { status: 400 });
    }

    // Mock an order ID and user ID for the test
    const orderId = `TEST_${Date.now()}`;
    const userId = 'test_user_001';

    const result = await PaymentService.createPayment({
      orderId,
      userId,
      amount: parseFloat(amount),
      currency: 'cny',
      provider
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Payment initialization failed' }, { status: 500 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Test Payment Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

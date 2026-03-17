"use client";

import React, { useState } from 'react';

export default function PaymentTestDemo() {
  const [amount, setAmount] = useState(0.01);
  const [provider, setProvider] = useState('alipay');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleTestPayment = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/test-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      setResult(data);

      // If it's Alipay Page Pay, it might return a URL or an HTML form
      if (provider === 'alipay' && data.redirectUrl) {
        if (data.redirectUrl.startsWith('http')) {
          // It's a URL, redirect to it
          window.location.href = data.redirectUrl;
        } else {
          // It's a form HTML string
          const div = document.createElement('div');
          div.innerHTML = data.redirectUrl;
          document.body.appendChild(div);
          const form = div.querySelector('form');
          if (form) {
            form.submit();
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow mt-10">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">支付测试 Demo (扫码支付)</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">测试金额 (元)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            min={0.01}
            step={0.01}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">选择支付方式</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="provider"
                value="alipay"
                checked={provider === 'alipay'}
                onChange={(e) => setProvider(e.target.value)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span className="dark:text-zinc-300">支付宝 (Alipay)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="provider"
                value="wechat_pay"
                checked={provider === 'wechat_pay'}
                onChange={(e) => setProvider(e.target.value)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span className="dark:text-zinc-300">微信支付 (WeChat Pay)</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleTestPayment}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? '生成支付中...' : '生成支付二维码 / 跳转支付'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
            <strong>请求失败:</strong> {error}
          </div>
        )}

        {result && provider === 'wechat_pay' && result.redirectUrl && (
          <div className="mt-8 flex flex-col items-center justify-center p-6 border rounded-lg bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">
            <h3 className="text-lg font-medium mb-4 dark:text-white">请使用微信扫码支付</h3>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.redirectUrl)}`} 
                alt="WeChat Pay QR Code" 
                className="w-[200px] h-[200px]"
              />
            </div>
            <p className="mt-4 text-sm text-zinc-500">订单号: {result.transactionId}</p>
          </div>
        )}
      </div>
    </div>
  );
}

import dotenv from 'dotenv';

dotenv.config();

export interface QueueMessage {
  topic: string;
  data: any;
}

export const QueueService = {
  /**
   * Publish a message to the queue (Upstash QStash)
   * If QSTASH_TOKEN is not configured, it will return false, indicating synchronous fallback is needed.
   */
  async publish(topic: string, data: any, delay?: number): Promise<boolean> {
    const token = process.env.QSTASH_TOKEN;

    // 1. Local Async Simulation (setTimeout)
    // If we are in development and NO QStash token is provided, we can simulate async behavior
    // This allows local testing without setting up QStash tunnel
    if (process.env.NODE_ENV !== 'production' && !token) {
        console.log(`[Queue] Simulating async queue locally (Topic: ${topic})`);
        
        // We need to dynamically import the worker logic to avoid circular dependencies if we import route directly
        // But since this is a simulation, we can just fire-and-forget a fetch to our own local API
        const localPort = process.env.PORT || 3001;
        const localUrl = `http://localhost:${localPort}/api/queue/worker`;
        
        setTimeout(() => {
            fetch(localUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, data })
            }).catch(err => console.error('[Queue] Local simulation failed:', err.message));
        }, delay ? delay * 1000 : 100);

        return true;
    }

    if (!token) {
      console.warn("QueueService: QSTASH_TOKEN not found. Skipping async queue.");
      return false;
    }

    // Determine the destination URL (Self-call)
    // In Vercel, VERCEL_URL is set automatically.
    // In local dev, we might use ngrok or localhost (which won't work with QStash unless tunnelled)
    const baseUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

    if (!baseUrl) {
       console.warn("QueueService: APP_URL or VERCEL_URL not set. Cannot determine worker URL.");
       return false;
    }

    const destinationUrl = `${baseUrl}/api/queue/worker`;

    try {
      console.log(`[Queue] Publishing to ${destinationUrl} (Topic: ${topic})`);
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Upstash-Forward-Content-Type': 'application/json' // Forward this header to worker
      };

      if (delay) {
        headers['Upstash-Delay'] = `${delay}s`;
      }

      const response = await fetch(`https://qstash.upstash.io/v2/publish/${destinationUrl}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic,
          data
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Queue] QStash publish failed: ${response.status} ${errText}`);
        return false;
      }

      const result = await response.json();
      console.log(`[Queue] Published message ${result.messageId}`);
      return true;
    } catch (err: any) {
      console.error(`[Queue] Unexpected error: ${err.message}`);
      return false;
    }
  }
};

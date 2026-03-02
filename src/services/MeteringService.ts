import { supabase } from '../lib/supabase';

export class MeteringService {
  /**
   * Record a usage event
   * @param appId - The SaaS App ID
   * @param metricKey - The key defined in billing_meters (e.g. 'ai_token_input')
   * @param amount - The quantity consumed
   * @param dimensions - Optional metadata (e.g. model name)
   */
  static async recordUsage(
    appId: string, 
    metricKey: string, 
    amount: number, 
    dimensions: Record<string, any> = {}
  ) {
    // Fire and forget (or queue)
    // For MVP we insert directly
    try {
      const { error } = await supabase
        .from('metering_events')
        .insert([{
          app_id: appId,
          metric_key: metricKey,
          amount,
          dimensions,
          recorded_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error(`Failed to record usage for ${appId}/${metricKey}:`, error);
      }
    } catch (e) {
      console.error(`Exception recording usage:`, e);
    }
  }

  /**
   * Aggregate usage for an app within a time range
   */
  static async getAggregatedUsage(appId: string, from: Date, to: Date) {
    const { data, error } = await supabase
      .from('metering_events')
      .select('metric_key, amount')
      .eq('app_id', appId)
      .gte('recorded_at', from.toISOString())
      .lte('recorded_at', to.toISOString());

    if (error) throw error;

    // Sum by metric
    const totals: Record<string, number> = {};
    data.forEach((row: any) => {
      totals[row.metric_key] = (totals[row.metric_key] || 0) + row.amount;
    });

    return totals;
  }
}

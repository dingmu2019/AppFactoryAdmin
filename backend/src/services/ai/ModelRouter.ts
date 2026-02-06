
import type { AIProvider, AIRequest, AIResponse, ProviderConfig } from './types.ts';
import { OpenAIProvider } from './providers/OpenAIProvider.ts';
import { GeminiProvider } from './providers/GeminiProvider.ts';

export class CircuitBreaker {
  private failures: Map<string, number> = new Map();
  private lastFailure: Map<string, number> = new Map();
  private readonly threshold = 3;
  private readonly resetTimeout = 60000; // 1 minute

  recordFailure(providerId: string) {
    const count = (this.failures.get(providerId) || 0) + 1;
    this.failures.set(providerId, count);
    this.lastFailure.set(providerId, Date.now());
    console.warn(`[CircuitBreaker] Provider ${providerId} failure count: ${count}`);
  }

  recordSuccess(providerId: string) {
    if (this.failures.has(providerId)) {
        this.failures.delete(providerId);
        this.lastFailure.delete(providerId);
        console.log(`[CircuitBreaker] Provider ${providerId} recovered.`);
    }
  }

  isOpen(providerId: string): boolean {
    const count = this.failures.get(providerId) || 0;
    if (count < this.threshold) return false;

    const last = this.lastFailure.get(providerId) || 0;
    if (Date.now() - last > this.resetTimeout) {
      // Half-open: allow a retry after timeout
      // We don't strictly implement half-open state here, just reset on timeout check or let it pass
      // For simplicity, let's say if timeout passed, it's not open (we'll see if it fails again)
      return false;
    }

    return true;
  }
}

export class ModelRouter {
  private providers: Map<string, AIProvider> = new Map();
  private configs: ProviderConfig[] = [];
  private circuitBreaker = new CircuitBreaker();

  constructor() {
    // Initial configs - typically loaded from DB
    // We will support dynamic loading later
  }

  registerProvider(config: ProviderConfig) {
    let provider: AIProvider;
    
    switch (config.provider) {
      case 'openai':
      case 'deepseek': // Compatible with OpenAI client usually
        provider = new OpenAIProvider(config);
        break;
      case 'google':
        provider = new GeminiProvider(config);
        break;
      default:
        // Default fallback to OpenAI format for unknown but compatible providers
        provider = new OpenAIProvider(config);
    }

    this.providers.set(config.id, provider);
    this.configs.push(config);
    // Sort by priority (0 is highest)
    this.configs.sort((a, b) => a.priority - b.priority);
  }

  clearProviders() {
    this.providers.clear();
    this.configs = [];
  }

  async routeRequest(request: AIRequest): Promise<AIResponse> {
    // 1. Determine eligible providers based on complexity
    let eligibleConfigs = this.configs;

    if (request.model) {
      eligibleConfigs = eligibleConfigs.filter(c => c.model === request.model);
      if (eligibleConfigs.length === 0) {
        throw new Error(`Requested model not available: ${request.model}`);
      }
    }

    if (request.complexity === 'simple') {
      // Prefer faster/cheaper models (e.g., flash, mini, 3.5)
      // We can filter configs by model name heuristics if explicit tagging isn't available
      // For now, we rely on the priority order set in DB config
    }

    if (eligibleConfigs.length === 0) {
        throw new Error('No enabled AI providers found in configuration.');
    }

    // 2. Iterate through providers with Circuit Breaker check
    let lastError: any = null;
    let attemptedCount = 0;
    let skippedCount = 0;

    for (const config of eligibleConfigs) {
      if (this.circuitBreaker.isOpen(config.id)) {
        console.warn(`[ModelRouter] Skipping ${config.id} (Circuit Breaker Open)`);
        skippedCount++;
        continue;
      }

      const provider = this.providers.get(config.id);
      if (!provider) continue;

      try {
        console.log(`[ModelRouter] Routing to ${provider.name} (Priority ${config.priority})`);
        attemptedCount++;
        const response = await provider.chat(request);
        
        this.circuitBreaker.recordSuccess(config.id);
        return { ...response, provider: provider.name, model: config.model };

      } catch (error) {
        console.error(`[ModelRouter] Provider ${provider.name} failed:`, error);
        this.circuitBreaker.recordFailure(config.id);
        lastError = error;
        // Continue to next provider (Fallback)
      }
    }

    if (attemptedCount === 0 && skippedCount > 0) {
        throw new Error(`All AI providers are currently unavailable (Circuit Breaker Open). Please try again in 1 minute.`);
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message || lastError}`);
  }
}

// Singleton instance
export const modelRouter = new ModelRouter();

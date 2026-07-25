import { getPreferences } from '@/storage/preferences';
import type { ProviderId, ProviderStatus } from '@/shared/types';
import { ChromeBuiltinAIProvider } from './chromeBuiltin';
import { OllamaProvider } from './ollama';
import type { LocalAIProvider } from './types';

export class ProviderRegistry {
  private chrome = new ChromeBuiltinAIProvider();
  private ollama = new OllamaProvider();
  private defaultId: ProviderId = 'chrome-builtin';

  async init(): Promise<void> {
    const prefs = await getPreferences();
    this.defaultId = prefs.defaultProviderId;
    this.ollama.setBaseUrl(prefs.ollamaBaseUrl);
    if (prefs.ollamaModel) {
      this.ollama.setModel(prefs.ollamaModel);
    }
  }

  getDefaultId(): ProviderId {
    return this.defaultId;
  }

  /** Explicit switch only — never silent fallback. */
  async setDefault(id: ProviderId): Promise<void> {
    this.defaultId = id;
  }

  get(id?: ProviderId): LocalAIProvider {
    const resolved = id ?? this.defaultId;
    return resolved === 'ollama' ? this.ollama : this.chrome;
  }

  list(): LocalAIProvider[] {
    return [this.chrome, this.ollama];
  }

  async healthAll(): Promise<ProviderStatus[]> {
    await this.init();
    return Promise.all(this.list().map((p) => p.healthCheck()));
  }

  getOllama(): OllamaProvider {
    return this.ollama;
  }

  getChrome(): ChromeBuiltinAIProvider {
    return this.chrome;
  }
}

export const providerRegistry = new ProviderRegistry();

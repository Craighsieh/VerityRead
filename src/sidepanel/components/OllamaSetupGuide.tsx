import { OLLAMA_STARTER_MODELS } from '@/providers/modelRecommendation';
import { resolveLocale, t, type SupportedLocale } from '@/i18n';

const SETUP_GUIDE_BASE_URL = 'https://craighsieh.github.io/VerityRead/setup/';

const SETUP_GUIDE_PATHS: Record<SupportedLocale, string> = {
  en: '',
  zh_TW: 'zh-TW/',
  zh_CN: 'zh-CN/',
  ja: 'ja/',
  ko: 'ko/',
};

export function getOllamaSetupGuideUrl(locale = resolveLocale()): string {
  return `${SETUP_GUIDE_BASE_URL}${SETUP_GUIDE_PATHS[locale]}`;
}

export function OllamaSetupLink() {
  return (
    <a href={getOllamaSetupGuideUrl()} target="_blank" rel="noreferrer">
      {t('ollamaSetupGuide')}
    </a>
  );
}

export function OllamaSetupGuide() {
  const [qualityModel, lighterModel] = OLLAMA_STARTER_MODELS;

  return (
    <div className="connection-status setup-guide stack">
      <strong>{t('installOllamaAndModel')}</strong>
      <span>{t('ollamaOptionalBody')}</span>
      <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
        {t('downloadOllama')}
      </a>
      <div className="command-option">
        <span>
          {t('qualityModelLabel', {
            size: qualityModel.approximateDownloadGb,
          })}
        </span>
        <code>ollama pull {qualityModel.name}</code>
      </div>
      <div className="command-option">
        <span>
          {t('lighterModelLabel', {
            size: lighterModel.approximateDownloadGb,
          })}
        </span>
        <code>ollama pull {lighterModel.name}</code>
      </div>
      <span className="muted">{t('modelDownloadNotice')}</span>
      <span className="muted">{t('afterInstallRecheck')}</span>
      <OllamaSetupLink />
    </div>
  );
}

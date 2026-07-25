import type { ErrorCode } from '@/shared/types';
import { resolveLocale, type SupportedLocale } from './index';

interface LocalizedErrorCopy {
  message: string;
  impact: string;
  nextSteps: string[];
}

const messages: Record<SupportedLocale, Record<ErrorCode, string>> = {
  en: {
    PAGE_PROTECTED: 'Extensions cannot access this page.',
    PAGE_INACCESSIBLE: 'Unable to access the current tab.',
    PAGE_ACCESS_REQUIRED: 'This site has not granted page access.',
    EXTRACT_QUALITY_LOW: 'The page could not be read reliably.',
    CONTENT_TOO_LONG: 'The page exceeds the model context window.',
    CONTENT_INSUFFICIENT: 'There is not enough readable content.',
    MODEL_UNAVAILABLE: 'The selected local model is unavailable.',
    MODEL_DOWNLOAD_FAILED: 'The model or language pack download failed.',
    PROVIDER_UNHEALTHY: 'The selected Provider failed its health check.',
    OLLAMA_UNREACHABLE: 'Cannot reach Ollama at 127.0.0.1:11434.',
    OLLAMA_CORS: 'Ollama rejected the extension origin (CORS).',
    TASK_CANCELLED: 'The task was cancelled.',
    OFFLINE_LOCK_BLOCKED: 'Offline Lock blocked a network operation.',
    RETRIEVAL_LOW_CONFIDENCE: 'The current page does not contain enough information.',
    UNKNOWN: 'An unexpected error occurred.',
  },
  zh_TW: {
    PAGE_PROTECTED: '擴充功能無法存取此頁面。',
    PAGE_INACCESSIBLE: '無法存取目前分頁。',
    PAGE_ACCESS_REQUIRED: '此網站尚未授予頁面存取權。',
    EXTRACT_QUALITY_LOW: '無法可靠讀取此頁面。',
    CONTENT_TOO_LONG: '頁面內容超出模型上下文範圍。',
    CONTENT_INSUFFICIENT: '沒有足夠的可讀取內容。',
    MODEL_UNAVAILABLE: '所選本地模型無法使用。',
    MODEL_DOWNLOAD_FAILED: '模型或語言套件下載失敗。',
    PROVIDER_UNHEALTHY: '所選 Provider 未通過健康檢查。',
    OLLAMA_UNREACHABLE: '無法連線至 127.0.0.1:11434 的 Ollama。',
    OLLAMA_CORS: 'Ollama 拒絕擴充功能來源（CORS）。',
    TASK_CANCELLED: '任務已取消。',
    OFFLINE_LOCK_BLOCKED: '離線鎖定阻擋了網路操作。',
    RETRIEVAL_LOW_CONFIDENCE: '目前頁面沒有足夠資訊。',
    UNKNOWN: '發生未預期的錯誤。',
  },
  zh_CN: {
    PAGE_PROTECTED: '扩展程序无法访问此页面。',
    PAGE_INACCESSIBLE: '无法访问当前标签页。',
    PAGE_ACCESS_REQUIRED: '此网站尚未授予页面访问权限。',
    EXTRACT_QUALITY_LOW: '无法可靠读取此页面。',
    CONTENT_TOO_LONG: '页面内容超出模型上下文范围。',
    CONTENT_INSUFFICIENT: '没有足够的可读内容。',
    MODEL_UNAVAILABLE: '所选本地模型不可用。',
    MODEL_DOWNLOAD_FAILED: '模型或语言包下载失败。',
    PROVIDER_UNHEALTHY: '所选 Provider 未通过健康检查。',
    OLLAMA_UNREACHABLE: '无法连接到 127.0.0.1:11434 的 Ollama。',
    OLLAMA_CORS: 'Ollama 拒绝扩展程序来源（CORS）。',
    TASK_CANCELLED: '任务已取消。',
    OFFLINE_LOCK_BLOCKED: '离线锁定阻止了网络操作。',
    RETRIEVAL_LOW_CONFIDENCE: '当前页面没有足够信息。',
    UNKNOWN: '发生意外错误。',
  },
  ja: {
    PAGE_PROTECTED: '拡張機能はこのページにアクセスできません。',
    PAGE_INACCESSIBLE: '現在のタブにアクセスできません。',
    PAGE_ACCESS_REQUIRED: 'このサイトへのアクセスが許可されていません。',
    EXTRACT_QUALITY_LOW: 'ページを正しく読み取れませんでした。',
    CONTENT_TOO_LONG: 'ページ内容がモデルのコンテキスト上限を超えています。',
    CONTENT_INSUFFICIENT: '読み取れる内容が不足しています。',
    MODEL_UNAVAILABLE: '選択したローカルモデルは利用できません。',
    MODEL_DOWNLOAD_FAILED: 'モデルまたは言語パックのダウンロードに失敗しました。',
    PROVIDER_UNHEALTHY: '選択したProviderの動作確認に失敗しました。',
    OLLAMA_UNREACHABLE: '127.0.0.1:11434のOllamaに接続できません。',
    OLLAMA_CORS: 'Ollamaが拡張機能のオリジンを拒否しました（CORS）。',
    TASK_CANCELLED: 'タスクはキャンセルされました。',
    OFFLINE_LOCK_BLOCKED: 'オフラインロックがネットワーク操作をブロックしました。',
    RETRIEVAL_LOW_CONFIDENCE: '現在のページに十分な情報がありません。',
    UNKNOWN: '予期しないエラーが発生しました。',
  },
  ko: {
    PAGE_PROTECTED: '확장 프로그램이 이 페이지에 접근할 수 없습니다.',
    PAGE_INACCESSIBLE: '현재 탭에 접근할 수 없습니다.',
    PAGE_ACCESS_REQUIRED: '이 사이트에 대한 페이지 접근이 허용되지 않았습니다.',
    EXTRACT_QUALITY_LOW: '페이지를 안정적으로 읽을 수 없습니다.',
    CONTENT_TOO_LONG: '페이지 내용이 모델의 컨텍스트 한도를 초과합니다.',
    CONTENT_INSUFFICIENT: '읽을 수 있는 내용이 충분하지 않습니다.',
    MODEL_UNAVAILABLE: '선택한 로컬 모델을 사용할 수 없습니다.',
    MODEL_DOWNLOAD_FAILED: '모델 또는 언어 팩 다운로드에 실패했습니다.',
    PROVIDER_UNHEALTHY: '선택한 Provider가 상태 확인을 통과하지 못했습니다.',
    OLLAMA_UNREACHABLE: '127.0.0.1:11434의 Ollama에 연결할 수 없습니다.',
    OLLAMA_CORS: 'Ollama가 확장 프로그램 출처를 거부했습니다(CORS).',
    TASK_CANCELLED: '작업이 취소되었습니다.',
    OFFLINE_LOCK_BLOCKED: '오프라인 잠금이 네트워크 작업을 차단했습니다.',
    RETRIEVAL_LOW_CONFIDENCE: '현재 페이지에 충분한 정보가 없습니다.',
    UNKNOWN: '예기치 않은 오류가 발생했습니다.',
  },
};

const genericGuidance: Record<
  SupportedLocale,
  Pick<LocalizedErrorCopy, 'impact' | 'nextSteps'>
> = {
  en: {
    impact: 'The current action could not be completed.',
    nextSteps: ['Review the related setting or permission, then retry.'],
  },
  zh_TW: {
    impact: '目前操作無法完成。',
    nextSteps: ['請檢查相關設定或權限後重試。'],
  },
  zh_CN: {
    impact: '当前操作无法完成。',
    nextSteps: ['请检查相关设置或权限后重试。'],
  },
  ja: {
    impact: '現在の操作を完了できませんでした。',
    nextSteps: ['関連する設定または権限を確認して、もう一度お試しください。'],
  },
  ko: {
    impact: '현재 작업을 완료할 수 없습니다.',
    nextSteps: ['관련 설정 또는 권한을 확인한 후 다시 시도하세요.'],
  },
};

export function getLocalizedErrorCopy(
  code: ErrorCode,
  locale = resolveLocale(),
): LocalizedErrorCopy {
  const guidance = genericGuidance[locale];
  return {
    message: messages[locale][code],
    impact: guidance.impact,
    nextSteps: guidance.nextSteps,
  };
}

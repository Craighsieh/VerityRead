import { useEffect, useMemo, useRef, useState } from 'react';
import { taskOrchestrator } from '@/core/orchestrator';
import { createAppError, isAppError } from '@/shared/errors';
import { createTaskId } from '@/shared/messages';
import { sendMessage } from '@/shared/messaging';
import {
  isFreshContextMenuAction,
  isPendingContextMenuAction,
  PENDING_CONTEXT_MENU_ACTION_KEY,
} from '@/shared/contextMenuAction';
import type {
  AnswerLength,
  AppError,
  ContextScope,
  ExtractedPage,
  PrivacyReceipt,
  ReadingLevel,
  SourceCitation,
  SummarizeMode,
  UserPreferences,
} from '@/shared/types';
import {
  getTargetLanguageLabel,
  pairBilingualText,
  segmentForBilingual,
  TARGET_LANGUAGE_OPTIONS,
  type BilingualContent,
} from '../chat';
import { Citations } from './Citations';
import { ErrorBox } from './ErrorBox';
import { PrivacyReceiptView } from './PrivacyReceiptView';
import { productName, t } from '@/i18n';

interface Props {
  preferences: UserPreferences;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => Promise<unknown>;
  onReceipt: (receipt: PrivacyReceipt) => void;
}

interface PageContext {
  title: string;
  domain: string;
  url: string;
  extractedAt: string;
  scope: ContextScope;
}

interface UserChatMessage {
  id: string;
  role: 'user';
  content: string;
}

interface AssistantChatMessage {
  id: string;
  role: 'assistant';
  content: string;
  citations: SourceCitation[];
  receipt?: PrivacyReceipt;
  bilingual?: BilingualContent;
  bilingualTarget?: string;
  fromCache?: boolean;
}

type ChatMessage = UserChatMessage | AssistantChatMessage;

interface SummaryCommand {
  kind: 'summary';
  mode: SummarizeMode;
  requestLabel: string;
  scope: ContextScope;
  readingLevel: ReadingLevel;
  answerLength: AnswerLength;
  selectionText?: string;
}

interface AskCommand {
  kind: 'ask';
  question: string;
  requestLabel: string;
  scope: ContextScope;
  readingLevel: ReadingLevel;
  answerLength: AnswerLength;
  selectionText?: string;
}

type ChatCommand = SummaryCommand | AskCommand;
type SelectionAction = 'explain' | 'simplify';

const WELCOME_MESSAGE: AssistantChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: t('welcomeChat'),
  citations: [],
};

const SUMMARY_ACTIONS: Array<{
  mode: SummarizeMode;
  label: string;
  requestLabel: string;
}> = [
  { mode: 'quick', label: t('summary'), requestLabel: t('summarizeRequest') },
  {
    mode: 'bullets',
    label: t('keyPoints'),
    requestLabel: t('keyPointsRequest'),
  },
  {
    mode: 'outline',
    label: t('outline'),
    requestLabel: t('outlineRequest'),
  },
];

const SCOPE_LABELS: Record<ContextScope, string> = {
  page: t('entirePage'),
  selection: t('selectedText'),
  section: t('currentSection'),
};

const READING_LEVEL_LABELS: Record<ReadingLevel, string> = {
  simple: t('simple'),
  standard: t('standard'),
  deep: t('deep'),
};

function assistantMessage(
  id: string,
  content: string,
  citations: SourceCitation[],
  receipt: PrivacyReceipt,
  fromCache = false,
): AssistantChatMessage {
  return {
    id,
    role: 'assistant',
    content,
    citations,
    receipt,
    fromCache,
  };
}

function selectedTextQuestion(action: SelectionAction): string {
  if (action === 'simplify') {
    return t('simplifyInstruction');
  }
  return t('explainInstruction');
}

export function ChatPanel({ preferences, onUpdatePreferences, onReceipt }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState('');
  const [stage, setStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<AppError | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [pageChangeNotice, setPageChangeNotice] = useState('');
  const [contextScope, setContextScope] = useState<ContextScope>('page');
  const [pendingSelectionText, setPendingSelectionText] = useState('');
  const [lastCommand, setLastCommand] = useState<ChatCommand | null>(null);
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const streamingRef = useRef('');
  const handledContextMenuRequestIds = useRef(new Set<string>());

  const latestAssistant = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message): message is AssistantChatMessage =>
            message.role === 'assistant' && message.id !== 'welcome',
        ),
    [messages],
  );

  useEffect(() => {
    const chatScroll = chatScrollRef.current;
    if (!chatScroll) return;
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }, [messages, running, streaming]);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const beginTask = (userContent?: string): string => {
    const id = createTaskId();
    setTaskId(id);
    setRunning(true);
    setError(null);
    setStreaming('');
    streamingRef.current = '';
    setStage(t('preparingLocalRequest'));
    setProgressPercent(5);
    setElapsedSeconds(0);
    if (userContent) {
      setMessages((previous) => [
        ...previous,
        { id: `${id}_user`, role: 'user', content: userContent },
      ]);
    }
    return id;
  };

  const updateStream = (text: string, replace = false) => {
    streamingRef.current = replace ? text : streamingRef.current + text;
    setStreaming(streamingRef.current);
  };

  const handleTaskEvent = (event: {
    type: string;
    text?: string;
    fullText?: string;
    stage?: string;
    percent?: number;
  }) => {
    if (event.type === 'progress') {
      if (event.stage) setStage(event.stage);
      if (event.percent != null) {
        setProgressPercent((previous) => Math.max(previous, event.percent ?? 0));
      }
    }
    if (event.type === 'token' && event.text) {
      setStage(t('generatingLocally'));
      setProgressPercent((previous) => Math.max(previous, 75));
      updateStream(event.text);
    }
    if (event.type === 'done' && event.fullText) {
      setProgressPercent(96);
      updateStream(event.fullText, true);
    }
  };

  const extractPage = async (
    id: string,
    scope: ContextScope,
    selectionText?: string,
  ): Promise<ExtractedPage> => {
    setStage(
      scope === 'selection'
        ? t('readingSelection')
        : scope === 'section'
          ? t('readingSection')
          : t('readingPage'),
    );
    setProgressPercent(15);
    const extractResult = await sendMessage({
      type: 'EXTRACT_PAGE',
      taskId: id,
      scope,
      selectionText,
    });
    if (
      !extractResult ||
      extractResult.type !== 'EXTRACT_PAGE_RESULT' ||
      extractResult.error ||
      !extractResult.page
    ) {
      throw (
        (extractResult?.type === 'EXTRACT_PAGE_RESULT' && extractResult.error) ||
        createAppError('PAGE_INACCESSIBLE')
      );
    }

    const page = extractResult.page;
    setProgressPercent(30);
    setPageContext((previous) => {
      if (previous && previous.url !== page.url) {
        setPageChangeNotice(t('pageChanged', { title: page.title }));
      }
      return {
        title: page.title,
        domain: page.domain,
        url: page.url,
        extractedAt: page.extractedAt,
        scope: page.contextScope,
      };
    });
    return page;
  };

  const finishTask = () => {
    setRunning(false);
    setTaskId(null);
    setStreaming('');
    streamingRef.current = '';
    setStage('');
    setProgressPercent(0);
  };

  const handleTaskError = (caught: unknown) => {
    setError(
      isAppError(caught)
        ? caught
        : createAppError('UNKNOWN', {
            cause: caught instanceof Error ? caught.message : String(caught),
          }),
    );
  };

  const executeCommand = async (command: ChatCommand, appendUserMessage = true) => {
    if (running) return;
    setLastCommand(command);
    const id = beginTask(appendUserMessage ? command.requestLabel : undefined);
    try {
      const page = await extractPage(id, command.scope, command.selectionText);
      if (command.kind === 'summary') {
        const result = await taskOrchestrator.summarize(id, page, command.mode, {
          providerId: preferences.defaultProviderId,
          useCache: preferences.cacheSummaries,
          readingLevel: command.readingLevel,
          answerLength: command.answerLength,
          onEvent: handleTaskEvent,
        });
        setMessages((previous) => [
          ...previous,
          assistantMessage(
            `${id}_assistant`,
            result.text,
            result.citations,
            result.receipt,
            result.fromCache,
          ),
        ]);
        onReceipt(result.receipt);
      } else {
        setStage(t('findingPassages'));
        const result = await taskOrchestrator.ask(id, page, command.question, {
          providerId: preferences.defaultProviderId,
          readingLevel: command.readingLevel,
          answerLength: command.answerLength,
          onEvent: handleTaskEvent,
        });
        setMessages((previous) => [
          ...previous,
          assistantMessage(
            `${id}_assistant`,
            result.text,
            result.citations,
            result.receipt,
          ),
        ]);
        onReceipt(result.receipt);
      }
      setError(null);
    } catch (caught) {
      handleTaskError(caught);
    } finally {
      finishTask();
    }
  };

  const runSummary = async (mode: SummarizeMode, requestLabel: string) => {
    await executeCommand({
      kind: 'summary',
      mode,
      requestLabel,
      scope: contextScope,
      readingLevel: preferences.readingLevel,
      answerLength: 'normal',
      selectionText:
        contextScope === 'selection' ? pendingSelectionText || undefined : undefined,
    });
  };

  const askPage = async () => {
    const question = input.trim();
    if (!question || running) return;
    setInput('');
    await executeCommand({
      kind: 'ask',
      question,
      requestLabel: question,
      scope: contextScope,
      readingLevel: preferences.readingLevel,
      answerLength: 'normal',
      selectionText:
        contextScope === 'selection' ? pendingSelectionText || undefined : undefined,
    });
  };

  const getSelectedText = async (providedText?: string): Promise<string> => {
    const directText = providedText?.trim() ?? '';
    if (directText) return directText;
    const selection = await sendMessage({ type: 'GET_SELECTION' });
    return selection?.type === 'GET_SELECTION_RESULT' ? selection.text.trim() : '';
  };

  const selectionRequiredError = () =>
    createAppError('CONTENT_INSUFFICIENT', {
      message: t('noSelection'),
      impact: t('noSelectionImpact'),
      nextSteps: [t('noSelectionStep')],
    });

  const runSelectionAction = async (action: SelectionAction, providedText?: string) => {
    if (running) return;
    const selectedText = await getSelectedText(providedText);
    if (!selectedText) {
      setError(selectionRequiredError());
      return;
    }
    setContextScope('selection');
    setPendingSelectionText(selectedText);
    const question = selectedTextQuestion(action);
    await executeCommand({
      kind: 'ask',
      question,
      requestLabel: action === 'simplify' ? t('simplifyRequest') : t('explainRequest'),
      scope: 'selection',
      readingLevel: action === 'simplify' ? 'simple' : preferences.readingLevel,
      answerLength: 'normal',
      selectionText: selectedText,
    });
  };

  const prepareSelectionFollowUp = async (providedText?: string) => {
    if (running) return;
    const selectedText = await getSelectedText(providedText);
    if (!selectedText) {
      setError(selectionRequiredError());
      return;
    }
    setError(null);
    setContextScope('selection');
    setPendingSelectionText(selectedText);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const translateSelection = async (providedText?: string) => {
    if (running) return;
    const selectedText = await getSelectedText(providedText);
    if (!selectedText) {
      setError(selectionRequiredError());
      return;
    }

    setContextScope('selection');
    setPendingSelectionText(selectedText);
    const targetLabel = getTargetLanguageLabel(preferences.targetLanguage);
    const id = beginTask(t('translateSelectionRequest', { language: targetLabel }));
    try {
      setStage(t('translatingTo', { language: targetLabel }));
      setProgressPercent(45);
      const preparedSource = segmentForBilingual(selectedText).join('\n');
      const { result, receipt } = await taskOrchestrator.translate(
        id,
        preparedSource,
        preferences.targetLanguage,
        { providerId: preferences.defaultProviderId },
      );
      const translated = assistantMessage(`${id}_assistant`, preparedSource, [], receipt);
      translated.bilingual = pairBilingualText(preparedSource, result.translatedText);
      translated.bilingualTarget = preferences.targetLanguage;
      setMessages((previous) => [...previous, translated]);
      onReceipt(receipt);
      setError(null);
    } catch (caught) {
      handleTaskError(caught);
    } finally {
      finishTask();
    }
  };

  const makeLatestBilingual = async () => {
    if (!latestAssistant || running) return;
    const id = beginTask();
    setTranslatingMessageId(latestAssistant.id);
    const targetLabel = getTargetLanguageLabel(preferences.targetLanguage);
    try {
      setStage(t('translatingLatest', { language: targetLabel }));
      setProgressPercent(45);
      const preparedSource = segmentForBilingual(latestAssistant.content).join('\n');
      const { result, receipt } = await taskOrchestrator.translate(
        id,
        preparedSource,
        preferences.targetLanguage,
        {
          providerId: preferences.defaultProviderId,
          contentSource: 'none',
        },
      );
      setMessages((previous) =>
        previous.map((message) =>
          message.id === latestAssistant.id && message.role === 'assistant'
            ? {
                ...message,
                content: preparedSource,
                bilingual: pairBilingualText(preparedSource, result.translatedText),
                bilingualTarget: preferences.targetLanguage,
                receipt,
              }
            : message,
        ),
      );
      onReceipt(receipt);
      setError(null);
    } catch (caught) {
      handleTaskError(caught);
    } finally {
      setTranslatingMessageId(null);
      finishTask();
    }
  };

  useEffect(() => {
    let active = true;
    const claimContextMenuAction = (raw: unknown) => {
      if (!active || !isPendingContextMenuAction(raw)) return;
      if (handledContextMenuRequestIds.current.has(raw.requestId)) return;
      handledContextMenuRequestIds.current.add(raw.requestId);
      void chrome.storage.session
        .remove(PENDING_CONTEXT_MENU_ACTION_KEY)
        .catch(() => undefined);
      if (!isFreshContextMenuAction(raw)) return;

      if (raw.action === 'translate') {
        void translateSelection(raw.text);
      } else if (raw.action === 'ask') {
        void prepareSelectionFollowUp(raw.text);
      } else {
        void runSelectionAction(raw.action, raw.text);
      }
    };

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'session') return;
      claimContextMenuAction(changes[PENDING_CONTEXT_MENU_ACTION_KEY]?.newValue);
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    void chrome.storage.session
      .get(PENDING_CONTEXT_MENU_ACTION_KEY)
      .then((items) => claimContextMenuAction(items[PENDING_CONTEXT_MENU_ACTION_KEY]))
      .catch(() => undefined);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  });

  const retryLastCommand = async (shorter = false) => {
    if (!lastCommand || running) return;
    await executeCommand(
      {
        ...lastCommand,
        answerLength: shorter ? 'short' : lastCommand.answerLength,
      },
      false,
    );
  };

  const stop = () => {
    if (taskId) taskOrchestrator.cancel(taskId);
  };

  const clearConversation = () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    setPageChangeNotice('');
    setLastCommand(null);
  };

  const scopePlaceholder =
    contextScope === 'selection'
      ? t('askSelectionPlaceholder')
      : contextScope === 'section'
        ? t('askSectionPlaceholder')
        : t('askPagePlaceholder');

  return (
    <section className="chat-shell" aria-label={`${productName()} ${t('message')}`}>
      <div className="page-context">
        <div className="page-context-copy">
          <strong>{pageContext?.title ?? t('currentPageNotAttached')}</strong>
          <span className="muted">
            {pageContext
              ? t('contextAttached', {
                  domain: pageContext.domain,
                  scope: SCOPE_LABELS[pageContext.scope],
                })
              : t('attachHint')}
          </span>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={clearConversation}
          disabled={running}
        >
          {t('newChat')}
        </button>
      </div>

      <div className="chat-scroll" aria-live="polite" ref={chatScrollRef}>
        {pageChangeNotice && (
          <div className="notice-banner" role="status">
            {pageChangeNotice}
          </div>
        )}

        {messages.map((message) => (
          <article
            key={message.id}
            className={`message-row ${message.role}`}
            aria-label={message.role === 'user' ? t('you') : productName()}
          >
            <div className="message-label">
              {message.role === 'user' ? t('you') : productName()}
              {message.role === 'assistant' && message.fromCache ? (
                <span className="badge">{t('localCache')}</span>
              ) : null}
            </div>
            <div className="message-bubble">
              {message.role === 'assistant' && message.bilingual ? (
                <div className="bilingual-list">
                  {message.bilingual.pairs.map((pair, index) => (
                    <div className="bilingual-pair" key={`${message.id}_pair_${index}`}>
                      <p lang="en">{pair.source}</p>
                      <p className="translation" lang={message.bilingualTarget}>
                        {pair.target}
                      </p>
                    </div>
                  ))}
                  {!message.bilingual.aligned && (
                    <p className="muted pairing-note">{t('pairingNote')}</p>
                  )}
                </div>
              ) : (
                <div className="message-text">{message.content}</div>
              )}

              {message.role === 'assistant' && message.id !== 'welcome' && (
                <div className="message-tools">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      void navigator.clipboard.writeText(
                        message.bilingual
                          ? message.bilingual.pairs
                              .map((pair) => `${pair.source}\n${pair.target}`)
                              .join('\n\n')
                          : message.content,
                      )
                    }
                  >
                    {t('copy')}
                  </button>
                </div>
              )}
            </div>
            {message.role === 'assistant' && (
              <>
                <Citations citations={message.citations} />
                {message.receipt && (
                  <details className="receipt-details">
                    <summary>{t('privacyReceipt')}</summary>
                    <PrivacyReceiptView receipt={message.receipt} />
                  </details>
                )}
              </>
            )}
          </article>
        ))}

        {running && (
          <article
            className="message-row assistant"
            aria-label={`${productName()} ${t('workingLocally')}`}
          >
            <div className="message-label">{productName()}</div>
            <div className="message-bubble generating">
              <div className="generating-status">
                <span className="generating-dot" />
                {stage || t('workingLocally')}
              </div>
              <div className="generating-meta">
                <progress
                  value={progressPercent}
                  max={100}
                  aria-label={t('localModelProgress')}
                />
                <span>{elapsedSeconds}s</span>
              </div>
              {elapsedSeconds >= 8 && !streaming && (
                <p className="slow-task-note">{t('slowTask')}</p>
              )}
              {streaming && <div className="message-text">{streaming}</div>}
            </div>
          </article>
        )}

        {error && (
          <div className="stack">
            <ErrorBox error={error} />
            {lastCommand && (
              <div className="recovery-actions" aria-label={t('recoveryOptions')}>
                <button
                  type="button"
                  className="btn"
                  disabled={running}
                  onClick={() => void retryLastCommand()}
                >
                  {t('retry')}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={running}
                  onClick={() => void retryLastCommand(true)}
                >
                  {t('shorterAnswer')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="composer">
        <div className="context-controls">
          <label className="compact-field">
            <span>{t('context')}</span>
            <select
              value={contextScope}
              disabled={running}
              onChange={(event) => {
                const nextScope = event.target.value as ContextScope;
                setContextScope(nextScope);
                if (nextScope !== 'selection') setPendingSelectionText('');
              }}
            >
              <option value="page">{t('entirePage')}</option>
              <option value="selection">{t('selectedText')}</option>
              <option value="section">{t('currentSection')}</option>
            </select>
          </label>
          <label className="compact-field">
            <span>{t('reading')}</span>
            <select
              value={preferences.readingLevel}
              disabled={running}
              onChange={(event) =>
                void onUpdatePreferences({
                  readingLevel: event.target.value as ReadingLevel,
                })
              }
            >
              {(
                Object.entries(READING_LEVEL_LABELS) as Array<[ReadingLevel, string]>
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="quick-actions" aria-label={t('pageActions')}>
          {SUMMARY_ACTIONS.map((action) => (
            <button
              key={action.mode}
              type="button"
              className="action-chip"
              disabled={running}
              onClick={() => void runSummary(action.mode, action.requestLabel)}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            className="action-chip"
            disabled={running || !latestAssistant}
            onClick={() => void makeLatestBilingual()}
          >
            {translatingMessageId ? t('translating') : t('bilingual')}
          </button>
        </div>

        {contextScope === 'selection' && (
          <div className="selection-actions" aria-label={t('selectionActions')}>
            <button
              type="button"
              className="action-chip"
              disabled={running}
              onClick={() => void runSelectionAction('explain')}
            >
              {t('explain')}
            </button>
            <button
              type="button"
              className="action-chip"
              disabled={running}
              onClick={() => void runSelectionAction('simplify')}
            >
              {t('simplify')}
            </button>
            <button
              type="button"
              className="action-chip"
              disabled={running}
              onClick={() => void prepareSelectionFollowUp()}
            >
              {t('askFollowUp')}
            </button>
            <button
              type="button"
              className="action-chip"
              disabled={running}
              onClick={() => void translateSelection()}
            >
              {t('translate')}
            </button>
          </div>
        )}

        <div className="target-language-row">
          <label htmlFor="target-language">{t('translationTarget')}</label>
          <select
            id="target-language"
            value={preferences.targetLanguage}
            disabled={running}
            onChange={(event) =>
              void onUpdatePreferences({
                targetLanguage: event.target.value,
              })
            }
          >
            {TARGET_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="composer-input">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void askPage();
              }
            }}
            placeholder={scopePlaceholder}
            aria-label={t('message')}
            disabled={running}
            rows={2}
          />
          {running ? (
            <button type="button" className="btn danger" onClick={stop}>
              {t('stop')}
            </button>
          ) : (
            <button
              type="button"
              className="btn primary send-button"
              disabled={!input.trim()}
              onClick={() => void askPage()}
            >
              {t('send')}
            </button>
          )}
        </div>
        <p className="composer-note">
          {t('localScopeNotice', { scope: SCOPE_LABELS[contextScope] })}
        </p>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { taskOrchestrator } from '@/core/orchestrator';
import { createAppError, isAppError } from '@/shared/errors';
import { createTaskId, isExtensionMessage } from '@/shared/messages';
import { sendMessage } from '@/shared/messaging';
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
  content:
    'Ask anything about the current page, or choose an action below. VaultLens reads only the context you choose after you send a request.',
  citations: [],
};

const SUMMARY_ACTIONS: Array<{
  mode: SummarizeMode;
  label: string;
  requestLabel: string;
}> = [
  { mode: 'quick', label: 'Summary', requestLabel: 'Summarize this content.' },
  {
    mode: 'bullets',
    label: 'Key points',
    requestLabel: 'Give me the key points from this content.',
  },
  {
    mode: 'outline',
    label: 'Outline',
    requestLabel: 'Create an outline of this content.',
  },
];

const SCOPE_LABELS: Record<ContextScope, string> = {
  page: 'Entire page',
  selection: 'Selected text',
  section: 'Current section',
};

const READING_LEVEL_LABELS: Record<ReadingLevel, string> = {
  simple: 'Simple',
  standard: 'Standard',
  deep: 'Deep',
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
    return 'Rewrite the selected text in plain language without changing its meaning or adding facts.';
  }
  return "Explain the selected text in context. Define unfamiliar terms and preserve the author's meaning.";
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
    setStage('Preparing local request…');
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
      setStage('Generating answer locally…');
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
        ? 'Reading selected text…'
        : scope === 'section'
          ? 'Reading the current section…'
          : 'Reading the current page…',
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
        setPageChangeNotice(
          `Page changed to “${page.title}”. New requests use this page; older source buttons may no longer jump correctly.`,
        );
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
        setStage('Finding relevant passages…');
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
      message: 'No text is selected on the current page.',
      impact: 'This action needs highlighted page text.',
      nextSteps: ['Select a passage on the page, then try again.'],
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
      requestLabel:
        action === 'simplify'
          ? 'Simplify the selected text.'
          : 'Explain the selected text.',
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
    const id = beginTask(`Translate the selected text to ${targetLabel}.`);
    try {
      setStage(`Translating to ${targetLabel}…`);
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
      setStage(`Translating the latest answer to ${targetLabel}…`);
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
    const handleContextMenuAction = (raw: unknown) => {
      if (!isExtensionMessage(raw)) return;
      if (raw.type === 'CONTEXT_MENU_TRANSLATE') {
        void translateSelection(raw.text);
        return;
      }
      if (raw.type !== 'CONTEXT_MENU_ACTION') return;
      if (raw.action === 'translate') {
        void translateSelection(raw.text);
      } else if (raw.action === 'ask') {
        void prepareSelectionFollowUp(raw.text);
      } else {
        void runSelectionAction(raw.action, raw.text);
      }
    };
    chrome.runtime.onMessage.addListener(handleContextMenuAction);
    return () => chrome.runtime.onMessage.removeListener(handleContextMenuAction);
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
      ? 'Ask about the selected text…'
      : contextScope === 'section'
        ? 'Ask about the current section…'
        : 'Ask anything about this page…';

  return (
    <section className="chat-shell" aria-label="VaultLens page chat">
      <div className="page-context">
        <div className="page-context-copy">
          <strong>{pageContext?.title ?? 'Current page not attached'}</strong>
          <span className="muted">
            {pageContext
              ? `${pageContext.domain} · ${SCOPE_LABELS[pageContext.scope]} · read after your request`
              : 'Send a request to read the active tab locally'}
          </span>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={clearConversation}
          disabled={running}
        >
          New chat
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
            aria-label={message.role === 'user' ? 'You' : 'VaultLens'}
          >
            <div className="message-label">
              {message.role === 'user' ? 'You' : 'VaultLens'}
              {message.role === 'assistant' && message.fromCache ? (
                <span className="badge">local cache</span>
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
                    <p className="muted pairing-note">
                      The local model returned a different sentence structure, so
                      VaultLens kept the original and translation as two blocks.
                    </p>
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
                    Copy
                  </button>
                </div>
              )}
            </div>
            {message.role === 'assistant' && (
              <>
                <Citations citations={message.citations} />
                {message.receipt && (
                  <details className="receipt-details">
                    <summary>Privacy receipt</summary>
                    <PrivacyReceiptView receipt={message.receipt} />
                  </details>
                )}
              </>
            )}
          </article>
        ))}

        {running && (
          <article className="message-row assistant" aria-label="VaultLens is working">
            <div className="message-label">VaultLens</div>
            <div className="message-bubble generating">
              <div className="generating-status">
                <span className="generating-dot" />
                {stage || 'Working locally…'}
              </div>
              <div className="generating-meta">
                <progress
                  value={progressPercent}
                  max={100}
                  aria-label="Local model progress"
                />
                <span>{elapsedSeconds}s</span>
              </div>
              {elapsedSeconds >= 8 && !streaming && (
                <p className="slow-task-note">
                  The first local response may take longer while the model loads. You can
                  keep waiting or stop and retry with a shorter answer.
                </p>
              )}
              {streaming && <div className="message-text">{streaming}</div>}
            </div>
          </article>
        )}

        {error && (
          <div className="stack">
            <ErrorBox error={error} />
            {lastCommand && (
              <div className="recovery-actions" aria-label="Recovery options">
                <button
                  type="button"
                  className="btn"
                  disabled={running}
                  onClick={() => void retryLastCommand()}
                >
                  Retry
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={running}
                  onClick={() => void retryLastCommand(true)}
                >
                  Try shorter answer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="composer">
        <div className="context-controls">
          <label className="compact-field">
            <span>Context</span>
            <select
              value={contextScope}
              disabled={running}
              onChange={(event) => {
                const nextScope = event.target.value as ContextScope;
                setContextScope(nextScope);
                if (nextScope !== 'selection') setPendingSelectionText('');
              }}
            >
              <option value="page">Entire page</option>
              <option value="selection">Selected text</option>
              <option value="section">Current section</option>
            </select>
          </label>
          <label className="compact-field">
            <span>Reading</span>
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

        <div className="quick-actions" aria-label="Page actions">
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
            {translatingMessageId ? 'Translating…' : 'Bilingual'}
          </button>
        </div>

        {contextScope === 'selection' && (
          <div className="selection-actions" aria-label="Selected text actions">
            <button
              type="button"
              className="action-chip"
              disabled={running}
              onClick={() => void runSelectionAction('explain')}
            >
              Explain
            </button>
            <button
              type="button"
              className="action-chip"
              disabled={running}
              onClick={() => void runSelectionAction('simplify')}
            >
              Simplify
            </button>
            <button
              type="button"
              className="action-chip"
              disabled={running}
              onClick={() => void prepareSelectionFollowUp()}
            >
              Ask follow-up
            </button>
            <button
              type="button"
              className="action-chip"
              disabled={running}
              onClick={() => void translateSelection()}
            >
              Translate
            </button>
          </div>
        )}

        <div className="target-language-row">
          <label htmlFor="target-language">Translation target</label>
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
            aria-label="Message"
            disabled={running}
            rows={2}
          />
          {running ? (
            <button type="button" className="btn danger" onClick={stop}>
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="btn primary send-button"
              disabled={!input.trim()}
              onClick={() => void askPage()}
            >
              Send
            </button>
          )}
        </div>
        <p className="composer-note">
          Only {SCOPE_LABELS[contextScope].toLowerCase()} is sent to the selected local
          provider.
        </p>
      </div>
    </section>
  );
}

import { lazy, Suspense, useEffect, useState, type FormEvent, type FunctionComponent } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  LoaderCircle,
  Search,
} from 'lucide-react';
import type { CorpusInstaller, CorpusInstallState, QuestionRepository } from '../corpus/contracts';
import {
  configuredCorpusBaseUrl,
  createNativeCorpusInstaller,
  hasNativeCorpus,
  openNativeQuestionRepository,
} from '../corpus/nativeCorpusRuntime';
import { useQuestionSession } from '../hooks/useQuestionSession';

const Flashcard = lazy(() => import('../components/Flashcard'));

const INITIAL_INSTALL_STATE: CorpusInstallState = {
  phase: 'checking',
  completedBytes: 0,
};

const formatBytes = (bytes?: number): string => {
  if (!bytes) return '';
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
};

const NativeTrainer = ({ repository }: { repository: QuestionRepository }) => {
  const session = useQuestionSession(repository);
  const [isFlipped, setIsFlipped] = useState(false);
  const [jumpInput, setJumpInput] = useState('1');

  useEffect(() => {
    setIsFlipped(false);
    setJumpInput(String(session.currentIndex + 1));
  }, [session.activeQuestion?.id, session.currentIndex]);

  const submitJump = (event: FormEvent) => {
    event.preventDefault();
    const requestedQuestion = Number(jumpInput);
    if (Number.isInteger(requestedQuestion)) session.goTo(requestedQuestion - 1);
  };

  return (
    <div
      className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <header className="border-b border-white/10 bg-slate-950 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">OlympiadMath</h1>
            <p className="text-xs text-slate-400">{session.total.toLocaleString()} questions offline</p>
          </div>
          <Database className="h-5 w-5 text-emerald-400" aria-label="Offline question bank ready" />
        </div>

        <label className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 focus-within:border-blue-500">
          <Search className="h-4 w-4 text-slate-400" />
          <span className="sr-only">Search questions</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
            placeholder="Search questions"
            value={session.search}
            onChange={(event) => session.setSearch(event.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label>
            <span className="sr-only">Topic</span>
            <select
              className="h-10 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
              value={session.topic}
              disabled={session.facets.topics.length === 0}
              onChange={(event) => session.selectTopic(event.target.value)}
            >
              <option value="">All topics</option>
              {session.facets.topics.map((facet) => (
                <option key={facet.value} value={facet.value}>{facet.value} ({facet.count})</option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Subtopic</span>
            <select
              className="h-10 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
              value={session.subtopic}
              disabled={session.facets.subtopics.length === 0}
              onChange={(event) => session.selectSubtopic(event.target.value)}
            >
              <option value="">All subtopics</option>
              {session.facets.subtopics.map((facet) => (
                <option key={facet.value} value={facet.value}>{facet.value} ({facet.count})</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center px-4 py-3">
        {session.error ? (
          <div className="flex max-w-sm items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{session.error}</span>
          </div>
        ) : session.activeQuestion ? (
          <Suspense fallback={<div className="text-sm text-slate-400">Preparing question...</div>}>
            <Flashcard
              key={session.activeQuestion.id}
              data={session.activeQuestion}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped((flipped) => !flipped)}
            />
          </Suspense>
        ) : (
          <div className="text-sm text-slate-400">{session.isLoading ? 'Loading question...' : 'No questions found.'}</div>
        )}
      </main>

      <footer className="border-t border-white/10 bg-slate-950 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-slate-900 disabled:opacity-30"
            onClick={session.previous}
            disabled={session.currentIndex === 0 || session.isLoading}
            aria-label="Previous question"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <form className="flex min-w-0 flex-1 items-center justify-center gap-2" onSubmit={submitJump}>
            <input
              className="h-10 w-20 rounded-lg border border-white/10 bg-slate-900 px-2 text-center font-mono text-sm outline-none focus:border-blue-500"
              type="number"
              min={1}
              max={Math.max(session.total, 1)}
              value={jumpInput}
              onChange={(event) => setJumpInput(event.target.value)}
              aria-label="Question number"
            />
            <span className="truncate text-sm text-slate-400">of {session.total.toLocaleString()}</span>
          </form>

          <button
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-slate-900 disabled:opacity-30"
            onClick={session.next}
            disabled={session.currentIndex >= session.total - 1 || session.isLoading}
            aria-label="Next question"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};

const NativeSetup = ({
  state,
  configurationError,
  onInstall,
}: {
  state: CorpusInstallState;
  configurationError?: string;
  onInstall: () => void;
}) => {
  const isWorking = ['checking', 'downloading', 'verifying', 'installing'].includes(state.phase);
  const progress = state.totalBytes
    ? Math.min(100, Math.floor((state.completedBytes / state.totalBytes) * 100))
    : 0;
  const isFinalizing = state.phase === 'installing'
    || (state.phase === 'verifying' && progress === 100);
  const isDeterminate = Boolean(state.totalBytes)
    && (state.phase === 'downloading' || state.phase === 'verifying')
    && !isFinalizing;
  const progressLabel = isFinalizing ? 'Finalizing question bank' : state.phase;

  return (
    <main
      className="min-h-dvh bg-slate-950 px-5 text-slate-100 grid place-items-center"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <section className="w-full max-w-sm rounded-lg border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
          <Database className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">OlympiadMath</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Install the question bank once to search and study without a connection.
        </p>

        {isWorking && (
          <div className="mt-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-2 capitalize" role="status">
                {!isDeterminate && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
                {progressLabel}
              </span>
              {isDeterminate && <span>{progress}% · {formatBytes(state.totalBytes)}</span>}
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-800"
              role="progressbar"
              aria-label={progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={isDeterminate ? progress : undefined}
              aria-busy={!isDeterminate}
            >
              <div
                className={`h-full bg-blue-500 ${isDeterminate ? 'transition-[width] duration-300' : 'animate-pulse'}`}
                style={{ width: isDeterminate ? `${progress}%` : '100%' }}
              />
            </div>
          </div>
        )}

        {(configurationError || state.error) && (
          <div className="mt-6 flex gap-3 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{configurationError ?? state.error?.message}</span>
          </div>
        )}

        {!isWorking && (
          <button
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
            onClick={onInstall}
            disabled={Boolean(configurationError)}
          >
            <Download className="h-5 w-5" />
            {state.phase === 'failed' || state.phase === 'paused' ? 'Resume download' : 'Download question bank'}
          </button>
        )}
      </section>
    </main>
  );
};

const NativeApp: FunctionComponent = () => {
  const [installer] = useState<CorpusInstaller | undefined>(() => {
    if (!configuredCorpusBaseUrl) return undefined;
    return createNativeCorpusInstaller();
  });
  const [installState, setInstallState] = useState<CorpusInstallState>(INITIAL_INSTALL_STATE);
  const [repository, setRepository] = useState<QuestionRepository>();
  const [configurationError, setConfigurationError] = useState<string>();

  useEffect(() => {
    let disposed = false;

    if (!installer) {
      void hasNativeCorpus().then((installed) => {
        if (disposed) return;
        if (installed) {
          setInstallState({ phase: 'ready', completedBytes: 0 });
        } else {
          setInstallState({ phase: 'notInstalled', completedBytes: 0 });
          setConfigurationError('The offline question bank source is not configured for this build.');
        }
      });
      return () => { disposed = true; };
    }

    const unsubscribe = installer.subscribe(setInstallState);
    void installer.getState().then((state) => {
      if (!disposed) setInstallState(state);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [installer]);

  useEffect(() => {
    if (installState.phase !== 'ready') return;

    let disposed = false;
    let openedRepository: QuestionRepository | undefined;
    void openNativeQuestionRepository()
      .then((nextRepository) => {
        openedRepository = nextRepository;
        if (disposed) {
          void nextRepository.close();
        } else {
          setRepository(nextRepository);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) setConfigurationError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      disposed = true;
      if (openedRepository) void openedRepository.close();
    };
  }, [installState.phase, installState.version]);

  if (repository) return <NativeTrainer repository={repository} />;

  return (
    <NativeSetup
      state={installState}
      configurationError={configurationError}
      onInstall={() => {
        setConfigurationError(undefined);
        void (installState.phase === 'failed' || installState.phase === 'paused'
          ? installer?.retry()
          : installer?.install()
        )?.catch(() => undefined);
      }}
    />
  );
};

export default NativeApp;
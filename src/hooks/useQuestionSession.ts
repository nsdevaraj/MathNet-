import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import type { CorpusFacets, QuestionFilters, QuestionRepository } from '../corpus/contracts';
import type { QuizQuestion } from '../types';

const EMPTY_FACETS: CorpusFacets = {
  subjects: [],
  topics: [],
  subtopics: [],
};

export const useQuestionSession = (repository: QuestionRepository) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<QuizQuestion>();
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<CorpusFacets>(EMPTY_FACETS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const filters: QuestionFilters = {
    subject: subject || undefined,
    topic: topic || undefined,
    subtopic: subtopic || undefined,
    search: deferredSearch || undefined,
  };

  useEffect(() => {
    setCurrentIndex(0);
  }, [deferredSearch, subject, topic, subtopic]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    void repository.query({ ...filters, offset: currentIndex, limit: 1 }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        startTransition(() => {
          setActiveQuestion(page.items[0]);
          setTotal(page.total);
          setError(undefined);
          setIsLoading(false);
        });
      })
      .catch((queryError: unknown) => {
        if (controller.signal.aborted) return;
        setError(queryError instanceof Error ? queryError.message : String(queryError));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [repository, currentIndex, deferredSearch, subject, topic, subtopic]);

  useEffect(() => {
    const controller = new AbortController();

    void repository.facets(filters, controller.signal)
      .then((nextFacets) => {
        if (!controller.signal.aborted) startTransition(() => setFacets(nextFacets));
      })
      .catch((queryError: unknown) => {
        if (!controller.signal.aborted) setError(queryError instanceof Error ? queryError.message : String(queryError));
      });

    return () => controller.abort();
  }, [repository, deferredSearch, subject, topic, subtopic]);

  const selectSubject = (value: string) => {
    startTransition(() => {
      setSubject(value);
      setTopic('');
      setSubtopic('');
    });
  };

  const selectTopic = (value: string) => {
    startTransition(() => {
      setTopic(value);
      setSubtopic('');
    });
  };

  const goTo = (index: number) => {
    if (!Number.isFinite(index) || total === 0) return;
    setCurrentIndex(Math.min(Math.max(Math.trunc(index), 0), total - 1));
  };

  return {
    activeQuestion,
    currentIndex,
    deferredSearch,
    error,
    facets,
    isLoading,
    search,
    subject,
    subtopic,
    topic,
    total,
    goTo,
    next: () => goTo(currentIndex + 1),
    previous: () => goTo(currentIndex - 1),
    selectSubject,
    selectSubtopic: setSubtopic,
    selectTopic,
    setSearch,
  };
};
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { User, Quiz, Resource } from '../types';

interface QuizPageProps {
  quizId: string;
  currentUser: User | null;
  onBack: () => void;
  onSuccessReturn: (resourceId: string) => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({
  quizId,
  currentUser,
  onBack,
  onSuccessReturn,
}) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getQuiz(quizId)
      .then(async (q) => {
        if (!active) return;
        setQuiz(q);
        if (q) {
          const res = await api.getResource(q.resourceId);
          if (active) setResource(res);
        }
      })
      .catch((err) => {
        if (active) {
          setErrorMessage(err instanceof Error ? err.message : 'Unable to load safety quiz.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [quizId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="h-64 rounded-2xl bg-[#17171B] border border-[#2C2A2F] animate-pulse" />
      </div>
    );
  }

  if (!quiz || !resource) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-3">
        <h2 className="text-lg font-bold text-[#F5F1F2]">Safety quiz not found</h2>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-[#F4A6C0] hover:underline cursor-pointer"
        >
          Go back
        </button>
      </div>
    );
  }

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setErrorMessage('Please sign in to record your safety assessment.');
      return;
    }

    if (Object.keys(selectedAnswers).length < quiz.questions.length) {
      setErrorMessage(`Please answer all ${quiz.questions.length} questions before submitting.`);
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      const res = await api.submitQuiz(currentUser, resource, quiz, selectedAnswers);
      if (res.success && res.data) {
        const score = res.data.quizScore ?? 0;
        setResultScore(score);
        setPassed(score >= quiz.passMarkPercent);
        setIsSubmitted(true);
      } else {
        setErrorMessage(res.error || 'Failed to submit safety quiz.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setResultScore(null);
    setPassed(null);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-left">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-mono-code text-[#B8AEB2] hover:text-[#F5F1F2] mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-[#F4A6C0]" />
        <span>Return to Resource</span>
      </button>

      <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7A1F3D] text-[#F5F1F2] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[#F4A6C0]" />
          </div>
          <div>
            <span className="text-[11px] font-mono-code text-[#F4A6C0] uppercase tracking-wider block">
              Safety Assessment
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F5F1F2] font-title">
              {quiz.title}
            </h1>
          </div>
        </div>

        <p className="text-xs text-[#B8AEB2] leading-relaxed">
          Required for <strong className="text-[#F5F1F2]">{resource.title}</strong>. Passing score:{' '}
          <strong className="text-[#F5F1F2]">{quiz.passMarkPercent}%</strong>. Up to{' '}
          {quiz.maxAttemptsPerDay} attempts per day.
        </p>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#0D0D0F] border border-[#E0555F] text-[#E0555F] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSubmitted && resultScore !== null && (
          <div
            className={`p-5 rounded-xl border text-center space-y-3 ${
              passed
                ? 'bg-[#0D0D0F] border-[#3FA776]'
                : 'bg-[#0D0D0F] border-[#E0555F]'
            }`}
          >
            {passed ? (
              <CheckCircle2 className="w-8 h-8 text-[#3FA776] mx-auto" />
            ) : (
              <XCircle className="w-8 h-8 text-[#E0555F] mx-auto" />
            )}

            <h2 className="text-lg font-bold text-[#F5F1F2]">
              {passed ? 'Assessment Passed' : 'Assessment Not Passed'}
            </h2>

            <p className="text-sm font-mono-code text-[#F5F1F2]">
              Score: <strong>{resultScore}%</strong> (Required: {quiz.passMarkPercent}%)
            </p>

            <p className="text-xs text-[#B8AEB2] max-w-md mx-auto">
              {passed
                ? resource.riskLevel === 'high' || resource.supervisedAccess
                  ? 'Your quiz is recorded. Because this equipment requires supervision, an assigned supervisor or owner will finalize your eligibility.'
                  : 'Your eligibility is verified. You can now request an available slot.'
                : 'Review the safety rules below and try again.'}
            </p>

            <div className="pt-2 flex justify-center">
              {passed ? (
                <button
                  type="button"
                  onClick={() => onSuccessReturn(resource.id)}
                  className="px-6 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold cursor-pointer"
                >
                  Return to Resource
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-5 py-2 rounded-xl bg-[#17171B] border border-[#2C2A2F] hover:border-[#F4A6C0] text-[#F5F1F2] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#F4A6C0]" />
                  <span>Retry Assessment</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {quiz.questions.map((q, qIndex) => {
            const chosen = selectedAnswers[q.id];
            const isCorrect = isSubmitted && chosen === q.correctIndex;

            return (
              <div
                key={q.id}
                className={`p-5 rounded-xl border ${
                  isSubmitted
                    ? isCorrect
                      ? 'bg-[#0D0D0F] border-[#3FA776]/60'
                      : 'bg-[#0D0D0F] border-[#E0555F]/60'
                    : 'bg-[#0D0D0F] border-[#2C2A2F]'
                }`}
              >
                <div className="flex items-start gap-2.5 mb-3">
                  <span className="w-5 h-5 rounded-full bg-[#7A1F3D] text-[#F5F1F2] text-xs font-mono-code font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {qIndex + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-[#F5F1F2]">{q.text}</h3>
                </div>

                <div className="space-y-2 pl-7">
                  {q.options.map((opt, optIndex) => {
                    const isSelected = chosen === optIndex;
                    let optStyle =
                      'bg-[#17171B] border-[#2C2A2F] text-[#B8AEB2] hover:border-[#F4A6C0]/50 hover:text-[#F5F1F2]';

                    if (isSelected && !isSubmitted) {
                      optStyle = 'bg-[#7A1F3D] border-[#F4A6C0] text-[#F5F1F2] font-medium';
                    }

                    if (isSubmitted) {
                      if (optIndex === q.correctIndex) {
                        optStyle = 'bg-[#17171B] border-[#3FA776] text-[#3FA776] font-semibold';
                      } else if (isSelected && optIndex !== q.correctIndex) {
                        optStyle = 'bg-[#17171B] border-[#E0555F] text-[#E0555F]';
                      }
                    }

                    return (
                      <button
                        type="button"
                        key={optIndex}
                        onClick={() => handleSelectOption(q.id, optIndex)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex items-center justify-between cursor-pointer ${optStyle}`}
                      >
                        <span>{opt}</span>
                        {isSubmitted && optIndex === q.correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-[#3FA776] shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {isSubmitted && (
                  <div className="mt-3 ml-7 p-3 rounded-lg bg-[#17171B] border border-[#2C2A2F] text-xs text-[#B8AEB2]">
                    <strong className="text-[#F5F1F2] block mb-0.5">Safety Rule:</strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isSubmitted && (
          <div className="pt-4 border-t border-[#2C2A2F] flex items-center justify-between">
            <span className="text-xs font-mono-code text-[#B8AEB2]">
              Answered {Object.keys(selectedAnswers).length} of {quiz.questions.length}
            </span>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="py-2.5 px-6 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

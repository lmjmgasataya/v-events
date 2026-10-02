"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ParticipantFields } from "@/components/ParticipantFields";
import { FormError, inputCls, primaryBtnCls, secondaryBtnCls } from "@/components/form";
import { useToast } from "@/components/toast/ToastContext";
import {
  MAX_OPTIONS,
  MAX_QUESTIONS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  isChoiceType,
  newQuestionId,
  normalizeFormConfig,
  validateFormConfig,
  type EventFormConfig,
  type FormQuestion,
  type QuestionType,
} from "@/lib/form-config";
import { saveEventForm } from "../../actions";

function blankQuestion(type: QuestionType = "short_answer"): FormQuestion {
  return { id: newQuestionId(), type, label: "", description: "", required: false, options: isChoiceType(type) ? ["Option 1"] : [] };
}

export function FormBuilder({
  eventId,
  initialConfig,
  answerCounts,
  publicUrl,
}: {
  eventId: number;
  initialConfig: EventFormConfig;
  answerCounts: Record<string, number>;
  publicUrl: string;
}) {
  const [saved, setSaved] = useState(initialConfig);
  const [config, setConfig] = useState(initialConfig);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();
  const dirty = JSON.stringify(config) !== JSON.stringify(saved);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function updateQuestion(id: string, patch: Partial<FormQuestion>) {
    setConfig((c) => ({ ...c, questions: c.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));
  }

  function changeType(q: FormQuestion, type: QuestionType) {
    // Keep typed options when switching between choice types (or away and back)
    updateQuestion(q.id, { type, options: isChoiceType(type) && q.options.length === 0 ? ["Option 1"] : q.options });
  }

  function addQuestion() {
    setConfig((c) => ({ ...c, questions: [...c.questions, blankQuestion()] }));
  }

  function duplicateQuestion(index: number) {
    setConfig((c) => {
      const questions = [...c.questions];
      questions.splice(index + 1, 0, { ...c.questions[index], id: newQuestionId(), options: [...c.questions[index].options] });
      return { ...c, questions };
    });
  }

  function moveQuestion(index: number, delta: -1 | 1) {
    setConfig((c) => {
      const questions = [...c.questions];
      const [q] = questions.splice(index, 1);
      questions.splice(index + delta, 0, q);
      return { ...c, questions };
    });
  }

  function removeQuestion(q: FormQuestion) {
    const answered = answerCounts[q.id] ?? 0;
    if (
      answered > 0 &&
      !confirm(
        `${answered} participant(s) already answered “${q.label || "this question"}”. ` +
          "Their answers will no longer appear in exports or reports. Remove it anyway?"
      )
    ) {
      return;
    }
    setConfig((c) => ({ ...c, questions: c.questions.filter((x) => x.id !== q.id) }));
  }

  function save() {
    const normalized = normalizeFormConfig(config);
    const problem = validateFormConfig(normalized);
    setError(problem ?? undefined);
    if (problem) return;

    startSaving(async () => {
      const result = await saveEventForm(eventId, normalized);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfig(normalized);
      setSaved(normalized);
      showToast("success", "Registration form saved.");
      router.refresh();
    });
  }

  const previewForm = normalizeFormConfig({
    ...config,
    questions: config.questions.map((q) => ({ ...q, label: q.label || "Untitled question" })),
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Registration form</h2>
          <p className="text-sm text-gray-500">
            Used on the{" "}
            <a href={publicUrl} target="_blank" rel="noreferrer" className="text-er-navy font-medium hover:underline">
              public link
            </a>
            , walk-ins, and the staff add/edit forms.
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm font-semibold">
          {(["edit", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md px-3 py-1.5 transition ${mode === m ? "bg-er-navy text-white" : "text-gray-600 hover:text-er-navy"}`}
            >
              {m === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      {mode === "preview" ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-4">Preview of the public form{dirty && " (unsaved changes)"}</p>
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
            <ParticipantFields form={previewForm} strict />
          </form>
        </div>
      ) : (
        <>
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700">Standard fields</h3>
            <p className="text-xs text-gray-500 mb-3">
              Name and contact number are always asked — they identify the person and power check-in search.
            </p>
            <ul className="divide-y divide-gray-100 text-sm">
              {["First name", "Last name", "Contact number"].map((label) => (
                <li key={label} className="flex items-center justify-between py-2">
                  <span className="text-gray-800">{label}</span>
                  <span className="text-xs text-gray-400">Always on</span>
                </li>
              ))}
              <li className="flex items-center justify-between py-2">
                <span className="text-gray-800">Service attended</span>
                <Toggle
                  checked={config.showServiceAttended}
                  onChange={(v) => setConfig((c) => ({ ...c, showServiceAttended: v }))}
                  label="Ask service attended"
                />
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-gray-800">Lifestage</span>
                <Toggle
                  checked={config.showLifestage}
                  onChange={(v) => setConfig((c) => ({ ...c, showLifestage: v }))}
                  label="Ask lifestage"
                />
              </li>
            </ul>
          </section>

          {config.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              count={config.questions.length}
              canAdd={config.questions.length < MAX_QUESTIONS}
              onChange={(patch) => updateQuestion(q.id, patch)}
              onChangeType={(type) => changeType(q, type)}
              onMove={(delta) => moveQuestion(i, delta)}
              onDuplicate={() => duplicateQuestion(i)}
              onRemove={() => removeQuestion(q)}
            />
          ))}

          {config.questions.length < MAX_QUESTIONS && (
            <button
              type="button"
              onClick={() => addQuestion()}
              className="rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-semibold text-gray-500 hover:border-er-navy/40 hover:text-er-navy transition"
            >
              + Add question
            </button>
          )}
        </>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent px-1 pt-6 pb-4">
        <div className="mr-auto">
          <FormError message={error} />
        </div>
        {dirty && <span className="text-xs text-er-amber font-medium">Unsaved changes</span>}
        <button
          type="button"
          onClick={() => {
            setConfig(saved);
            setError(undefined);
          }}
          disabled={!dirty || saving}
          className={secondaryBtnCls}
        >
          Discard
        </button>
        <button type="button" onClick={save} disabled={!dirty || saving} className={primaryBtnCls}>
          {saving ? "Saving…" : "Save form"}
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  question: q,
  index,
  count,
  onChange,
  onChangeType,
  onMove,
  onDuplicate,
  onRemove,
  canAdd,
}: {
  question: FormQuestion;
  index: number;
  count: number;
  canAdd: boolean;
  onChange: (patch: Partial<FormQuestion>) => void;
  onChangeType: (type: QuestionType) => void;
  onMove: (delta: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const optionRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Option to focus once the next render has created its input (after Enter / Backspace)
  const focusOption = useRef<number | null>(null);

  useEffect(() => {
    if (focusOption.current === null) return;
    optionRefs.current[focusOption.current]?.focus();
    optionRefs.current[focusOption.current]?.select();
    focusOption.current = null;
  });

  function insertOption(at: number) {
    if (q.options.length >= MAX_OPTIONS) return;
    const options = [...q.options];
    options.splice(at, 0, `Option ${q.options.length + 1}`);
    onChange({ options });
    focusOption.current = at;
  }

  function removeOption(at: number) {
    onChange({ options: q.options.filter((_, i) => i !== at) });
  }

  const seen = new Set<string>();
  const duplicateAt = q.options.map((o) => {
    const key = o.trim();
    const dup = key !== "" && seen.has(key);
    seen.add(key);
    return dup;
  });
  const marker = q.type === "checkboxes" ? "rounded-sm" : "rounded-full";

  return (
    <section className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-er-navy/60 p-5 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={q.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Question"
          aria-label={`Question ${index + 1} title`}
          autoFocus={!q.label}
          className={`${inputCls} font-medium`}
        />
        <select
          value={q.type}
          onChange={(e) => onChangeType(e.target.value as QuestionType)}
          aria-label="Question type"
          className={`${inputCls} sm:w-48 shrink-0`}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <input
        value={q.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Help text (optional)"
        aria-label="Help text"
        className={`${inputCls} text-gray-600`}
      />

      {isChoiceType(q.type) ? (
        <div className="flex flex-col gap-2">
          {q.options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              {q.type === "dropdown" ? (
                <span className="w-5 text-right text-xs text-gray-400 tabular-nums">{i + 1}.</span>
              ) : (
                <span className={`h-4 w-4 shrink-0 border-2 border-gray-300 ${marker}`} aria-hidden />
              )}
              <input
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                value={option}
                onChange={(e) => onChange({ options: q.options.map((o, j) => (j === i ? e.target.value : o)) })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    insertOption(i + 1);
                  } else if (e.key === "Backspace" && option === "" && q.options.length > 1) {
                    e.preventDefault();
                    removeOption(i);
                    focusOption.current = Math.max(0, i - 1);
                  }
                }}
                aria-label={`Option ${i + 1}`}
                className={`${inputCls} py-1.5 ${duplicateAt[i] ? "border-er-amber" : ""}`}
              />
              {duplicateAt[i] && <span className="text-xs text-er-amber whitespace-nowrap">Duplicate</span>}
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={q.options.length <= 1}
                aria-label={`Remove option ${i + 1}`}
                className="text-xl leading-none text-gray-400 hover:text-red-600 disabled:invisible"
              >
                ×
              </button>
            </div>
          ))}
          {q.options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={() => insertOption(q.options.length)}
              className="self-start pl-7 text-sm font-medium text-er-navy hover:underline"
            >
              Add option
            </button>
          )}
        </div>
      ) : (
        <AnswerPlaceholder type={q.type} />
      )}

      <div className="flex flex-wrap items-center justify-end gap-1 border-t border-gray-100 pt-3 text-sm">
        <IconButton label="Move up" onClick={() => onMove(-1)} disabled={index === 0} path="M5 15l7-7 7 7" />
        <IconButton label="Move down" onClick={() => onMove(1)} disabled={index === count - 1} path="M19 9l-7 7-7-7" />
        <IconButton
          label="Duplicate"
          onClick={onDuplicate}
          disabled={!canAdd}
          path="M8 8V5a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1h-3M5 8h10a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1z"
        />
        <IconButton label="Delete" onClick={onRemove} path="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a1 1 0 01-1 1H8a1 1 0 01-1-1V7" danger />
        <span className="mx-2 h-5 w-px bg-gray-200" />
        <label className="flex items-center gap-2 text-gray-700">
          Required
          <Toggle checked={q.required} onChange={(v) => onChange({ required: v })} label="Required" />
        </label>
      </div>
    </section>
  );
}

function AnswerPlaceholder({ type }: { type: QuestionType }) {
  const text: Partial<Record<QuestionType, string>> = {
    short_answer: "Short answer text",
    paragraph: "Long answer text",
    date: "Month / day / year",
    time: "Time",
  };
  return (
    <p className={`border-b border-dotted border-gray-300 pb-1 text-sm text-gray-400 ${type === "paragraph" ? "w-full" : "w-1/2"}`}>
      {text[type]}
    </p>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  path,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  path: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 text-gray-400 transition disabled:opacity-30 disabled:hover:bg-transparent ${
        danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d={path} />
      </svg>
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${checked ? "bg-er-navy" : "bg-gray-300"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

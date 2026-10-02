// Per-event registration form ("like Google Forms"). Pure types/helpers with no
// server-only imports, safe to use from Client Components.
//
// First name, last name and contact number are always asked (they're the dedup key
// and what check-in searches on). Service attended and lifestage can be switched off
// per event, and any number of custom questions can be added after them.
// Answers live in er_participants.answers, keyed by question id.

export const QUESTION_TYPES = [
  "short_answer",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "date",
  "time",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_answer: "Short answer",
  paragraph: "Paragraph",
  multiple_choice: "Multiple choice",
  checkboxes: "Checkboxes",
  dropdown: "Dropdown",
  date: "Date",
  time: "Time",
};

/** Types whose answer must come from `options`. */
export const CHOICE_TYPES: readonly QuestionType[] = ["multiple_choice", "checkboxes", "dropdown"];

export function isChoiceType(type: QuestionType) {
  return CHOICE_TYPES.includes(type);
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  description: string;
  required: boolean;
  options: string[]; // only used by choice types
}

export interface EventFormConfig {
  showServiceAttended: boolean;
  showLifestage: boolean;
  questions: FormQuestion[];
}

/** checkboxes → string[], everything else → string. */
export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;

export const DEFAULT_FORM_CONFIG: EventFormConfig = {
  showServiceAttended: true,
  showLifestage: true,
  questions: [],
};

export const MAX_QUESTIONS = 50;
export const MAX_OPTIONS = 50;
const MAX_LABEL_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_OPTION_LENGTH = 200;
const MAX_ANSWER_LENGTH: Record<QuestionType, number> = {
  short_answer: 500,
  paragraph: 5000,
  multiple_choice: MAX_OPTION_LENGTH,
  checkboxes: MAX_OPTION_LENGTH,
  dropdown: MAX_OPTION_LENGTH,
  date: 10,
  time: 5,
};

const QUESTION_ID_REGEX = /^[a-z0-9]{1,16}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function newQuestionId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Coerces whatever is stored (or posted from the builder) into a valid config.
 * `null` (events created before forms were configurable) → the default form.
 */
export function normalizeFormConfig(raw: unknown): EventFormConfig {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const seenIds = new Set<string>();
  const questions: FormQuestion[] = [];

  for (const item of Array.isArray(obj.questions) ? obj.questions.slice(0, MAX_QUESTIONS) : []) {
    const q = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const type = QUESTION_TYPES.includes(q.type as QuestionType) ? (q.type as QuestionType) : "short_answer";
    let id = typeof q.id === "string" && QUESTION_ID_REGEX.test(q.id) ? q.id : newQuestionId();
    while (seenIds.has(id)) id = newQuestionId();
    seenIds.add(id);

    const options = isChoiceType(type)
      ? [...new Set((Array.isArray(q.options) ? q.options : []).map((o) => clean(o, MAX_OPTION_LENGTH)).filter(Boolean))].slice(
          0,
          MAX_OPTIONS
        )
      : [];

    questions.push({
      id,
      type,
      label: clean(q.label, MAX_LABEL_LENGTH),
      description: clean(q.description, MAX_DESCRIPTION_LENGTH),
      required: q.required === true,
      options,
    });
  }

  return {
    showServiceAttended: obj.showServiceAttended !== false,
    showLifestage: obj.showLifestage !== false,
    questions,
  };
}

/** Problems that should block saving the builder (normalizeFormConfig fixes everything else). */
export function validateFormConfig(config: EventFormConfig): string | null {
  for (const [i, q] of config.questions.entries()) {
    const name = q.label ? `"${q.label}"` : `Question ${i + 1}`;
    if (!q.label) return `${name} needs a question title.`;
    if (isChoiceType(q.type) && q.options.length === 0) return `${name} needs at least one option.`;
  }
  return null;
}

export function answerFieldName(questionId: string) {
  return `q_${questionId}`;
}

/** Reads posted answers for the event's questions (blank answers are left out). */
export function readAnswers(formData: FormData, questions: FormQuestion[]): Answers {
  const answers: Answers = {};
  for (const q of questions) {
    const name = answerFieldName(q.id);
    const max = MAX_ANSWER_LENGTH[q.type];
    if (q.type === "checkboxes") {
      const values = [...new Set(formData.getAll(name).map((v) => clean(v, max)).filter(Boolean))];
      if (values.length) answers[q.id] = values;
    } else {
      const value = clean(formData.get(name), max);
      if (value) answers[q.id] = value;
    }
  }
  return answers;
}

/**
 * `strict` (public registration): required questions must be answered and choices must
 * be one of the listed options. Staff forms skip both, like they skip the contact
 * number, so a walk-in can be entered quickly and older answers survive option edits.
 */
export function validateAnswers(answers: Answers, questions: FormQuestion[], { strict }: { strict: boolean }): string | null {
  for (const q of questions) {
    const value = answers[q.id];
    if (value === undefined) {
      if (strict && q.required) return `"${q.label}" is required.`;
      continue;
    }
    const values = Array.isArray(value) ? value : [value];
    if (q.type === "date" && !values.every((v) => DATE_REGEX.test(v))) return `"${q.label}" must be a valid date.`;
    if (q.type === "time" && !values.every((v) => TIME_REGEX.test(v))) return `"${q.label}" must be a valid time.`;
    if (strict && isChoiceType(q.type) && !values.every((v) => q.options.includes(v))) {
      return `Please pick one of the listed options for "${q.label}".`;
    }
  }
  return null;
}

/** Answers as plain text, for tables and CSV export. */
export function formatAnswer(value: AnswerValue | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? value.join("; ") : value;
}

const pad2 = (n: string | number) => String(n).padStart(2, "0");

/** Inverse of formatAnswer, for CSV import. Dates/times also accept Excel's M/D/YYYY and h:mm AM. */
export function parseAnswerText(type: QuestionType, text: string): AnswerValue | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (type === "checkboxes") {
    const values = trimmed.split(";").map((v) => clean(v, MAX_OPTION_LENGTH)).filter(Boolean);
    return values.length ? values : undefined;
  }
  if (type === "date") {
    const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (us) return `${us[3]}-${pad2(us[1])}-${pad2(us[2])}`;
    return DATE_REGEX.test(trimmed) ? trimmed : undefined;
  }
  if (type === "time") {
    const t = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?$/i);
    if (!t) return undefined;
    let hour = Number(t[1]);
    const meridiem = t[3]?.[0].toLowerCase();
    if (meridiem === "p" && hour < 12) hour += 12;
    if (meridiem === "a" && hour === 12) hour = 0;
    const value = `${pad2(hour)}:${t[2]}`;
    return TIME_REGEX.test(value) ? value : undefined;
  }
  return clean(trimmed, MAX_ANSWER_LENGTH[type]);
}

"use client";

import { useEffect, useRef, useState } from "react";
import { inputCls } from "@/components/form";
import { answerFieldName, type AnswerValue, type FormQuestion } from "@/lib/form-config";

/**
 * One custom form question. Posts `q_<id>` (repeated for checkboxes); parsed
 * server-side by readAnswers. Uncontrolled, so form.reset() clears it.
 */
export function QuestionField({
  question: q,
  defaultValue,
  enforceRequired,
}: {
  question: FormQuestion;
  defaultValue?: AnswerValue;
  enforceRequired: boolean;
}) {
  const required = enforceRequired && q.required;
  const name = answerFieldName(q.id);
  const id = `field-${name}`;
  const defaults = defaultValue === undefined ? [] : Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  // Keep a stored answer selectable even after its option was edited away
  const options = [...q.options, ...defaults.filter((v) => !q.options.includes(v))];
  const isGroup = q.type === "multiple_choice" || q.type === "checkboxes";

  const label = (
    <>
      {q.label} {required && <span className="text-red-500">*</span>}
    </>
  );

  return (
    <div className="sm:col-span-2">
      {isGroup ? (
        <p id={`${id}-label`} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </p>
      ) : (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      {q.description && <p className="text-xs text-gray-500 mb-2 whitespace-pre-line">{q.description}</p>}

      {q.type === "short_answer" && (
        <input id={id} name={name} required={required} defaultValue={defaults[0]} className={inputCls} />
      )}
      {q.type === "paragraph" && (
        <textarea id={id} name={name} required={required} defaultValue={defaults[0]} rows={3} className={inputCls} />
      )}
      {q.type === "date" && (
        <input id={id} name={name} type="date" required={required} defaultValue={defaults[0]} className={inputCls} />
      )}
      {q.type === "time" && (
        <input id={id} name={name} type="time" required={required} defaultValue={defaults[0]} className={inputCls} />
      )}
      {q.type === "dropdown" && (
        <select id={id} name={name} required={required} defaultValue={defaults[0] ?? ""} className={inputCls}>
          <option value="" disabled={required}>
            Select…
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {isGroup && (
        <ChoiceGroup
          type={q.type === "checkboxes" ? "checkbox" : "radio"}
          name={name}
          labelledBy={`${id}-label`}
          options={options}
          defaults={defaults}
          required={required}
        />
      )}
    </div>
  );
}

function ChoiceGroup({
  type,
  name,
  labelledBy,
  options,
  defaults,
  required,
}: {
  type: "radio" | "checkbox";
  name: string;
  labelledBy: string;
  options: string[];
  defaults: string[];
  required: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [anyChecked, setAnyChecked] = useState(defaults.length > 0);

  // form.reset() restores the inputs' defaults but not React state, so resync on reset
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onReset = () => setAnyChecked(defaults.length > 0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaults.length]);

  function sync() {
    setAnyChecked(!!ref.current?.querySelector("input:checked"));
  }

  function clear() {
    ref.current?.querySelectorAll<HTMLInputElement>("input").forEach((input) => (input.checked = false));
    sync();
  }

  return (
    <div ref={ref} role={type === "radio" ? "radiogroup" : "group"} aria-labelledby={labelledBy} className="flex flex-col gap-1.5">
      {options.map((o) => (
        <label key={o} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type={type}
            name={name}
            value={o}
            defaultChecked={defaults.includes(o)}
            // Radios: native `required` covers the group. Checkboxes have no group-level
            // required, so require every box until one is ticked.
            required={required && (type === "radio" || !anyChecked)}
            onChange={sync}
            className="mt-0.5 h-4 w-4 accent-er-navy"
          />
          <span>{o}</span>
        </label>
      ))}
      {type === "radio" && anyChecked && !required && (
        <button type="button" onClick={clear} className="self-start text-xs text-gray-400 hover:text-gray-600">
          Clear selection
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { inputCls } from "@/components/form";
import { OTHER_SERVICE, SERVICE_OPTIONS } from "@/lib/constants";

/**
 * "Service attended" dropdown with an "Others" choice that reveals a text input.
 * Posts `serviceAttended` (the choice) and `serviceAttendedOther` (the typed text);
 * readParticipantInput combines them.
 */
export function ServiceSelect({ defaultValue }: { defaultValue?: string | null }) {
  const isStandard = !defaultValue || (SERVICE_OPTIONS as readonly string[]).includes(defaultValue);
  const initialChoice = isStandard ? (defaultValue ?? "") : OTHER_SERVICE;
  const initialOther = isStandard ? "" : (defaultValue ?? "");

  const [showOther, setShowOther] = useState(initialChoice === OTHER_SERVICE);
  const selectRef = useRef<HTMLSelectElement>(null);

  // form.reset() (e.g. after "Add" in the add-participant modal) restores the select's
  // default value but not React state, so resync visibility on reset.
  useEffect(() => {
    const form = selectRef.current?.form;
    if (!form) return;
    const onReset = () => setShowOther(initialChoice === OTHER_SERVICE);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [initialChoice]);

  return (
    <div>
      <label htmlFor="serviceAttended" className="block text-sm font-medium text-gray-700 mb-1">
        Service attended
      </label>
      <select
        ref={selectRef}
        id="serviceAttended"
        name="serviceAttended"
        defaultValue={initialChoice}
        onChange={(e) => setShowOther(e.target.value === OTHER_SERVICE)}
        className={inputCls}
      >
        <option value="">Select…</option>
        {SERVICE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={OTHER_SERVICE}>{OTHER_SERVICE}</option>
      </select>
      {showOther && (
        <input
          name="serviceAttendedOther"
          defaultValue={initialOther}
          required
          autoFocus={!initialOther}
          placeholder="Please specify (e.g. Life Iloilo)"
          aria-label="Other service"
          className={`${inputCls} mt-2`}
        />
      )}
    </div>
  );
}

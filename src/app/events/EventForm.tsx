"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormError, inputCls, secondaryBtnCls, primaryBtnCls } from "@/components/form";
import { SubmitButton } from "@/components/SubmitButton";
import type { EventFormState } from "./actions";

export interface EventFormDefaults {
  name?: string;
  description?: string | null;
  venue?: string | null;
  startsAt?: string; // datetime-local value, Manila time
  endsAt?: string;
}

export function EventForm({
  action,
  defaultValues,
  submitLabel,
  cancelHref,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  defaultValues?: EventFormDefaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4 max-w-2xl">
      <Field label="Event name" name="name" required defaultValue={defaultValues?.name} autoFocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" name="startsAt" type="datetime-local" required defaultValue={defaultValues?.startsAt} />
        <Field label="Ends" name="endsAt" type="datetime-local" defaultValue={defaultValues?.endsAt} />
      </div>
      <Field label="Venue" name="venue" defaultValue={defaultValues?.venue ?? ""} />
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          className={inputCls}
          placeholder="Shown on the public registration page"
        />
      </div>

      <FormError message={state?.error} />

      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className={secondaryBtnCls}>
          Cancel
        </Link>
        <SubmitButton label={submitLabel} pendingLabel="Saving…" className={primaryBtnCls} />
      </div>
    </form>
  );
}

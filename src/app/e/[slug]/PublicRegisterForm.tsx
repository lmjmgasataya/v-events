"use client";

import { useActionState } from "react";
import { ParticipantFields } from "@/components/ParticipantFields";
import { FormError, primaryBtnCls } from "@/components/form";
import { SubmitButton } from "@/components/SubmitButton";
import type { EventFormConfig } from "@/lib/form-config";
import { registerForEvent } from "./actions";

export function PublicRegisterForm({ slug, form }: { slug: string; form: EventFormConfig }) {
  const [state, action] = useActionState(registerForEvent.bind(null, slug), undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <ParticipantFields form={form} strict />
      <FormError message={state?.error} />
      <SubmitButton label="Register" pendingLabel="Registering…" className={`${primaryBtnCls} w-full py-3`} />
    </form>
  );
}

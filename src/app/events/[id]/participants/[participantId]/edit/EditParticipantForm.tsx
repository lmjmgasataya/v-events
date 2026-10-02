"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Participant } from "@/db/schema";
import type { EventFormConfig } from "@/lib/form-config";
import { ParticipantFields } from "@/components/ParticipantFields";
import { FormError, primaryBtnCls, secondaryBtnCls } from "@/components/form";
import { SubmitButton } from "@/components/SubmitButton";
import { updateParticipant } from "../../actions";

export function EditParticipantForm({
  eventId,
  participant,
  form,
}: {
  eventId: number;
  participant: Participant;
  form: EventFormConfig;
}) {
  const [state, action] = useActionState(updateParticipant.bind(null, eventId, participant.id), undefined);

  return (
    <form action={action} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4 max-w-2xl">
      <ParticipantFields form={form} defaultValues={participant} showStatus />
      <FormError message={state?.error} />
      <div className="flex justify-end gap-2">
        <Link href={`/events/${eventId}/participants`} className={secondaryBtnCls}>
          Cancel
        </Link>
        <SubmitButton label="Save changes" pendingLabel="Saving…" className={primaryBtnCls} />
      </div>
    </form>
  );
}

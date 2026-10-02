"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { ParticipantFields } from "@/components/ParticipantFields";
import { FormError, primaryBtnCls, secondaryBtnCls } from "@/components/form";
import { SubmitButton } from "@/components/SubmitButton";
import { useToastOnResult } from "@/components/toast/useToastOnResult";
import type { EventFormConfig } from "@/lib/form-config";
import { addParticipant } from "./actions";

export function AddParticipantModal({ eventId, form }: { eventId: number; form: EventFormConfig }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryBtnCls}>
        Add participant
      </button>
      {open && <AddParticipantForm eventId={eventId} form={form} onClose={() => setOpen(false)} />}
    </>
  );
}

function AddParticipantForm({ eventId, form, onClose }: { eventId: number; form: EventFormConfig; onClose: () => void }) {
  const [state, action] = useActionState(addParticipant.bind(null, eventId), undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useToastOnResult(state?.success ? state : undefined);

  // Keep the modal open after a successful add so staff can enter several in a row
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      formRef.current?.querySelector<HTMLInputElement>("input[name=firstName]")?.focus();
    }
  }, [state]);

  return (
    <Modal title="Add participant" onClose={onClose} wide>
      <form ref={formRef} action={action} className="flex flex-col gap-4">
        <ParticipantFields form={form} showStatus />
        <FormError message={state?.error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtnCls}>
            Done
          </button>
          <SubmitButton label="Add" pendingLabel="Adding…" className={primaryBtnCls} />
        </div>
      </form>
    </Modal>
  );
}

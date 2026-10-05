import { Field, Select } from "@/components/form";
import { ServiceSelect } from "@/components/ServiceSelect";
import { QuestionField } from "@/components/QuestionField";
import { LIFESTAGE_OPTIONS, MOBILE_NUMBER_HELP, MOBILE_NUMBER_PATTERN } from "@/lib/constants";
import type { EventFormConfig } from "@/lib/form-config";
import type { Participant } from "@/db/schema";

/**
 * The participant inputs, shared by the staff add/edit forms, walk-in at check-in,
 * and the public registration page. Parsed server-side by readParticipantInput.
 * `form` is the event's registration form (see the Form tab).
 */
export function ParticipantFields({
  form,
  defaultValues,
  strict = false,
  showStatus = false,
}: {
  form: EventFormConfig;
  defaultValues?: Partial<Participant>;
  /** Public form: contact number and required questions must be filled in. */
  strict?: boolean;
  showStatus?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" name="firstName" required defaultValue={defaultValues?.firstName} autoComplete="given-name" />
      <Field label="Last name" name="lastName" required defaultValue={defaultValues?.lastName} autoComplete="family-name" />
      {form.showNickname && (
        <Field
          label="Nickname"
          name="nickname"
          maxLength={40}
          placeholder="Name on the name tag"
          defaultValue={defaultValues?.nickname}
          autoComplete="nickname"
        />
      )}
      <Field
        label="Contact number"
        name="contactNumber"
        type="tel"
        required={strict}
        pattern={MOBILE_NUMBER_PATTERN}
        title={MOBILE_NUMBER_HELP}
        placeholder="09XXXXXXXXX"
        defaultValue={defaultValues?.contactNumber}
        autoComplete="tel"
      />
      {form.showServiceAttended && <ServiceSelect defaultValue={defaultValues?.serviceAttended} />}
      {form.showLifestage && (
        <Select label="Lifestage" name="lifestage" options={LIFESTAGE_OPTIONS} defaultValue={defaultValues?.lifestage} />
      )}
      {showStatus && <Field label="Status" name="status" defaultValue={defaultValues?.status ?? "Registered"} />}
      {form.questions.map((q) => (
        <QuestionField key={q.id} question={q} defaultValue={defaultValues?.answers?.[q.id]} enforceRequired={strict} />
      ))}
    </div>
  );
}

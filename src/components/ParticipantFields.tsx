import { Field, Select } from "@/components/form";
import { LIFESTAGE_OPTIONS, MOBILE_NUMBER_HELP, MOBILE_NUMBER_PATTERN, SERVICE_OPTIONS } from "@/lib/constants";
import type { Participant } from "@/db/schema";

/**
 * The participant inputs, shared by the staff add/edit forms, walk-in at check-in,
 * and the public registration page. Parsed server-side by readParticipantInput.
 */
export function ParticipantFields({
  defaultValues,
  requireContact = false,
  showStatus = false,
}: {
  defaultValues?: Partial<Participant>;
  requireContact?: boolean;
  showStatus?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" name="firstName" required defaultValue={defaultValues?.firstName} autoComplete="given-name" />
      <Field label="Last name" name="lastName" required defaultValue={defaultValues?.lastName} autoComplete="family-name" />
      <Field
        label="Contact number"
        name="contactNumber"
        type="tel"
        required={requireContact}
        pattern={MOBILE_NUMBER_PATTERN}
        title={MOBILE_NUMBER_HELP}
        placeholder="09XXXXXXXXX"
        defaultValue={defaultValues?.contactNumber}
        autoComplete="tel"
      />
      <Select label="Service attended" name="serviceAttended" options={SERVICE_OPTIONS} defaultValue={defaultValues?.serviceAttended} />
      <Select label="Lifestage" name="lifestage" options={LIFESTAGE_OPTIONS} defaultValue={defaultValues?.lifestage} />
      {showStatus && <Field label="Status" name="status" defaultValue={defaultValues?.status ?? "Registered"} />}
    </div>
  );
}

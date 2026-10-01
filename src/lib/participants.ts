import { DEFAULT_STATUS, MOBILE_NUMBER_HELP, MOBILE_NUMBER_REGEX, OTHER_SERVICE } from "@/lib/constants";
import { normalizeService } from "@/lib/services";

// Shared FormData parsing/validation for every way a participant gets added
// (staff form, walk-in at check-in, public registration link). Edit here once.

export interface ParticipantInput {
  lastName: string;
  firstName: string;
  contactNumber: string;
  serviceAttended: string;
  lifestage: string;
  status: string;
}

function str(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? "").trim();
}

export function readParticipantInput(formData: FormData): ParticipantInput {
  const serviceChoice = str(formData, "serviceAttended");
  return {
    lastName: str(formData, "lastName"),
    firstName: str(formData, "firstName"),
    contactNumber: normalizeContactNumber(str(formData, "contactNumber")),
    // "Others" in the dropdown → use the typed "please specify" text instead (see ServiceSelect)
    serviceAttended: serviceChoice === OTHER_SERVICE ? str(formData, "serviceAttendedOther") : serviceChoice,
    lifestage: str(formData, "lifestage"),
    status: str(formData, "status") || DEFAULT_STATUS,
  };
}

/** Strips spaces/dashes/parens so "0917 123 4567" and "0917-123-4567" dedupe together. */
export function normalizeContactNumber(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

export function validateParticipantInput(
  input: ParticipantInput,
  { requireContact }: { requireContact: boolean }
): string | null {
  if (!input.lastName) return "Last name is required.";
  if (!input.firstName) return "First name is required.";
  if (requireContact && !input.contactNumber) return "Contact number is required.";
  if (input.contactNumber && !MOBILE_NUMBER_REGEX.test(input.contactNumber)) return MOBILE_NUMBER_HELP;
  return null;
}

export function toParticipantValues(input: ParticipantInput) {
  return {
    lastName: input.lastName,
    firstName: input.firstName,
    contactNumber: input.contactNumber,
    serviceAttended: normalizeService(input.serviceAttended),
    lifestage: input.lifestage || null,
    status: input.status || DEFAULT_STATUS,
  };
}

export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

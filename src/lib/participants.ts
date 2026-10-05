import { DEFAULT_STATUS, MOBILE_NUMBER_HELP, MOBILE_NUMBER_REGEX, OTHER_SERVICE } from "@/lib/constants";
import { readAnswers, validateAnswers, type Answers, type EventFormConfig } from "@/lib/form-config";
import { normalizeService } from "@/lib/services";

// Shared FormData parsing/validation for every way a participant gets added
// (staff form, walk-in at check-in, public registration link). Edit here once.

export interface ParticipantInput {
  lastName: string;
  firstName: string;
  contactNumber: string;
  // undefined = the event's form doesn't ask this, so leave the stored value alone
  nickname: string | undefined;
  serviceAttended: string | undefined;
  lifestage: string | undefined;
  status: string;
  answers: Answers;
}

const MAX_NICKNAME_LENGTH = 40;

function str(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? "").trim();
}

export function readParticipantInput(formData: FormData, form: EventFormConfig): ParticipantInput {
  const serviceChoice = str(formData, "serviceAttended");
  return {
    lastName: str(formData, "lastName"),
    firstName: str(formData, "firstName"),
    contactNumber: normalizeContactNumber(str(formData, "contactNumber")),
    nickname: form.showNickname ? str(formData, "nickname").slice(0, MAX_NICKNAME_LENGTH) : undefined,
    // "Others" in the dropdown → use the typed "please specify" text instead (see ServiceSelect)
    serviceAttended: !form.showServiceAttended
      ? undefined
      : serviceChoice === OTHER_SERVICE
        ? str(formData, "serviceAttendedOther")
        : serviceChoice,
    lifestage: form.showLifestage ? str(formData, "lifestage") : undefined,
    status: str(formData, "status") || DEFAULT_STATUS,
    answers: readAnswers(formData, form.questions),
  };
}

/** Strips spaces/dashes/parens so "0917 123 4567" and "0917-123-4567" dedupe together. */
export function normalizeContactNumber(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

/** `strict` is for the public form: contact number and required questions must be filled in. */
export function validateParticipantInput(
  input: ParticipantInput,
  form: EventFormConfig,
  { strict }: { strict: boolean }
): string | null {
  if (!input.lastName) return "Last name is required.";
  if (!input.firstName) return "First name is required.";
  if (strict && !input.contactNumber) return "Contact number is required.";
  if (input.contactNumber && !MOBILE_NUMBER_REGEX.test(input.contactNumber)) return MOBILE_NUMBER_HELP;
  return validateAnswers(input.answers, form.questions, { strict });
}

/**
 * Column values for insert/update. Fields the form doesn't ask are omitted (so an edit
 * keeps them). `answers` holds only this form's questions — on update, merge it into the
 * stored answers (see updateParticipant) so answers to removed questions aren't lost.
 */
export function toParticipantValues(input: ParticipantInput) {
  return {
    lastName: input.lastName,
    firstName: input.firstName,
    contactNumber: input.contactNumber,
    ...(input.nickname !== undefined && { nickname: input.nickname }),
    ...(input.serviceAttended !== undefined && { serviceAttended: normalizeService(input.serviceAttended) }),
    ...(input.lifestage !== undefined && { lifestage: input.lifestage || null }),
    status: input.status || DEFAULT_STATUS,
    answers: input.answers,
  };
}

/**
 * The big name on the name tag: nickname when given, otherwise the first word of the
 * first name ("Maria Angelica" → "Maria"). When that first word is an abbreviation or
 * too short to stand alone ("Ma. Anna", "Ma Cristina", "Jo Anne"), the full first name is used.
 */
export function nametagName(p: { firstName: string; nickname?: string | null }) {
  const nickname = p.nickname?.trim();
  if (nickname) return nickname;
  const words = p.firstName.trim().split(/\s+/);
  return words[0].endsWith(".") || words[0].length <= 2 ? words.join(" ") : words[0];
}

export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

export const PARTICIPANT_SORT_COLUMNS = [
  "lastName",
  "firstName",
  "contactNumber",
  "serviceAttended",
  "lifestage",
  "status",
  "registeredAt",
  "checkedInAt",
] as const;

export type ParticipantSortColumn = (typeof PARTICIPANT_SORT_COLUMNS)[number];

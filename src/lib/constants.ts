// Matches v-1's `lifestage` values so data lines up across both apps.
export const LIFESTAGE_OPTIONS = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
] as const;

// Matches v-1's raw worship service values.
export const SERVICE_OPTIONS = [
  "9AM - Mandurriao",
  "11AM - Mandurriao",
  "2PM - Mandurriao",
  "4PM - Mandurriao",
  "6PM - Mandurriao",
  "10AM - Lapaz",
  "1PM - Lapaz",
] as const;

export const DEFAULT_STATUS = "Registered";

export const SOURCE_LABELS: Record<string, string> = {
  manual: "Added by staff",
  csv: "CSV import",
  public: "Public link",
  walk_in: "Walk-in",
};

export const MOBILE_NUMBER_PATTERN = String.raw`(09\d{9})|(\+639\d{9})|(639\d{9})`;
export const MOBILE_NUMBER_REGEX = /^(09\d{9}|\+639\d{9}|639\d{9})$/;
export const MOBILE_NUMBER_HELP = "Enter a valid mobile number: 09XXXXXXXXX, 639XXXXXXXXX, or +639XXXXXXXXX.";

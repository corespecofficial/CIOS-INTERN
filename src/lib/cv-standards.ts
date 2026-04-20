// Regional CV conventions and template catalogue.
// Sources: Europass spec, US Department of Labor guidance, Prospects.ac.uk (UK),
// Nigerian Industrial Training Fund / NYSC templates, Japan's Rirekisho JIS standard.

export type RegionId =
  | "us"           // American — no photo, no DOB, achievements-focused
  | "uk"           // British — no photo, personal statement, 2 pages
  | "europass"     // Pan-European — structured, CEFR languages, photo optional
  | "germany"      // German (Lebenslauf) — photo, DOB, strict chronology
  | "nigeria"      // Nigerian — photo, DOB, state of origin, NYSC, referees
  | "african-gen"  // Pan-African — photo, DOB, referees, flexible
  | "ats";         // ATS International — zero personal data, keyword-rich

export interface RegionSpec {
  id: RegionId;
  flag: string;
  label: string;
  tagline: string;
  summary: string;

  // Identity fields
  photo: "required" | "recommended" | "optional" | "forbidden";
  includesDob: boolean;
  includesMaritalStatus: boolean;
  includesNationality: boolean;
  includesStateOfOrigin: boolean;   // Nigerian-specific
  includesReligion: boolean;
  includesGender: boolean;

  // Content fields
  requiresReferees: boolean;        // referees mandatory (NG, some EU)
  refereesMin: number;
  requiresNysc: boolean;            // Nigeria only
  allowsInterests: boolean;         // UK/European welcome; US frowns on
  requiresCefrLanguages: boolean;   // Europass
  requiresPersonalStatement: boolean;// UK style
  includesPrimaryEducation: boolean;// NG keeps primary; US/UK usually drop
  includesSecondaryEducation: boolean;

  // Layout
  maxPages: number;
  dateFormat: "MM/YYYY" | "Month YYYY";

  // Anti-discrimination flags to surface to the user
  warnings: string[];
}

export const REGIONS: RegionSpec[] = [
  {
    id: "us",
    flag: "🇺🇸",
    label: "American (United States)",
    tagline: "Achievement-focused · no personal data",
    summary: "One page for <10 years experience, two max. Quantified results. No photo, no DOB, no marital status — anti-discrimination rules discourage them.",
    photo: "forbidden",
    includesDob: false,
    includesMaritalStatus: false,
    includesNationality: false,
    includesStateOfOrigin: false,
    includesReligion: false,
    includesGender: false,
    requiresReferees: false,
    refereesMin: 0,
    requiresNysc: false,
    allowsInterests: false,
    requiresCefrLanguages: false,
    requiresPersonalStatement: false,
    includesPrimaryEducation: false,
    includesSecondaryEducation: false,
    maxPages: 2,
    dateFormat: "Month YYYY",
    warnings: [
      "Never include a photo, date of birth, marital status or religion — they trigger anti-discrimination concerns.",
      "Drop the 'References available on request' line. Recruiters expect that by default.",
      "Use strong action verbs (Led, Shipped, Increased) and quantify results wherever possible.",
    ],
  },
  {
    id: "uk",
    flag: "🇬🇧",
    label: "British (United Kingdom)",
    tagline: "Personal statement · 2 pages",
    summary: "Opens with a short personal statement. Two pages max. Interests and hobbies welcome. References line ('Available on request') is conventional.",
    photo: "forbidden",
    includesDob: false,
    includesMaritalStatus: false,
    includesNationality: false,
    includesStateOfOrigin: false,
    includesReligion: false,
    includesGender: false,
    requiresReferees: false,
    refereesMin: 0,
    requiresNysc: false,
    allowsInterests: true,
    requiresCefrLanguages: false,
    requiresPersonalStatement: true,
    includesPrimaryEducation: false,
    includesSecondaryEducation: true,
    maxPages: 2,
    dateFormat: "Month YYYY",
    warnings: [
      "Include a short personal statement (2–3 sentences) at the top.",
      "Photos are unusual and can be seen as unprofessional.",
      "A hobbies / interests section is welcome, especially for grads.",
    ],
  },
  {
    id: "europass",
    flag: "🇪🇺",
    label: "European (Europass)",
    tagline: "Structured · CEFR languages",
    summary: "The EU's portable standard. Structured sections, explicit CEFR language levels (A1–C2), photo optional. Expect 2–3 pages.",
    photo: "optional",
    includesDob: true,
    includesMaritalStatus: false,
    includesNationality: true,
    includesStateOfOrigin: false,
    includesReligion: false,
    includesGender: false,
    requiresReferees: false,
    refereesMin: 0,
    requiresNysc: false,
    allowsInterests: true,
    requiresCefrLanguages: true,
    requiresPersonalStatement: false,
    includesPrimaryEducation: false,
    includesSecondaryEducation: true,
    maxPages: 3,
    dateFormat: "Month YYYY",
    warnings: [
      "Rate every language you list using CEFR levels (A1 beginner → C2 native).",
      "Photo is optional — Germany leans yes, UK/Ireland leans no even within EU.",
      "Structured Europass templates are free from europass.europa.eu.",
    ],
  },
  {
    id: "germany",
    flag: "🇩🇪",
    label: "German (Lebenslauf)",
    tagline: "Photo · DOB · strict chronology",
    summary: "The Lebenslauf is strictly chronological (oldest → newest). Photo top-right is conventional. Include DOB and place of birth. Sign + date at the end.",
    photo: "required",
    includesDob: true,
    includesMaritalStatus: true,
    includesNationality: true,
    includesStateOfOrigin: false,
    includesReligion: false,
    includesGender: false,
    requiresReferees: false,
    refereesMin: 0,
    requiresNysc: false,
    allowsInterests: true,
    requiresCefrLanguages: true,
    requiresPersonalStatement: false,
    includesPrimaryEducation: false,
    includesSecondaryEducation: true,
    maxPages: 2,
    dateFormat: "MM/YYYY",
    warnings: [
      "A professional headshot top-right is standard — informal photos are frowned on.",
      "List experience and education in chronological order (oldest first).",
      "Sign and date the final page.",
    ],
  },
  {
    id: "nigeria",
    flag: "🇳🇬",
    label: "Nigerian",
    tagline: "Photo · NYSC · referees (2–3)",
    summary: "Passport photo top-right. Include DOB, state of origin, LGA, NYSC status. Include secondary and primary school. Two to three referees with contacts.",
    photo: "recommended",
    includesDob: true,
    includesMaritalStatus: true,
    includesNationality: true,
    includesStateOfOrigin: true,
    includesReligion: false,
    includesGender: true,
    requiresReferees: true,
    refereesMin: 2,
    requiresNysc: true,
    allowsInterests: true,
    requiresCefrLanguages: false,
    requiresPersonalStatement: false,
    includesPrimaryEducation: true,
    includesSecondaryEducation: true,
    maxPages: 3,
    dateFormat: "Month YYYY",
    warnings: [
      "Include your NYSC status and discharge date (or exemption) if applicable.",
      "List at least two referees with phone and email — recruiters expect it.",
      "Keep the photo professional — plain background, formal attire.",
    ],
  },
  {
    id: "african-gen",
    flag: "🌍",
    label: "Pan-African general",
    tagline: "Flexible · referees welcome",
    summary: "A balanced African convention that works across Ghana, Kenya, South Africa, Ethiopia and most other national markets. Photo optional, referees welcome.",
    photo: "optional",
    includesDob: true,
    includesMaritalStatus: false,
    includesNationality: true,
    includesStateOfOrigin: false,
    includesReligion: false,
    includesGender: false,
    requiresReferees: false,
    refereesMin: 0,
    requiresNysc: false,
    allowsInterests: true,
    requiresCefrLanguages: false,
    requiresPersonalStatement: false,
    includesPrimaryEducation: false,
    includesSecondaryEducation: true,
    maxPages: 2,
    dateFormat: "Month YYYY",
    warnings: [
      "Photos are common but optional — when in doubt, leave it out for international roles.",
      "Include 2 referees if the role is academic, government, or large corporate.",
    ],
  },
  {
    id: "ats",
    flag: "🤖",
    label: "ATS International",
    tagline: "Keyword-rich · single column",
    summary: "Optimised for Applicant Tracking Systems (Greenhouse, Lever, Workday). Plain text, standard section headings, keywords pulled from the job description. No photo, no tables.",
    photo: "forbidden",
    includesDob: false,
    includesMaritalStatus: false,
    includesNationality: false,
    includesStateOfOrigin: false,
    includesReligion: false,
    includesGender: false,
    requiresReferees: false,
    refereesMin: 0,
    requiresNysc: false,
    allowsInterests: false,
    requiresCefrLanguages: false,
    requiresPersonalStatement: false,
    includesPrimaryEducation: false,
    includesSecondaryEducation: false,
    maxPages: 1,
    dateFormat: "Month YYYY",
    warnings: [
      "Use standard section headings (Summary, Experience, Education, Skills).",
      "Mirror keywords from the job description — ATS parsers look for exact matches.",
      "No tables, no icons, no multi-column layouts — parsers mangle them.",
    ],
  },
];

export function getRegion(id: string): RegionSpec | undefined {
  return REGIONS.find((r) => r.id === id);
}

/* ─────────── Templates ─────────── */

export type TemplateId = "standard" | "professional" | "minimalist" | "creative";

export interface TemplateSpec {
  id: TemplateId;
  label: string;
  blurb: string;
  emoji: string;
  /** Supported statuses for this first release. */
  status: "live" | "soon";
}

export const TEMPLATES: TemplateSpec[] = [
  { id: "standard",     label: "Standard",     blurb: "ATS-safe one-column layout. Safe default for every region.", emoji: "📄", status: "live" },
  { id: "professional", label: "Professional", blurb: "Two-column classic with a dark rail. Best for corporate roles.", emoji: "💼", status: "live" },
  { id: "minimalist",   label: "Minimalist",   blurb: "Lots of whitespace, single accent, sans-serif. Designer-friendly.", emoji: "✨", status: "soon" },
  { id: "creative",     label: "Creative",     blurb: "Colour blocks and bold headers. For design, marketing and media.", emoji: "🎨", status: "soon" },
];

export function getTemplate(id: string): TemplateSpec | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

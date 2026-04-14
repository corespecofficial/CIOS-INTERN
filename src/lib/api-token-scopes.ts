// Shared constant — kept OUT of "use server" files so it can be imported
// by client components as a real array (not a server-action reference).
export const API_SCOPES = [
  "read:users",
  "read:opportunities",
  "write:opportunities",
  "read:talent",
  "send:messages",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

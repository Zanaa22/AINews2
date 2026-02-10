export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  adminSecret: process.env.ADMIN_SECRET ?? "",
  ingestionMaxItems: Number(process.env.INGESTION_MAX_ITEMS ?? "60"),
};

export function hasOpenAiKey(): boolean {
  return Boolean(env.openAiApiKey && env.openAiApiKey.trim().length > 0);
}

export function hasAdminSecret(): boolean {
  return Boolean(env.adminSecret && env.adminSecret.trim().length >= 8);
}

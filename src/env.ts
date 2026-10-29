function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get OPENROUTER_API_KEY() {
    return required("OPENROUTER_API_KEY");
  },
  get OPENROUTER_MODEL() {
    const model = process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct:free";
    if (!/^[\w.-]+\/[\w.-]+:free$/.test(model)) {
      throw new Error(`OPENROUTER_MODEL must be an OpenRouter free model ending in ":free", got "${model}"`);
    }
    return model;
  },
};

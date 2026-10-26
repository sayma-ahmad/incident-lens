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
};

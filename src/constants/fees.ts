export const feeModes = ["low", "medium", "high"] as const;

export type FeeMode = (typeof feeModes)[number];

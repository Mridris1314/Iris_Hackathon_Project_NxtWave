export type Mode = "scene" | "text" | "object";

export const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "scene", label: "Describe scene", hint: "What is in front of me" },
  { id: "text", label: "Read text", hint: "Read a label, sign, or page" },
  { id: "object", label: "Identify", hint: "Money, products, objects" },
];

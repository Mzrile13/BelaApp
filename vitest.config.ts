import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Isti "@/*" alias kao tsconfig.json, da testovi mogu uvoziti module koji ga
  // koriste interno (npr. lib/supabase.ts -> @/lib/scoring).
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

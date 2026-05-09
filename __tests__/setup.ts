import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL only auto-registers afterEach(cleanup) when vitest `globals: true` is on.
// We keep globals off, so register cleanup ourselves to avoid DOM accumulation.
afterEach(() => {
  cleanup();
});

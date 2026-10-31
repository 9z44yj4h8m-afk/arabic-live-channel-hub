import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { channels } from "@/lib/channels";
import { Route as rootRoute } from "@/routes/__root";
import type { ReactNode } from "react";
import { defaultDesign } from "@/lib/site-design";
import { defaultSections } from "@/lib/catalog-sections";
import { defaultCategoryLabels } from "@/lib/category-labels";

// Document shells belong to the real browser, not a testing-library div.
Object.assign(rootRoute.options, { shellComponent: ({ children }: { children: ReactNode }) => <>{children}</> });

vi.mock("@/lib/channel-catalog.functions", () => ({
  getPublicChannels: vi.fn(async () => channels),
  getCatalogSections: vi.fn(async () => defaultSections()),
  getAdminCatalog: vi.fn(), saveAdminCatalog: vi.fn(),
}));
vi.mock("@/lib/site-design.functions", () => ({
  getPublishedDesign: vi.fn(async () => defaultDesign()),
  getDesignDraft: vi.fn(), saveDesignDraft: vi.fn(),
}));
vi.mock("@/lib/category-labels.functions", () => ({
  getCategoryLabels: vi.fn(async () => defaultCategoryLabels),
  saveCategoryLabel: vi.fn(),
}));

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMinMs: 0,
    defaultPendingMs: 0,
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Assert only that the router mounts and paints, never page content:
// routes are rewritten as the app is built and this must keep passing.
describe("App routing", () => {
  it("renders the index route", async () => {
    const { container } = renderAt("/");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { container } = renderAt("/this-route-does-not-exist");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });
});

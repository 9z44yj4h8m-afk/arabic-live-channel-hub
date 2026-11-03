import { queryOptions } from "@tanstack/react-query";
import { getCatalogSections } from "./channel-catalog.functions";
export const catalogSectionsQuery = queryOptions({ queryKey: ["catalog-sections"], queryFn: () => getCatalogSections(), staleTime: 600_000, refetchOnWindowFocus: false });
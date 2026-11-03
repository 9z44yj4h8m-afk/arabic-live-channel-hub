import { queryOptions } from "@tanstack/react-query";
import { getCategoryLabels } from "./category-labels.functions";
export const categoryLabelsQuery = queryOptions({ queryKey: ["category-labels"], queryFn: () => getCategoryLabels(), staleTime: 600_000, refetchOnWindowFocus: false });

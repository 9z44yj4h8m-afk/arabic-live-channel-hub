import { queryOptions } from "@tanstack/react-query";
import { getCategoryLabels } from "./category-labels.functions";
export const categoryLabelsQuery = queryOptions({ queryKey: ["category-labels"], queryFn: () => getCategoryLabels(), staleTime: 15_000, refetchInterval: 30_000 });

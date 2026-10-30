import { queryOptions } from "@tanstack/react-query";
import { getPublishedDesign } from "./site-design.functions";
export const publishedDesignQuery = queryOptions({ queryKey: ["published-design"], queryFn: () => getPublishedDesign(), staleTime: 30_000, refetchInterval: 60_000 });
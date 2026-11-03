import { queryOptions } from "@tanstack/react-query";
import { getPublishedDesign } from "./site-design.functions";
export const publishedDesignQuery = queryOptions({ queryKey: ["published-design"], queryFn: () => getPublishedDesign(), staleTime: 600_000, refetchOnWindowFocus: false });
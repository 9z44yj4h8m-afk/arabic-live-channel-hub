import { queryOptions } from "@tanstack/react-query";
import { getPublicChannels } from "./channel-catalog.functions";
export const publicChannelsQuery = queryOptions({ queryKey: ["public-channels"], queryFn: () => getPublicChannels(), staleTime: 30_000, refetchInterval: 60_000 });
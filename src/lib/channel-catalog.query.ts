import { queryOptions } from "@tanstack/react-query";
import { getPublicChannels } from "./channel-catalog.functions";
export const publicChannelsQuery = queryOptions({ queryKey: ["public-channels"], queryFn: () => getPublicChannels(), staleTime: 600_000, refetchOnWindowFocus: false });
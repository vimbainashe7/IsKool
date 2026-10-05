import { z } from "zod"
export const searchResultsSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    group: z.string(),
    href: z.string(),
  })
)
export type SearchResult = z.infer<typeof searchResultsSchema>[number]

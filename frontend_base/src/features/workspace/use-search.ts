"use client"
import { useEffect, useState } from "react"
import { searchResultsSchema, type SearchResult } from "./search"
export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState("")
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([])
        setStatus("")
        return
      }
      setStatus("Searching…")
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal, cache: "no-store" }
        )
        if (!response.ok) throw new Error()
        setResults(searchResultsSchema.parse(await response.json()))
        setStatus("")
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setStatus("Search could not be completed. Try again.")
        }
      }
    }, 250)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])
  return { results, status }
}

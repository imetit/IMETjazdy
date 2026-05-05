'use client'

import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: 'include' })
  if (!r.ok) throw new Error(`Fetch ${url} failed: ${r.status}`)
  return r.json()
}

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        focusThrottleInterval: 30000,
        errorRetryCount: 2,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  )
}

"use client";

import { MiniPlayer } from "@/components/MiniPlayer";
import { PlayerProvider } from "@/components/PlayerProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // In prod, avoid refetching data that was fetched moments ago
            // (e.g. on every remount); in dev, keep the default of 0 so
            // changes are always visible immediately.
            staleTime: process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        {children}
        <MiniPlayer />
      </PlayerProvider>
    </QueryClientProvider>
  );
}

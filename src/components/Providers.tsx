"use client";

import { OfflineProvider } from "@/components/offline/OfflineProvider";
import { RegisterServiceWorker } from "@/components/offline/RegisterServiceWorker";
import { PlayerBar } from "@/components/PlayerBar";
import { PlayerProvider } from "@/components/PlayerProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
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
      <RegisterServiceWorker />
      <ThemeProvider>
        <OfflineProvider>
          <PlayerProvider>
            {children}
            <PlayerBar />
          </PlayerProvider>
        </OfflineProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

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
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        {children}
        <MiniPlayer />
      </PlayerProvider>
    </QueryClientProvider>
  );
}

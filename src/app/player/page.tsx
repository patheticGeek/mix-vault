import { PlayerPageClient } from "@/app/player/PlayerPageClient";
import { APP_TITLE } from "@/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Player · ${APP_TITLE}`,
};

// A slug-free "now playing" view: it reflects the shared player's current
// track rather than loading one of its own (see PlayerPageClient).
export default function PlayerPage() {
  return <PlayerPageClient />;
}

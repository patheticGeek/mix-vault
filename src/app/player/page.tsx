import { PlayerPageClient } from "@/app/player/PlayerPageClient";
import { APP_TITLE } from "@/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Player · ${APP_TITLE}`,
};

// A slug-free "now playing" view: it reflects the shared player's current
// track and the queue it's playing through — both live entirely in the
// client-side PlayerProvider, so there's nothing to fetch here.
export default function PlayerPage() {
  return <PlayerPageClient />;
}

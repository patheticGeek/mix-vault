import { DownloadsClient } from "@/app/downloads/DownloadsClient";
import { APP_TITLE } from "@/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Downloads · ${APP_TITLE}`,
};

// Lists what's saved for offline playback. All of it lives in the browser
// (OPFS/IndexedDB) via the OfflineProvider, so there's nothing to fetch here.
export default function DownloadsPage() {
  return <DownloadsClient />;
}

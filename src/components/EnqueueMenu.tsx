"use client";

import { usePlayer, type PlayerTrack } from "@/components/PlayerProvider";
import { CornerUpRight, ListPlus } from "lucide-react";

interface EnqueueMenuProps {
  track: PlayerTrack;
  className?: string;
  showLabel?: boolean;
  // Which edge of the trigger the menu aligns to. "end" (right-aligned,
  // opening leftward) suits a right-aligned trigger like the list rows;
  // "start" opens rightward and is right for a left-aligned trigger like the
  // track page, where "end" would run off the left of the screen.
  align?: "start" | "end";
}

// Small "add this track to the queue" control used on the homepage list and
// the track page. Offers "Play next" (insert after the current track) and
// "Add to queue" (append), both routed through the shared player.
export function EnqueueMenu({ track, className = "", showLabel = false, align = "end" }: EnqueueMenuProps) {
  const { playNext, addToQueue } = usePlayer();

  // Close the DaisyUI dropdown after picking, which stays open until focus
  // leaves it.
  function closeMenu() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  return (
    <div className={`dropdown ${align === "end" ? "dropdown-end" : ""} ${className}`}>
      <button
        type="button"
        tabIndex={0}
        aria-label="Add to queue"
        title="Add to queue"
        className="btn btn-ghost btn-xs gap-1"
      >
        <ListPlus className="w-4 h-4" />
        {showLabel && <span>Queue</span>}
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu menu-sm bg-base-200 rounded-box z-20 w-40 p-1 shadow-lg border border-base-content/10"
      >
        <li>
          <button
            type="button"
            onClick={() => {
              playNext(track);
              closeMenu();
            }}
          >
            <CornerUpRight className="w-4 h-4" />
            Play next
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              addToQueue(track);
              closeMenu();
            }}
          >
            <ListPlus className="w-4 h-4" />
            Add to queue
          </button>
        </li>
      </ul>
    </div>
  );
}

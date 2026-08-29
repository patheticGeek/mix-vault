"use client";

import { Check, Palette } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

// Site-wide theme (née "skin") picker, lifted into the navbar so it applies
// to the whole app via ThemeProvider rather than just a player widget.
export function ThemeSwitcher() {
  const { skinId, skins, setSkinId } = useTheme();

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        aria-label="Change theme"
        title="Theme"
        className="btn btn-ghost btn-square normal-case"
      >
        <Palette className="w-5 h-5" />
      </button>
      <ul className="dropdown-content menu z-10 mt-2 w-48 rounded-box bg-base-200 p-2 shadow-lg">
        {skins.map((s) => {
          const isActive = s.id === skinId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={(e) => {
                  setSkinId(s.id);
                  e.currentTarget.blur();
                }}
                className={isActive ? "active" : ""}
              >
                {s.name}
                {isActive && <Check className="w-3.5 h-3.5" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

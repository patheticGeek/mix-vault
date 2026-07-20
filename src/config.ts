import type { ComponentType } from "react";

export const APP_TITLE = "Mix Vault";
export const APP_DESC = "A minimal creative vault inspired by modern audio platforms: calm, dark, and focused.";

export interface SocialMediaLink {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

// Shown under the hero description on the homepage. Lucide (used everywhere
// else in the app) doesn't ship brand marks, so pull icons from
// @icons-pack/react-simple-icons instead — e.g.:
//
//   import { SiInstagram, SiSoundcloud } from "@icons-pack/react-simple-icons";
//
//   export const SOCIAL_MEDIA: SocialMediaLink[] = [
//     { label: "SoundCloud", href: "https://soundcloud.com/your-handle", icon: SiSoundcloud },
//     { label: "Instagram", href: "https://instagram.com/your-handle", icon: SiInstagram },
//   ];
//
// The row is hidden on the homepage when this is empty.
export const SOCIAL_MEDIA: SocialMediaLink[] = [];

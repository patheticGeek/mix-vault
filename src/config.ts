import { SiInstagram, SiSoundcloud } from "@icons-pack/react-simple-icons";
import type { ComponentType } from "react";

export const APP_TITLE = "Pathetic's Vault";
export const APP_DESC = "A dump of my mixes for everyone to enjoy in HQ :)";

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
export const SOCIAL_MEDIA: SocialMediaLink[] = [
  {
    label: "SoundCloud",
    href: "https://soundcloud.com/pathetic_geek",
    icon: SiSoundcloud,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/geekpathetic",
    icon: SiInstagram,
  },
];

import type { TrackLinkKey } from "@/lib/trackLinks";
import {
  SiInstagram,
  SiSoundcloud,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import type { ComponentType } from "react";

export const APP_TITLE = "Pathetic's Mix Vault";
export const APP_DESC =
  "A collection of my mixes for everyone to enjoy in HQ :)";

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
  {
    label: "YouTube",
    href: "https://www.youtube.com/@geekpathetic",
    icon: SiYoutube,
  },
];

// Icon + display label for each per-track link (see TRACK_LINK_KEYS in
// @/lib/trackLinks). Extending which platforms a track can link to means
// adding a key there and an entry here.
export const TRACK_LINK_ICONS: Record<
  TrackLinkKey,
  ComponentType<{ className?: string }>
> = {
  soundcloud: SiSoundcloud,
  youtube: SiYoutube,
};

export const TRACK_LINK_LABELS: Record<TrackLinkKey, string> = {
  soundcloud: "SoundCloud",
  youtube: "YouTube",
};

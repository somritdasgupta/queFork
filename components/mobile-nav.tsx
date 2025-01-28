"use client";

import SidePanel from "./side-panel";
import type { SidePanelProps } from "@/types";

export function MobileNav(props: SidePanelProps): JSX.Element {
  return <SidePanel {...props} isMobile />;
}

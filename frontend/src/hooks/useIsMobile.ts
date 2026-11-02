import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 639px)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);

  media.addEventListener("change", callback);

  return () => media.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

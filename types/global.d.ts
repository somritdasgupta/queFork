import { SavedRequest } from "./";

declare global {
  interface Window {
    __ACTIVE_REQUEST__: Partial<SavedRequest> | null;
  }
}

export {};

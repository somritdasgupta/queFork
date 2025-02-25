export type NavigableElementType = "key-value-pair" | "button" | "input";

export interface NavigableElement {
  id: string;
  ref: HTMLElement;
  type: NavigableElementType;
  groupId: string;
  parentId: string;
}

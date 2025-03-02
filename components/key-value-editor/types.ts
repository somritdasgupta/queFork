import { KeyValuePair } from "@/types";

export interface EditorBaseProps {
  disabled?: boolean;
  className?: string;
}

export interface ActionButtonProps extends EditorBaseProps {
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  variant?: "clear" | "delete" | "default";
}

export interface InputProps extends EditorBaseProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  immediate?: boolean;
}

export interface PairRendererProps {
  pair: KeyValuePair;
  index: number;
}

export type UpdatePairFunction = (
  index: number,
  field: keyof KeyValuePair,
  value: string | boolean
) => void;

export interface SortablePair extends Omit<KeyValuePair, "source"> {
  id: string;
  source?: {
    tab: "auth" | "body";
    type?: string;
  };
}
export type { KeyValuePair };

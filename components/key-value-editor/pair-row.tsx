import React, { useCallback } from "react";
import { KeyValuePair } from "@/types";
import { KeyValueInput } from "./key-value-input";
import { ActionButton } from "./ui-components";
import { Key, Type, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { STYLES } from "./constants";
import { NavigableElement } from "../keyboard-navigation/keyboard-navigation";
import { SortablePair } from "./types";

interface PairRowProps {
  pair: SortablePair; // Use the new type that guarantees id
  index: number;
  showDescription?: boolean;
  updatePair: (index: number, field: keyof KeyValuePair, value: string) => void;
  navigableElements: React.RefObject<NavigableElement[]>;
  setFocus: (id: string) => void;
  onPaste: (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
    field: "key" | "value"
  ) => void;
}

export const PairRow = React.memo(
  function PairRow({
    pair,
    index,
    showDescription,
    updatePair,
    navigableElements,
    setFocus,
    onPaste,
  }: PairRowProps) {
    const handleKeyChange = useCallback(
      (value: string) => {
        updatePair(index, "key", value);
      },
      [index, updatePair]
    );

    const handleValueChange = useCallback(
      (value: string) => {
        updatePair(index, "value", value);
      },
      [index, updatePair]
    );

    const handleDescriptionChange = useCallback(
      (value: string) => {
        updatePair(index, "description", value);
      },
      [index, updatePair]
    );

    return (
      <div
        className={cn(
          "grid gap-[1px] flex-1",
          showDescription
            ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
            : "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
          !pair.enabled && "opacity-50"
        )}
      >
        <KeyValueInput
          value={pair.key}
          onChange={handleKeyChange}
          placeholder="Key"
          icon={Key}
          onPaste={(e) => onPaste(e, index, "key")}
          className={STYLES.input.base}
          pairId={pair.id}
          navigableElements={navigableElements}
          setFocus={setFocus}
          disabled={!!pair.source}
        />
        <KeyValueInput
          value={pair.value}
          onChange={handleValueChange}
          placeholder="Value"
          icon={Type}
          onPaste={(e) => onPaste(e, index, "value")}
          className={STYLES.input.base}
          pairId={pair.id}
          isValue
          navigableElements={navigableElements}
          setFocus={setFocus}
          disabled={!!pair.source}
        />
        {showDescription && (
          <KeyValueInput
            value={pair.description || ""}
            onChange={handleDescriptionChange}
            placeholder="Description"
            icon={AlignLeft}
            className={STYLES.input.base}
            pairId={pair.id}
            navigableElements={navigableElements}
            setFocus={setFocus}
            disabled={!!pair.source}
          />
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.pair.id === next.pair.id &&
      prev.pair.key === next.pair.key &&
      prev.pair.value === next.pair.value &&
      prev.pair.description === next.pair.description &&
      prev.index === next.index &&
      prev.showDescription === next.showDescription
    );
  }
);

import React, { useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NavigableElement,
  NavigableElementType,
} from "../keyboard-navigation/keyboard-navigation";
import { STYLES } from "./constants";
import { useDebouncedEffect } from "@/hooks/use-debounced-effect";

interface KeyValueInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ElementType;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  className?: string;
  pairId: string;
  isValue?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  navigableElements: React.RefObject<NavigableElement[]>;
  setFocus: (id: string) => void;
  disabled?: boolean;
  onFocus?: () => void; // Add this line
  onBlur?: () => void; // Add this line
}

export const KeyValueInput = React.memo(function KeyValueInput({
  value,
  onChange,
  placeholder,
  icon: Icon,
  onPaste,
  className,
  pairId,
  isValue,
  onKeyDown,
  navigableElements,
  disabled,
  onFocus, // Add this line
  onBlur, // Add this line
}: KeyValueInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stableId = useRef(`${pairId}-${isValue ? "value" : "key"}`);
  const inputId = stableId.current;

  // Simplified change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const selection = e.target.selectionStart;
    onChange(newValue);

    // Restore cursor position on next tick
    requestAnimationFrame(() => {
      if (inputRef.current && document.activeElement === inputRef.current) {
        inputRef.current.setSelectionRange(selection, selection);
      }
    });
  };

  // Fixed registration to avoid modifying current directly
  useEffect(() => {
    if (!inputRef.current || !navigableElements.current) return;

    const element = {
      id: inputId,
      ref: inputRef.current,
      type: "key-value-pair" as const,
      groupId: pairId,
      parentId: isValue ? `value-${pairId}` : `key-${pairId}`,
    };

    // Add the element
    const elements = navigableElements.current;
    elements.push(element);

    return () => {
      // Clean up by filtering and creating new array
      if (navigableElements.current) {
        const filtered = navigableElements.current.filter(
          (e) => e.id !== inputId
        );
        // Replace the entire array instead of modifying current
        navigableElements.current.length = 0;
        navigableElements.current.push(...filtered);
      }
    };
  }, [inputId, pairId, isValue, navigableElements]);

  return (
    <div className="relative">
      <Icon className="absolute left-2.5 top-2 h-4 w-4 text-slate-500 block" />
      {disabled && (
        <Lock className="absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
      )}
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onPaste={onPaste}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          STYLES.input.base,
          "pl-9 sm:pl-9",
          disabled && "pr-9",
          className
        )}
        inputMode="text"
        data-lpignore="true"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        onKeyDown={onKeyDown}
        onFocus={onFocus} // Add this line
        onBlur={onBlur} // Add this line
      />
    </div>
  );
});

KeyValueInput.displayName = "KeyValueInput";

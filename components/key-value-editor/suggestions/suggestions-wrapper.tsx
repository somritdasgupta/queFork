import React, { useRef, useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverPortal,
} from "@radix-ui/react-popover";
import { KeyValueInput } from "../key-value-input";

interface SuggestionsWrapperProps {
  value: string;
  onChange: (value: string) => void;
  renderSuggestions: (
    value: string,
    onSelect: (value: string) => void
  ) => React.ReactNode;
  inputProps: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestionsWrapper({
  value,
  onChange,
  renderSuggestions,
  inputProps,
  isOpen,
  onOpenChange,
}: SuggestionsWrapperProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const [isBlurring, setIsBlurring] = useState(false);

  return (
    <div className="relative flex-1" ref={inputRef}>
      <Popover open={isOpen}>
        <PopoverTrigger asChild>
          <div>
            <KeyValueInput
              {...inputProps}
              value={value}
              onChange={(newValue) => {
                onChange(newValue);
                onOpenChange(true);
              }}
              onFocus={() => {
                setIsBlurring(false);
                onOpenChange(true);
              }}
              onBlur={() => {
                if (!isBlurring) {
                  setIsBlurring(true);
                  setTimeout(() => {
                    if (isBlurring) onOpenChange(false);
                  }, 200);
                }
              }}
            />
          </div>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={2}
            className="p-0 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-md shadow-lg z-50 w-[calc(100vw-1rem)] sm:w-auto"
            style={{
              minWidth: Math.max(
                200,
                inputRef.current?.getBoundingClientRect().width ?? 0
              ),
            }}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => {
              if (!inputRef.current?.contains(e.target as Node)) {
                onOpenChange(false);
              }
            }}
          >
            {renderSuggestions(value, (suggestion) => {
              setIsBlurring(false);
              onChange(suggestion);
              onOpenChange(false);
            })}
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </div>
  );
}

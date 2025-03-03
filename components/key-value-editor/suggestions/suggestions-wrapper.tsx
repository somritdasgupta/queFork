import React, { useRef, useState, useEffect } from "react";
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
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputFocus = () => {
    setIsBlurring(false);
    onOpenChange(true);
  };

  const handleInputBlur = () => {
    if (!isBlurring) {
      setIsBlurring(true);
      setTimeout(() => {
        if (isBlurring) onOpenChange(false);
      }, 200);
    }
  };

  return (
    <div className="relative flex-1" ref={inputRef}>
      <Popover open={isOpen}>
        <PopoverTrigger asChild>
          <div>
            <KeyValueInput
              {...inputProps}
              value={inputValue}
              onChange={(newValue) => {
                setInputValue(newValue);
                onChange(newValue);
                onOpenChange(true);
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={2}
            className="p-0 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-b-md shadow-lg z-50 sm:w-[calc(34vw-1.2rem)]"
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

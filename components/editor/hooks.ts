import React from "react";

export const useStableId = (prefix: string, id?: string) => {
  const generatedId = React.useRef(
    `${prefix}-${Math.random().toString(36).slice(2)}`
  );
  return id || generatedId.current;
};

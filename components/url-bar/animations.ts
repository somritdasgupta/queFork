export const pulseVariants = {
  idle: {
    opacity: [0.5, 1, 0.5],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: "easeInOut",
    },
  },
};

export const methodBadgeVariants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    },
  },
  exit: { opacity: 0, y: 10 },
};

export const loadingOverlayVariants = {
  hidden: { opacity: 0, x: "-100%" },
  visible: {
    opacity: 1,
    x: "100%",
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export const inputFocusAnimation = {
  scale: 1.002,
  transition: { duration: 0.2, ease: "easeInOut" },
};

export const neonTrailVariants = {
  animate: {
    pathLength: [0, 1],
    pathOffset: [0, 1],
    transition: {
      duration: 8,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

export const placeholderVariants = {
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.5 },
  },
  enter: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.5 },
  },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

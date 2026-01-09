import { Variants } from "framer-motion"

// Staggered children container - use for lists and grids
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

// Fade up animation - great for cards and list items
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// Fade in animation - subtle entrance
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
}

// Scale bounce for likes and interactive buttons
export const scaleBounce: Variants = {
  initial: { scale: 1 },
  tap: { scale: 0.9 },
  hover: { scale: 1.05 },
  liked: {
    scale: [1, 1.3, 1],
    transition: { duration: 0.4, times: [0, 0.3, 1] },
  },
}

// Notification pulse animation
export const pulse: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2 },
  },
}

// Page transition variants
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 },
  },
}

// Modal/dialog entrance
export const modalTransition: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
}

// Slide in from right - for panels/drawers
export const slideInRight: Variants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

// Card hover lift effect
export const cardHover: Variants = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -4,
    scale: 1.01,
    transition: { duration: 0.2, ease: "easeOut" },
  },
}

// Spring config for playful interactions
export const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
}

// Bouncy spring for extra playfulness
export const bouncySpring = {
  type: "spring",
  stiffness: 500,
  damping: 15,
}

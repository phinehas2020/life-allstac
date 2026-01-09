"use client"

import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion"
import { forwardRef } from "react"

// Re-export motion components for use throughout the app
export { motion, AnimatePresence }

// Re-export types
export type { HTMLMotionProps }

// Typed motion components for common elements
export const MotionDiv = motion.div
export const MotionButton = motion.button
export const MotionSpan = motion.span
export const MotionUl = motion.ul
export const MotionLi = motion.li
export const MotionNav = motion.nav
export const MotionHeader = motion.header
export const MotionSection = motion.section
export const MotionArticle = motion.article

// Forward ref motion components for use with Radix UI and other libraries
export const MotionDivForwardRef = forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>((props, ref) => <motion.div ref={ref} {...props} />)
MotionDivForwardRef.displayName = "MotionDivForwardRef"

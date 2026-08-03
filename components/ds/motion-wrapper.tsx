'use client'
import { motion, type HTMLMotionProps } from 'motion/react'

export function MotionDiv(props: HTMLMotionProps<'div'>) {
  return <motion.div {...props} />
}

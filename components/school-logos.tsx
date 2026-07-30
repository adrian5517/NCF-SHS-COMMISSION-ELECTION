'use client'

import { motion } from 'motion/react'

const Logo = ({ src, alt, className = '' }: { src: string; alt: string; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
    animate={{ opacity: 1, scale: 1, rotate: 0 }}
    whileHover={{ scale: 1.06, rotate: 2 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    className={`relative ${className}`}
  >
    <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-chart-1/40 to-chart-2/40 blur-xl" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} className="size-14 rounded-full object-contain drop-shadow-lg sm:size-16" />
  </motion.div>
)

// Displayed together: the two supervising/founding institutions behind the school.
export function SchoolLogos({ className = '', inline = false }: { className?: string; inline?: boolean }) {
  if (inline) {
    return (
      <>
        <Logo src="/ncf-logo.webp" alt="Naga College Foundation" />
        <div className="h-10 w-px bg-border" aria-hidden />
        <Logo src="/dlssa-logo.png" alt="Lasallian Schools Supervision Services Association" />
        <div className="h-10 w-px bg-border" aria-hidden />
        <Logo src="/ncf-shs.png" alt="Naga College Foundation - Senior High School" />
      </>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`flex items-center justify-center gap-4 ${className}`}
    >
      <Logo src="/ncf-logo.webp" alt="Naga College Foundation" />
      <div className="h-10 w-px bg-border" aria-hidden />
      <Logo src="/dlssa-logo.png" alt="Lasallian Schools Supervision Services Association" />
      <div className="h-10 w-px bg-border" aria-hidden />
      <Logo src="/ncf-shs.png" className="size-14 sm:size-16" alt="Naga College Foundation - Senior High School" />
    </motion.div>
  )
}

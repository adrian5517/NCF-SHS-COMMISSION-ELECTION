'use client'

import { motion } from 'motion/react'

const Logo = ({ src, alt, className = '', small = false }: { src: string; alt: string; className?: string; small?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
    animate={{ opacity: 1, scale: 1, rotate: 0 }}
    whileHover={{ scale: 1.06, rotate: 2 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    className={`relative ${className}`}
  >
    <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-chart-1/40 to-chart-2/40 blur-xl" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={src}
      alt={alt}
      className={`${small ? 'size-11 sm:size-14' : 'size-14 sm:size-16'} rounded-full object-contain drop-shadow-lg`}
    />
  </motion.div>
)

// Displayed together: the two supervising/founding institutions behind the school.
export function SchoolLogos({ className = '', inline = false }: { className?: string; inline?: boolean }) {
  if (inline) {
    return (
      <div className={`flex items-center justify-center gap-2 sm:gap-4 ${className}`}>
        <Logo src="/ncf-logo.webp" alt="Naga College Foundation" small />
        <div className="h-8 w-px bg-border" aria-hidden />
        <Logo src="/dlssa-logo.png" alt="Lasallian Schools Supervision Services Association" small />
        <div className="h-8 w-px bg-border" aria-hidden />
        <Logo src="/ncf_ssc.png" alt="NCF Supreme Student Council" small />
        <div className="h-8 w-px bg-border" aria-hidden />
        <Logo src="/ncf-shs-big.png" alt="Naga College Foundation - Senior High School" small />
      </div>
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
      <Logo src="/ncf_ssc.png" className="size-14 sm:size-16" alt="NCF Supreme Student Council" />
      <div className="h-10 w-px bg-border" aria-hidden />
      <Logo src="/ncf-shs-big.png" className="size-14 sm:size-16" alt="Naga College Foundation - Senior High School" />
    </motion.div>
  )
}

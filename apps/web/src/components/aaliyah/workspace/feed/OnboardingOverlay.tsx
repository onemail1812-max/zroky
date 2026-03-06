"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import OnboardingWizard from "@/components/aaliyah/forms/OnboardingWizard"

interface OnboardingOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export function OnboardingOverlay({ isOpen, onClose, onComplete }: OnboardingOverlayProps) {
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted || typeof document === 'undefined') return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="onboarding-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] backdrop-blur-sm flex items-center justify-center p-4 sm:p-12 pointer-events-auto"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-5xl flex items-center justify-center"
                    >
                        <OnboardingWizard onComplete={onComplete} />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}

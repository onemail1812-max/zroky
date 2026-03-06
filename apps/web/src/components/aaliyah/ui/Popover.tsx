"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface PopoverProps {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen

    const setOpen = React.useCallback((val: boolean) => {
        if (onOpenChange) onOpenChange(val)
        setUncontrolledOpen(val)
    }, [onOpenChange])

    return (
        <PopoverContext.Provider value={{ open, setOpen }}>
            {children}
        </PopoverContext.Provider>
    )
}

const PopoverContext = React.createContext<{
    open: boolean
    setOpen: (open: boolean) => void
} | null>(null)

function usePopover() {
    const context = React.useContext(PopoverContext)
    if (!context) throw new Error("Popover components must be wrapped in <Popover />")
    return context
}

export function PopoverTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
    const { setOpen, open } = usePopover()

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setOpen(!open)
    }

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: handleClick,
        })
    }

    return (
        <div onClick={handleClick}>
            {children}
        </div>
    )
}

interface PopoverContentProps {
    children: React.ReactNode
    className?: string
    align?: "start" | "center" | "end"
}

export function PopoverContent({ children, className, align = "center" }: PopoverContentProps) {
    const { open, setOpen } = usePopover()
    const ref = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (!open) return

        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open, setOpen])

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        ref={ref}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className={cn(
                            "absolute z-[100] mt-2 rounded-xl bg-white border border-borderSubtle shadow-2xl overflow-hidden",
                            align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2",
                            className
                        )}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

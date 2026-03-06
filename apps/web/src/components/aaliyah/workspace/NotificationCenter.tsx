import * as React from "react"
import { Bell, Check, Trash2, ShieldAlert, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/aaliyah/ui/Popover"
import { useSystemStore, AppNotification } from "@/lib/aaliyah/store"
import { cn } from "@/lib/utils"

export function NotificationCenter() {
    const { notifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications } = useSystemStore()
    const [open, setOpen] = React.useState(false)

    const unreadCount = notifications.filter(n => !n.isRead).length

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (newOpen) {
            // Optional: mark all as read automatically when opening, 
            // but for now we let users mark them individually or via clear all.
        }
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    aria-label={`Notifications (${unreadCount} unread)`}
                    aria-expanded={open}
                    aria-controls="notification-content"
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-borderSubtle bg-surface text-textSecondary hover:bg-surfaceElevated hover:text-textPrimary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                    <Bell className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={2} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-surface">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                id="notification-content"
                align="end"
                className="w-[380px] p-0 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-zinc-200/60 rounded-[1.5rem] overflow-hidden animate-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 bg-white/95 backdrop-blur-xl"
            >
                <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="flex items-center gap-2">
                        <h3 className="text-[14px] font-bold tracking-tight text-zinc-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-900 text-[10px] font-bold text-white uppercase tracking-wider">
                                {unreadCount} New
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllNotificationsRead}
                                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={() => {
                                    clearAllNotifications()
                                    setOpen(false)
                                }}
                                aria-label="Clear all notifications"
                                className="h-8 w-8 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 flex flex-col items-center gap-3">
                            <Bell className="h-8 w-8 opacity-20" />
                            <p className="text-[13px] font-medium">No system events yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-100">
                            {notifications.map((notif) => (
                                <NotificationItem
                                    key={notif.id}
                                    notification={notif}
                                    onRead={() => markNotificationRead(notif.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

function NotificationItem({ notification, onRead }: { notification: AppNotification, onRead: () => void }) {
    const isError = notification.type === "error"
    const isSuccess = notification.type === "success"
    const isWarning = notification.type === "warning"

    return (
        <div
            className={cn(
                "relative group flex gap-4 p-5 transition-all duration-300 border-b border-zinc-50",
                !notification.isRead ? "bg-white shadow-[inset_0_0_20px_rgba(37,99,235,0.02)]" : "bg-white opacity-70 hover:opacity-100 hover:bg-zinc-50/50"
            )}
        >
            {!notification.isRead && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 bg-zinc-900 rounded-r-full" />
            )}

            <div className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border shadow-sm transition-transform duration-300 group-hover:scale-105",
                isError ? "border-rose-200 bg-rose-50 text-rose-600" :
                    isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-600" :
                        isWarning ? "border-amber-200 bg-amber-50 text-amber-600" :
                            "border-zinc-200 bg-white text-zinc-900"
            )}>
                {isError ? <ShieldAlert className="h-4 w-4" /> :
                    isSuccess ? <CheckCircle className="h-4 w-4" /> :
                        isWarning ? <AlertTriangle className="h-4 w-4" /> :
                            <Bell className="h-4 w-4" />}
            </div>

            <div className="flex-1 min-w-0 pr-8">
                <p className={cn(
                    "text-[13.5px] leading-relaxed tracking-tight",
                    !notification.isRead ? "font-bold text-zinc-900" : "font-semibold text-zinc-600"
                )}>
                    {notification.message}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[10.5px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span>{new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-200" />
                    <span>{isError ? 'System Alert' : isSuccess ? 'Success' : 'Signal'}</span>
                </div>
            </div>

            {!notification.isRead && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRead()
                    }}
                    aria-label="Mark notification as read"
                    className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-8 w-8 rounded-xl bg-zinc-900 text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10"
                    title="Mark as read"
                >
                    <Check className="h-4 w-4" strokeWidth={3} />
                </button>
            )}
        </div>
    )
}

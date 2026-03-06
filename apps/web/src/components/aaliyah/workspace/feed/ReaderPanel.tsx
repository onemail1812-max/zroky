"use client"

import * as React from "react"
import { ThreadConversation } from "./ThreadConversation"
import { EmailMessage } from "@/services/inbox.service"

interface ReaderPanelProps {
    thread: EmailMessage
    messages: any[]
    isLoading: boolean
    activeEmailId: string | null
    onAttachmentClick: (att: any) => void
    onAction: (action: any) => void
    onEmailChat: (id: string) => void
}

export const ReaderPanel = React.memo(function ReaderPanel({
    thread,
    messages,
    isLoading,
    activeEmailId,
    onAttachmentClick,
    onAction,
    onEmailChat,
}: ReaderPanelProps) {
    return (
        <div className="flex-1 w-full relative flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <ThreadConversation
                thread={thread}
                messages={messages}
                isLoading={isLoading}
                emailId={activeEmailId}
                onAttachmentClick={onAttachmentClick}
                onAction={onAction}
                onEmailChat={onEmailChat}
            />
        </div>
    )
})

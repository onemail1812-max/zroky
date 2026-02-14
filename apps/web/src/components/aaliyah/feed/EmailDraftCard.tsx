
import * as React from "react"
import { Card, CardContent } from "@/components/aaliyah/ui/Card"
import { Button } from "@/components/aaliyah/ui/Button"
import { Edit2, Send, XCircle } from "lucide-react"

interface EmailDraftCardProps {
    to: string
    subject: string
    body: string
    onApprove: () => void
    onEdit: () => void
    onReject: () => void
}

export function EmailDraftCard({ to, subject, body, onApprove, onEdit, onReject }: EmailDraftCardProps) {
    return (
        <div className="pl-12 mb-6"> {/* Indented to nest under parent event */}
            <Card className="border-blue-100 bg-blue-50/30 overflow-hidden">
                {/* Header */}
                <div className="bg-blue-50/80 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Proposed Draft</span>
                    <span className="text-xs text-blue-600">Confidence: High</span>
                </div>

                {/* Email Content */}
                <CardContent className="p-4 space-y-3 bg-white">
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-sm">
                        <span className="text-slate-500 font-medium">To:</span>
                        <span className="text-slate-900">{to}</span>

                        <span className="text-slate-500 font-medium">Subject:</span>
                        <span className="text-slate-900 font-medium">{subject}</span>
                    </div>

                    <div className="mt-2 p-3 bg-slate-50 rounded border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap font-sans">
                        {body}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button onClick={onApprove} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-8 text-xs">
                            <Send className="h-3 w-3" /> Approve & Send
                        </Button>
                        <Button variant="outline" onClick={onEdit} className="gap-2 h-8 text-xs">
                            <Edit2 className="h-3 w-3" /> Edit
                        </Button>
                        <Button variant="ghost" onClick={onReject} className="text-slate-500 gap-2 h-8 text-xs hover:text-red-600">
                            <XCircle className="h-3 w-3" /> Reject
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

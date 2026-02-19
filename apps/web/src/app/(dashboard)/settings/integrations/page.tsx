"use client"

import * as React from "react"
import { useConnector, ConnectedAccount } from "@/services/connector.service"
import { Loader2, Mail, Calendar, AlertTriangle, CheckCircle, Plus, RefreshCw, Trash2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export default function IntegrationsPage() {
    const connector = useConnector()
    const [accounts, setAccounts] = React.useState<ConnectedAccount[]>([])
    const [loading, setLoading] = React.useState(true)
    const [actionLoading, setActionLoading] = React.useState<string | null>(null)

    const fetchAccounts = React.useCallback(async () => {
        try {
            const data = await connector.listAccounts()
            setAccounts(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [connector])

    React.useEffect(() => {
        fetchAccounts()
    }, [fetchAccounts])

    const handleConnect = async (provider: 'google' | 'microsoft') => {
        setActionLoading(`connect-${provider}`)
        try {
            await connector.connect({
                provider,
                serviceType: 'both', // Request both email and calendar
                redirectUri: `${window.location.origin}/oauth/callback`
            })
        } catch (err) {
            console.error(err)
            setActionLoading(null)
        }
    }

    const handleRevoke = async (id: string) => {
        if (!confirm("Are you sure you want to disconnect this account?")) return

        setActionLoading(`revoke-${id}`)
        try {
            await connector.revokeAccount(id)
            await fetchAccounts()
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-zinc-300" /></div>
    }

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Integrations</h1>
                <p className="text-zinc-500 mt-2">Manage your email and calendar connections.</p>
            </div>

            <div className="space-y-4">
                {accounts.map(account => (
                    <div key={account.id} className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-sm flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                                account.provider === 'google' ? "bg-blue-50 text-blue-600" : "bg-blue-900 text-white"
                            )}>
                                {account.provider === 'google' ? <Mail className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
                            </div>

                            <div>
                                <h3 className="font-bold text-lg text-zinc-900 flex items-center gap-2">
                                    {account.email}
                                    {account.status === 'expired' || account.status === 'revoked' || account.status === 'needs_reconnect' ? (
                                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">
                                            {account.status === 'needs_reconnect' ? "Needs Reconnect" : account.status === 'revoked' ? "Revoked" : "Expired"}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">Active</span>
                                    )}
                                </h3>
                                <div className="flex gap-4 mt-2 text-sm text-zinc-500 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        {account.hasEmailAccess ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-zinc-300" />}
                                        Email
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        {account.hasCalendarAccess ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-zinc-300" />}
                                        Calendar
                                    </span>
                                    <span className="text-zinc-400">• Last synced {account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleTimeString() : 'Never'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            {(account.status === 'expired' || account.status === 'revoked' || account.status === 'needs_reconnect') && (
                                <button
                                    onClick={() => handleConnect(account.provider)}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold shadow-sm hover:bg-red-700 transition-colors flex items-center gap-2 justify-center"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Reconnect
                                </button>
                            )}

                            <button
                                onClick={() => handleRevoke(account.id)}
                                disabled={!!actionLoading}
                                className="px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-zinc-50 hover:text-red-600 transition-colors flex items-center gap-2 justify-center"
                            >
                                {actionLoading === `revoke-${account.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Disconnect
                            </button>
                        </div>
                    </div>
                ))}

                {accounts.length === 0 && (
                    <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                        <div className="h-12 w-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                            <Mail className="h-6 w-6" />
                        </div>
                        <h3 className="text-zinc-900 font-bold">No accounts connected</h3>
                        <p className="text-zinc-500 text-sm mt-1">Connect an email account to get started.</p>
                    </div>
                )}
            </div>

            <div className="pt-8 border-t border-zinc-100">
                <h2 className="text-lg font-bold text-zinc-900 mb-4">Add Connection</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => handleConnect('google')}
                        disabled={!!actionLoading}
                        className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Mail className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-zinc-900">Google Workspace</span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium pl-11">Gmail & Calendar</p>
                    </button>

                    <button
                        onClick={() => handleConnect('microsoft')}
                        disabled={!!actionLoading}
                        className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-blue-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Mail className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-zinc-900">Microsoft Outlook</span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium pl-11">Outlook & Calendar (Graph)</p>
                    </button>
                </div>
            </div>
        </div>
    )
}

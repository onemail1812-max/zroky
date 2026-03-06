"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    children?: ReactNode;
    name: string;
    className?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class PanelErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`ErrorBoundary [${this.props.name}]:`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className={cn(
                    "flex flex-col items-center justify-center p-8 text-center h-full w-full bg-zinc-50/50 border border-dashed border-zinc-200 rounded-2xl",
                    this.props.className
                )}>
                    <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900 mb-1">
                        {this.props.name} failed to load
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-[200px] mb-4">
                        An unexpected error occurred while rendering this panel.
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium hover:bg-zinc-50 transition-colors shadow-sm"
                    >
                        <RefreshCcw className="h-3 w-3" />
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

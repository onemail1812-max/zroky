"use client"

import * as React from "react"

/**
 * Full-screen bounce-ball loading skeleton shown while checking onboarding status.
 */
export function WorkspaceLoader() {
    return (
        <div className="flex h-screen bg-white items-center justify-center font-sans select-none">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes ball-bounce {
                    0%, 100% { transform: translateY(0) scale(1); }
                    25% { transform: translateY(-32px) scale(0.92, 1.08); }
                    50% { transform: translateY(0) scale(1.12, 0.88); }
                    75% { transform: translateY(-12px) scale(0.96, 1.04); }
                }
                @keyframes shadow-scale {
                    0%, 100% { transform: scaleX(1); opacity: 0.25; }
                    25% { transform: scaleX(0.5); opacity: 0.08; }
                    50% { transform: scaleX(1.3); opacity: 0.35; }
                    75% { transform: scaleX(0.7); opacity: 0.12; }
                }
                @keyframes container-fade {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .zk-loader { animation: container-fade 0.4s ease-out forwards; }
                .zk-ball {
                    width: 16px; height: 16px;
                    background: #18181b;
                    border-radius: 50%;
                    animation: ball-bounce 1.2s ease-in-out infinite;
                }
                .zk-ball:nth-child(2) { animation-delay: 0.12s; }
                .zk-ball:nth-child(3) { animation-delay: 0.24s; }
                .zk-shadow {
                    width: 16px; height: 4px;
                    border-radius: 50%;
                    background: radial-gradient(ellipse, rgba(0,0,0,0.2), transparent 70%);
                    animation: shadow-scale 1.2s ease-in-out infinite;
                }
                .zk-shadow:nth-child(2) { animation-delay: 0.12s; }
                .zk-shadow:nth-child(3) { animation-delay: 0.24s; }
            `}} />
            <div className="zk-loader flex flex-col items-center">
                <div className="flex gap-3">
                    <div className="zk-ball" />
                    <div className="zk-ball" />
                    <div className="zk-ball" />
                </div>
                <div className="flex gap-3 mt-2">
                    <div className="zk-shadow" />
                    <div className="zk-shadow" />
                    <div className="zk-shadow" />
                </div>
            </div>
        </div>
    )
}


"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Slot {
    start: string;
    end: string;
    duration: number;
}

interface BookingDetails {
    slug: string;
    subject: string;
    recipient_email: string;
    proposed_slots: Slot[];
    status: "active" | "booked" | "expired";
}

export default function BookingPage() {
    const { slug } = useParams();
    const [details, setDetails] = useState<BookingDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [confirming, setConfirming] = useState<Slot | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!slug) return;
        fetch(`http://localhost:8000/booking/${slug}`)
            .then((res) => {
                if (!res.ok) throw new Error("Booking link not found or expired");
                return res.json();
            })
            .then((data) => {
                setDetails(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [slug]);

    const handleConfirm = async (slot: Slot) => {
        setConfirming(slot);
        try {
            const res = await fetch(`http://localhost:8000/booking/${slug}/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    selected_slot: slot,
                    booker_email: details?.recipient_email, // Auto-fill for now
                }),
            });
            if (!res.ok) throw new Error("Failed to confirm");
            setSuccess(true);
        } catch (err) {
            alert("Error confirming slot");
        } finally {
            setConfirming(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
                <p>Loading availability...</p>
            </div>
        );
    }

    if (error || !details) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
                <Card className="w-[400px] border-zinc-800 bg-zinc-900 text-zinc-100">
                    <CardHeader>
                        <CardTitle className="text-red-400">Booking Invalid</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
                <Card className="w-[400px] border-zinc-800 bg-zinc-900 text-zinc-100">
                    <CardHeader>
                        <CardTitle className="text-emerald-400">Meeting Confirmed! 🎉</CardTitle>
                        <CardDescription>
                            We've booked this time. You will receive a calendar invite shortly.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-zinc-100">
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Book a Meeting</h1>
                <p className="text-zinc-400">Select a time for: <span className="text-zinc-200 font-medium">{details.subject || "Quick Sync"}</span></p>
            </div>

            <div className="grid w-full max-w-md gap-4">
                {details.proposed_slots.map((slot, i) => {
                    const start = new Date(slot.start);
                    const end = new Date(slot.end);
                    return (
                        <Card key={i} className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                            <CardContent className="flex items-center justify-between p-4">
                                <div>
                                    <div className="font-semibold text-white">
                                        {format(start, "EEEE, MMMM do")}
                                    </div>
                                    <div className="text-sm text-zinc-400">
                                        {format(start, "h:mm a")} - {format(end, "h:mm a")}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleConfirm(slot)}
                                    disabled={!!confirming}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {confirming === slot ? "Booking..." : "Confirm"}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

import { type FeedItem } from "../main/CardFeed"

// ── Workspace Unlocked Message (Stateless) ─────────────────────────
export function mkWelcomeBackItem(
    firstName: string | null,
    health: any,
    triagedCount: number,
    priorityCount: number,
    onSync: () => void,
    onboardingDone: boolean,
    onStartOnboarding?: () => void
): FeedItem {
    const name = firstName || "there"
    const isOk = health?.email_accessible === true

    // ✅ Check onboarding FIRST — new users always see a greeting
    if (!onboardingDone) {
        return {
            id: `welcome_onboarding_${Date.now()}`,
            type: "response",
            title: "Aaliyah",
            text: `Hey ${name}. I'm **Aaliyah** — your executive assistant.\n\nI handle your inbox, meetings, and follow-ups, so you can focus on what actually matters. I work quietly in the background, using your rules and your voice.\n\nLet's get me configured. It takes under 2 minutes.`,
            tone: "normal" as any,
        }
    }

    // Onboarded + connected → time-aware greeting
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

    // Email NOT connected → show limited mode greeting (only for already-onboarded users)
    if (!isOk) {
        return {
            id: `welcome_health_${Date.now()}`,
            type: "response",
            title: "Aaliyah",
            text: `${timeGreeting}, ${name}. I'm active but in **limited mode** right now.\n\nI can't access your inbox, calendar, or send messages because no email account is connected. Head to **Settings** to connect your Gmail or Outlook.\n\nIn the meantime, feel free to ask me anything — how I work, what I can do for you, or help planning your workflow.`,
            tone: "normal" as any,
        }
    }

    let message = ""
    if (priorityCount > 0) {
        message = `${timeGreeting}, ${name}. You have **${priorityCount}** high-priority item${priorityCount === 1 ? "" : "s"} waiting. I've also triaged ${triagedCount} other messages today. Want a briefing?`
    } else if (triagedCount > 0) {
        message = `${timeGreeting}, ${name}. No urgent items, but I've triaged ${triagedCount} message${triagedCount === 1 ? "" : "s"} recently. Your inbox is healthy.`
    } else {
        message = `${timeGreeting}, ${name}. Your workspace is ready and your inbox is clear. Ask me anything.`
    }

    return {
        id: `welcome_${Date.now()}`,
        type: "response",
        title: "Aaliyah",
        text: message,
        tone: "normal" as any,
    }
}

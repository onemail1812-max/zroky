
// Basic wrapper-less instrumentation for now (since no Segment/GA setup).
// Logs to console for DEV, but easy to hook up later.

export const trackEvent = (name: string, data?: Record<string, any>) => {
    // 1. Log to console
    console.log(`[ANALYTICS] ${name}`, data);

    // 2. Future: Push to internal API?
    // fetch('/api/v1/metrics/track', { method: 'POST', body: JSON.stringify({ name, data }) }).catch(() => {})
};

export const AnalyticsEvents = {
    PREFLIGHT_CHECK_STARTED: 'preflight_check_started',
    PREFLIGHT_CHECK_RESULT: 'preflight_check_result',
    CTA_CLICKED: 'cta_clicked',
    HEALTH_RECOVERED: 'health_recovered',
    SYNC_STARTED: 'sync_started',
    SYNC_BLOCKED: 'sync_blocked',
};

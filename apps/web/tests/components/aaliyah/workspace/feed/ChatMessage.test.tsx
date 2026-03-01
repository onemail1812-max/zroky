import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessage } from '@/components/aaliyah/workspace/feed/ChatMessage';

describe('ChatMessage Presentation Component', () => {
    it('renders a standard user text message', () => {
        render(<ChatMessage role="user" content="Hello Aaliyah!" />);
        expect(screen.getByText('Hello Aaliyah!')).toBeInTheDocument();
    });

    it('renders an assistant message with Markdown parsing', () => {
        render(<ChatMessage role="assistant" content="**Bold** response" />);
        // Assert ReactMarkdown correctly parsed **Bold** into a standard HTML element
        const boldElement = screen.getByText('Bold');
        expect(boldElement.tagName).toBe('STRONG');
        expect(boldElement).toBeInTheDocument();
    });

    it('renders an email_action system card correctly given a payload', () => {
        const payload = {
            sender: "investor@example.com",
            subject: "Series A Term Sheet",
            snippet: "Let's review the terms...",
            priority: "Action Required"
        };

        render(<ChatMessage role="assistant" type="email_action" payload={payload} />);

        // Assert email card pieces
        expect(screen.getByText('Series A Term Sheet')).toBeInTheDocument();
        expect(screen.getByText('From: investor@example.com')).toBeInTheDocument();
        expect(screen.getByText('Action Required')).toBeInTheDocument();
    });

    it('renders a briefing_card dynamic payload correctly', () => {
        const payload = {
            message: "Good morning! Here is your briefing.",
            stats: { unread: 14, priority: 3 },
            actions: [{ label: "View Actionable Items" }]
        };

        render(<ChatMessage role="assistant" type="briefing_card" payload={payload} />);

        // Check main layout tokens
        expect(screen.getByText('Morning Briefing')).toBeInTheDocument();
        expect(screen.getByText('Good morning! Here is your briefing.')).toBeInTheDocument();

        // Check dynamic injects
        expect(screen.getByText('14')).toBeInTheDocument(); // Unread
        expect(screen.getByText('3')).toBeInTheDocument(); // Priority
        expect(screen.getByText('View Actionable Items')).toBeInTheDocument();
    });

    it('renders a typing indicator (animated bubbles) when assistant context is empty', () => {
        const { container } = render(<ChatMessage role="assistant" />);
        // The animated typing indicator has 3 distinct CSS animated `.animate-bounce` sibling dots
        const bouncyDots = container.querySelectorAll('.animate-bounce');
        expect(bouncyDots.length).toBe(3);
    });
});

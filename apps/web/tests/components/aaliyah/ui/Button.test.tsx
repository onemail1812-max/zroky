import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/aaliyah/ui/Button';

describe('Button UI Component', () => {
    it('renders correctly with default props', () => {
        render(<Button>Click Me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeInTheDocument();
        expect(button).not.toBeDisabled();
    });

    it('triggers onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click Me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when the loading prop is passed', () => {
        render(<Button loading>Submit</Button>);
        const button = screen.getByRole('button', { name: /submit/i });
        expect(button).toBeDisabled();
        // Verify the Loader2 SVG is injected with animate-spin
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('is disabled when disabled prop is passed', () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByRole('button', { name: /disabled/i });
        expect(button).toBeDisabled();
    });

    it('applies variant and size classes correctly', () => {
        render(<Button variant="destructive" size="lg">Delete</Button>);
        const button = screen.getByRole('button', { name: /delete/i });
        expect(button.className).toContain('bg-destructive');
        expect(button.className).toContain('h-10'); // lg size
        expect(button.className).toContain('px-8');
    });

    it('renders as a different child component when asChild is passed (Radix Slot)', () => {
        render(
            <Button asChild>
                <a href="/dashboard">Dashboard Link</a>
            </Button>
        );
        // Role is link, not button
        const link = screen.getByRole('link', { name: /dashboard link/i });
        expect(link).toBeInTheDocument();
        expect(link.getAttribute('href')).toBe('/dashboard');
    });
});

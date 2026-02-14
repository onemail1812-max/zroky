"""Typed exceptions for the Brain service."""

from __future__ import annotations


class BrainError(Exception):
    """Base class for brain-related failures with safe client messaging."""

    def __init__(self, message: str, safe_message: str = "Brain request failed", code: str = "brain_error"):
        super().__init__(message)
        self.safe_message = safe_message
        self.code = code


class BrainConfigurationError(BrainError):
    def __init__(self, message: str = "Brain provider is not configured"):
        super().__init__(
            message=message,
            safe_message="AI provider configuration is incomplete",
            code="brain_configuration_error",
        )


class BrainValidationError(BrainError):
    def __init__(self, message: str = "Invalid brain request"):
        super().__init__(
            message=message,
            safe_message="Request did not pass validation",
            code="brain_validation_error",
        )


class BrainProviderError(BrainError):
    def __init__(self, message: str = "Brain provider call failed"):
        super().__init__(
            message=message,
            safe_message="AI provider is temporarily unavailable",
            code="brain_provider_error",
        )


class BrainTimeoutError(BrainError):
    def __init__(self, message: str = "Brain provider timeout"):
        super().__init__(
            message=message,
            safe_message="AI provider timed out",
            code="brain_timeout",
        )

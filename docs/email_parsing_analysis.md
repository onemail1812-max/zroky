# Email Parsing Library Analysis for Aaliyah

## 1. Objective
Identify the best libraries to ingest raw emails (Gmail/Outlook), parse them into clean text, and strip signatures/replies to optimize LLM context window usage.

## 2. Library Analysis

### 2.1. `mailgun/flanker` (Python)
- **Primary Use**: Industrial-strength address validation & MIME parsing.
- **Pros**:
  - Extremely robust address validation (DNS/MX checks).
  - Fast MIME parsing (faster than standard lib).
  - Production-tested by Mailgun.
- **Cons**: heavy dependency; might be overkill if we just need basic body extraction.
- **Verdict**: **Keep for Address Validation**. Use if we need to strictly validate recipient lists before auto-sending.

### 2.2. `zapier/email-reply-parser` (Python)
- **Primary Use**: Stripping signatures and quoted replies.
- **Pros**: Port of the standard GitHub library.
- **Cons**: Unmaintained (last update ~2020).
- **Verdict**: **Do Not Use directly**. Logic is good, but better maintained alternatives exist.

### 2.3. `alfonsrv/mail-parser-reply` (Python)
- **Primary Use**: Multi-language reply parsing.
- **Pros**:
  - Modern, maintained.
  - Handles multi-language headers (e.g., "Am ... schrieb ...").
  - Drop-in replacement for the older Zapier library.
- **Verdict**: **Primary Candidate** for cleaning email bodies. We should either import this or vendor the core regex logic to avoid simple dependencies breaking.

### 2.4. `SpamScope/mail-parser` (Python)
- **Primary Use**: Security/Forensic analysis.
- **Pros**: Extracts routing info, IP addresses, and heavily malformed headers.
- **Cons**: Tooling is focused on threat detection, not "clean reading" for an executive summary.
- **Verdict**: **Skip**. We are building a productivity tool, not a security gateway.

## 3. Recommended Stack for Sprint 1

### Approach: "Robust Ingest, Clean Context"

1.  **Ingestion (MIME Parsing)**:
    - Use Python's standard `email` library (sufficient for 99% of API responses from Gmail/Outlook).
    - *Alternative*: If standard lib fails on edge cases, use `flanker.mime`.

2.  **Cleaning (LLM Context Optimization)**:
    - **Library**: `mail-parser-reply`.
    - **Action**: Use this to strip the massive "historic chain" from emails before sending to the LLM.
    - **Reasoning**: Sending 50 nested replies to Gemini/DeepSeek wastes tokens and confuses the model. We only want the *latest* context + robust summary of previous.

3.  **Address Validation**:
    - **Library**: `flanker.addresslib`.
    - **Action**: Use strictly for validating "Auto-Draft" recipients to prevent sending to malformed or nonexistent domains.

## 4. Implementation Strategy (Copy vs Install)

I recommend **copying (vendoring)** the core logic of `mail-parser-reply` rather than installing it as a dependency, provided the license permits (MIT/Apache).
- **Why?** It relies heavily on Regex. we may want to fine-tune these Regex patterns for our specific "Executive" use case without waiting for upstream PRs.
- **Where**: `apps/api/app/services/email/parsing/reply_parser.py`

## 5. Next Sprint Plan Updates
- [ ] Create `EmailParser` service.
- [ ] Vendor `mail-parser-reply` logic.
- [ ] Implement `sanitize_body(text) -> str` to remove signatures/quotes.

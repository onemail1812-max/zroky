import re
from typing import List, Optional

def classify_email(sender: str, subject: str, body: str, raw_headers: dict = {}) -> List[str]:
    """
    Deterministic rule-based classification.
    Returns list of labels: [newsletter, receipt, notification, priority, needs_reply, fyi]
    """
    labels = []
    
    sender = sender.lower()
    subject = subject.lower()
    body = body.lower()
    
    # 1. Newletter Detection
    has_list_unsubscribe = "list-unsubscribe" in raw_headers
    if has_list_unsubscribe or "unsubscribe" in body[-500:] or "view in browser" in body[:500]:
        labels.append("newsletter")
        
    # 2. Receipt / Transactional
    receipt_keywords = ["order #", "order number", "receipt", "invoice", "payment processed", "subscription renewed"]
    if any(k in subject for k in receipt_keywords) or \
       any(d in sender for d in ["stripe.com", "amazon.com", "paypal.com", "quickbooks"]):
        labels.append("receipt")
    
    # 3. Notification (System)
    if "noreply" in sender or "no-reply" in sender or "donotreply" in sender:
        labels.append("notification")
        
    # 4. Priority / Urgent
    urgent_keywords = ["urgent", "asap", "immediate action", "deadline", "due by"]
    money_keywords = ["$", "usd", "wire transfer", "payment due"]
    legal_keywords = ["nda", "contract", "agreement", "sign"]
    
    if any(k in subject for k in urgent_keywords) or any(k in body[:200] for k in urgent_keywords):
        labels.append("priority")
    elif any(k in subject for k in money_keywords) or any(k in subject for k in legal_keywords):
        labels.append("priority")
        
    # 5. Needs Reply?
    # Simple heuristic: If it's sent directly to me (not a list), ends with a question mark, 
    # and isn't a newsletter/notification.
    # Note: 'sent directly' is hard without knowing 'me', but avoiding 'newsletter' helps.
    is_automated = "newsletter" in labels or "notification" in labels or "receipt" in labels
    
    if not is_automated:
        # Check for questions
        if "?" in body or "let me know" in body or "thoughts?" in body:
            labels.append("needs_reply")
        else:
            labels.append("fyi")
            
    return list(set(labels))

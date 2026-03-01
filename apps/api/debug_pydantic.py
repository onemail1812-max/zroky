try:
    from app.config import Settings
    s = Settings()
    print("Settings initialized")
except Exception as e:
    import json
    if hasattr(e, 'json'):
        print(e.json())
    else:
        print(str(e))

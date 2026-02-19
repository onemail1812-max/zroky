
from app.main import app

for route in app.routes:
    methods = getattr(route, "methods", "N/A")
    print(f"{route.path} {methods}")

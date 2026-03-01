import os
import re

properties_to_replace = [
    'openrouter_api_key', 'openrouter_base_url', 'openrouter_app_url', 'openrouter_app_name',
    'aaliyah_draft_model', 'aaliyah_reasoning_model', 'aaliyah_verify_model',
    'server_host', 'server_port', 'database_url', 'redis_url', 'app_name', 'app_version',
    'debug', 'secret_key', 'algorithm', 'access_token_expire_minutes', 'refresh_token_expire_days',
    'cors_origins', 'cors_credentials', 'cors_methods', 'cors_headers',
    'google_enabled', 'google_client_id', 'google_client_secret', 'google_redirect_uri',
    'microsoft_enabled', 'microsoft_client_id', 'microsoft_client_secret', 'microsoft_tenant_id', 'microsoft_redirect_uri',
    'sync_interval', 'env', 'oauth_encryption_key',
    'clerk_jwks_url', 'clerk_jwt_iss', 'clerk_jwt_aud',
    'frontend_base_url', 'brain_model', 'brain_api_key', 'groq_api_key', 'openrouter_embedding_model',
    'google_scopes', 'microsoft_scopes'
]

pattern = re.compile(r'\b(?:settings|aaliyah_settings)\.(' + '|'.join(properties_to_replace) + r')\b')

def replace_match(match):
    prop_name = match.group(1)
    # The whole match includes 'settings.' or 'aaliyah_settings.', which we can just reconstruct the prefix
    prefix = match.group(0).split('.')[0]
    return f"{prefix}.{prop_name.upper()}"

# Also need to replace getattr(settings, "debug", ...) -> getattr(settings, "DEBUG", ...)
pattern_getattr = re.compile(r'\bgetattr\((settings|aaliyah_settings),\s*"(' + '|'.join(properties_to_replace) + r')"')
def replace_getattr(match):
    return f'getattr({match.group(1)}, "{match.group(2).upper()}"'

root_dir = r"d:\Zroky\apps\api\app"
files_changed = 0

for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith(".py"):
            filepath = os.path.join(dirpath, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = pattern.sub(replace_match, content)
            new_content = pattern_getattr.sub(replace_getattr, new_content)
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
                files_changed += 1

print(f"Total files updated: {files_changed}")

import re

def mask_aadhaar(uid: str) -> str:
    clean = re.sub(r'\D', '', str(uid or ''))
    if len(clean) == 12:
        return f"XXXX-XXXX-{clean[-4:]}"
    elif len(clean) > 4:
        return f"XXXX-XXXX-{clean[-4:]}"
    return "XXXX-XXXX-XXXX"

def mask_pan(pan: str) -> str:
    clean = str(pan or '').strip().upper()
    if len(clean) == 10:
        return f"{clean[:2]}***{clean[-2:]}"
    return "XXXX***XX"

def mask_passport(ppt: str) -> str:
    clean = str(ppt or '').strip().upper()
    if len(clean) >= 6:
        return f"{clean[0]}*****{clean[-2:]}"
    return "*****"

def mask_identifier(field_name: str, value: str) -> str:
    if not value:
        return "N/A"
    fn = field_name.lower()
    if 'aadhaar' in fn or 'uid' in fn:
        return mask_aadhaar(value)
    elif 'pan' in fn:
        return mask_pan(value)
    elif 'passport' in fn:
        return mask_passport(value)
    elif 'document' in fn or 'number' in fn or 'id' in fn or 'licence' in fn or 'license' in fn:
        clean = str(value).strip()
        if len(clean) > 4:
            return f"***{clean[-4:]}"
        return "****"
    return value

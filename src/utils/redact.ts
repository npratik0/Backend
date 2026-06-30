const SENSITIVE_FIELDS = new Set([
    "password",
    "confirmPassword",
    "newPassword",
    "otp",
    "cookie",
    "authorizarion",
    "accessToken",
    "refreshToken",
    "verifyToken",
    "token",
    "secret",
]);

export function redact(obj:unknown): object | null {
    if(!obj || typeof obj !== "object") return null;

    const clean: Record<string,unknown> = {}

    for(const [key,value] of Object.entries(obj as Record<string, unknown>)){
        if(SENSITIVE_FIELDS.has(key)){
            clean[key] = "Redacted"
        }else if (value && typeof value === "object" && !Array.isArray(value)){
            clean[key] = redact(value) 
        }else{
            clean[key] = value;
        }
    }
    return clean;
}
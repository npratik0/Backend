import { UAParser } from "ua-parser-js";
import crypto from "crypto";
import geoip from "geoip-lite";

export interface ParsedDevice {
    browser: string;
    browserVersion: string | null;
    os: string;
    osVersion: string | null;
    device: string;
    fingerprint: string;
}

export interface GeoLocation {
    country: string | null;
    city: string | null;
}

export function parseDevice(userAgent: string): ParsedDevice {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const browser = result.browser.name ?? "Unknown";
    const browserVersion = result.browser.version ?? null;
    const os = result.os.name ?? "Unknown";
    const osVersion = result.os.version ?? "Unknown";
    const device = result.device.type ?? "Unknown";

    const fingerprint = crypto
    .createHash("sha256")
    .update(`${browser}|${os}`)
    .digest("hex")
    .slice(0, 32);

    return {
        browser,
        browserVersion,
        os,
        osVersion,
        device,
        fingerprint
    };
}


export function getLocation(ip: string): GeoLocation{
    try{
        if(ip == "::1" || ip == "127.0.0.1" || ip.startsWith("192.168")){
            return {
                country: "local", city: "local"
            };
        }

        const geo = geoip.lookup(ip);
        return{
            country: geo?.country ?? null,
            city: geo?.city ?? null
        }

    }catch{
        return{
            country : null,
            city : null
        }
    }
}

export function normalizeIp(ip: string | undefined):  string{
    if(!ip) return "Unknown";
    return ip.replace(/^::ffff:/,"")
}
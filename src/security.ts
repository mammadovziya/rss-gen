import dns from "node:dns/promises";
import net from "node:net";
import { config } from "./config.js";

const hostnameCache = new Map<string, Promise<string[]>>();

export class UnsafeTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeTargetError";
  }
}

export type TargetValidationOptions = {
  allowPrivateNetworkTargets?: boolean;
};

export async function assertSafeTargetUrl(
  value: string,
  options: TargetValidationOptions = {}
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UnsafeTargetError("Enter a valid HTTP or HTTPS URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UnsafeTargetError("Only HTTP and HTTPS URLs are allowed.");
  }

  if (url.username || url.password) {
    throw new UnsafeTargetError("URLs with embedded usernames or passwords are not allowed.");
  }

  const allowPrivateNetworkTargets = options.allowPrivateNetworkTargets ?? config.allowPrivateNetworkTargets;
  if (allowPrivateNetworkTargets) return url;

  const hostname = url.hostname.toLowerCase();
  if (isPrivateHostname(hostname)) {
    throw new UnsafeTargetError("Private, local, and internal network URLs are blocked.");
  }

  const literalIpVersion = net.isIP(hostname);
  const addresses = literalIpVersion ? [hostname] : await resolveHostname(hostname);

  if (addresses.length === 0) {
    throw new UnsafeTargetError("The URL hostname could not be resolved.");
  }

  if (addresses.some(isPrivateAddress)) {
    throw new UnsafeTargetError("This URL resolves to a private, local, or internal network address.");
  }

  return url;
}

export function isLoopbackBindHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return ["127.0.0.1", "localhost", "::1"].includes(normalized);
}

export function privacySummary() {
  return {
    bindHost: config.host,
    localOnly: isLoopbackBindHost(config.host),
    cors: config.corsOrigin ? `restricted to ${config.corsOrigin}` : "same-origin only",
    privateNetworkTargets: config.allowPrivateNetworkTargets ? "allowed by environment" : "blocked",
    telemetry: "none",
    storage: "local data directory",
    networkAnonymity:
      "Direct fetches still reveal this machine or server IP to target websites. Use a trusted network-level proxy or VPN if you need IP anonymity."
  };
}

async function resolveHostname(hostname: string): Promise<string[]> {
  if (!hostnameCache.has(hostname)) {
    hostnameCache.set(
      hostname,
      dns
        .lookup(hostname, { all: true, verbatim: true })
        .then((records) => records.map((record) => record.address))
        .catch(() => [])
    );
  }

  return hostnameCache.get(hostname)!;
}

function isPrivateHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa")
  );
}

function isPrivateAddress(address: string): boolean {
  const version = net.isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true;
  if (normalized.startsWith("ff")) return true;

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false;
}

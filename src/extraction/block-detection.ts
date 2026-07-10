import type { ExtractionIssue } from "../types";
import { normalizeText } from "../utils";

const BLOCK_PATTERNS = [
  /access denied/i,
  /attention required/i,
  /blocked by/i,
  /bot detection/i,
  /captcha/i,
  /checking your browser/i,
  /cloudflare/i,
  /ddos-guard/i,
  /enable cookies/i,
  /just a moment/i,
  /rate limit/i,
  /request blocked/i,
  /security check/i,
  /temporarily unavailable/i,
  /too many requests/i,
  /unusual traffic/i,
  /verify you are human/i
];

export function detectBlocked(status: number | undefined, html: string): ExtractionIssue[] {
  const issues: ExtractionIssue[] = [];
  if (status && [401, 403, 407, 408, 409, 423, 429, 451, 503].includes(status)) {
    issues.push({
      code: "blocked_status",
      message: `The source returned HTTP ${status}. Browser rendering may help for JavaScript-heavy pages, but authentication, CAPTCHA, and paywall gates must be handled outside this tool.`
    });
  }

  const text = normalizeText(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")).slice(0, 12000);
  if (BLOCK_PATTERNS.some((pattern) => pattern.test(text))) {
    issues.push({
      code: "blocked_content",
      message:
        "The page looks like a blocking or verification screen. The app will try the local browser renderer in auto mode, but it does not bypass CAPTCHA, login, paywall, or access-control requirements."
    });
  }

  return issues;
}

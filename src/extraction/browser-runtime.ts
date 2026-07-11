import { config } from "../config";

export function canUseBrowserRendering(): boolean {
  return Boolean(config.browserWsEndpoint) || !config.isVercel;
}

export function browserUnavailableMessage(): string {
  return "Browser mode needs BROWSER_WS_ENDPOINT on hosted deployments. Use static/auto mode or configure a remote browser endpoint.";
}

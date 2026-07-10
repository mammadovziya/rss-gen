import { describe, expect, it } from "vitest";
import { assertSafeTargetUrl, UnsafeTargetError } from "../src/security.js";

describe("assertSafeTargetUrl", () => {
  it("allows public HTTP and HTTPS IP targets", async () => {
    await expect(assertSafeTargetUrl("https://93.184.216.34/news")).resolves.toBeInstanceOf(URL);
  });

  it("blocks local and private targets", async () => {
    await expect(assertSafeTargetUrl("http://localhost:3000")).rejects.toBeInstanceOf(UnsafeTargetError);
    await expect(assertSafeTargetUrl("http://127.0.0.1:3000")).rejects.toBeInstanceOf(UnsafeTargetError);
    await expect(assertSafeTargetUrl("http://192.168.1.10")).rejects.toBeInstanceOf(UnsafeTargetError);
    await expect(assertSafeTargetUrl("http://[::1]")).rejects.toBeInstanceOf(UnsafeTargetError);
  });

  it("blocks non-web URLs and embedded credentials", async () => {
    await expect(assertSafeTargetUrl("file:///etc/passwd")).rejects.toBeInstanceOf(UnsafeTargetError);
    await expect(assertSafeTargetUrl("https://user:pass@example.com")).rejects.toBeInstanceOf(UnsafeTargetError);
  });
});

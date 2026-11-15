import fs from "fs";
import path from "path";

declare global {
  // eslint-disable-next-line no-var
  var __gfmsCompiledCssCache: { value: string; loadedAt: number } | undefined;
}

/**
 * Reads the compiled Tailwind / global CSS bundle from `.next/static/css`
 * once in production and caches it across SSR invocations to avoid repeated synchronous disk I/O.
 */
export function getCompiledCssText(): string {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && global.__gfmsCompiledCssCache) {
    return global.__gfmsCompiledCssCache.value;
  }

  try {
    const cssDir = path.join(process.cwd(), ".next", "static", "css");
    if (fs.existsSync(cssDir)) {
      const cssFiles = fs
        .readdirSync(cssDir)
        .filter((file) => file.endsWith(".css"));

      if (cssFiles.length > 0) {
        const combined = cssFiles
          .map((file) => fs.readFileSync(path.join(cssDir, file), "utf8"))
          .join("\n");

        if (combined.trim().length > 0) {
          if (isProd) {
            global.__gfmsCompiledCssCache = { value: combined, loadedAt: Date.now() };
          }
          return combined;
        }
      }
    }
  } catch {
    // Non-fatal fallback: rely on standard Next.js stylesheet link
  }

  if (isProd && !global.__gfmsCompiledCssCache) {
    global.__gfmsCompiledCssCache = { value: "", loadedAt: Date.now() };
  }
  return "";
}

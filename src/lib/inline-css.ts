import fs from "fs";
import path from "path";

let cachedCssContent: string | null = null;

/**
 * Reads the compiled Tailwind / global CSS bundle from `.next/static/css`
 * so it can be inlined directly into the document `<head>` / layout.
 * This guarantees that CBT and subdomain routes never render unstyled
 * even if a reverse proxy, cPanel subdomain folder, or service worker
 * blocks or misroutes `/_next/static/css/*.css`.
 */
export function getCompiledCssText(): string {
  if (process.env.NODE_ENV === "production" && cachedCssContent) {
    return cachedCssContent;
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
          cachedCssContent = combined;
          return combined;
        }
      }
    }
  } catch {
    // Non-fatal fallback: rely on standard Next.js stylesheet link
  }

  return "";
}

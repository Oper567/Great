export const DEFAULT_TAWK_PROPERTY_ID = "6af85917f1c0003c425d8234";
export const DEFAULT_TAWK_WIDGET_ID = "1k7d1o35j";
export const TAWK_SCRIPT_ID = "tawkto-embed-script";

export function isCbtSubdomainHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host.startsWith("cbt.") || host === "cbt.localhost" || host.startsWith("cbt-");
}

export function isAdminOrStaffRoute(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/adminlogin" ||
    pathname === "/staff" ||
    pathname.startsWith("/staff/")
  );
}

export function isEligibleTawkRoute(pathname: string, hostname = ""): boolean {
  if (isAdminOrStaffRoute(pathname)) {
    return true;
  }

  if (hostname && isCbtSubdomainHostname(hostname)) {
    return false;
  }

  if (
    pathname.startsWith("/cbt") ||
    pathname.startsWith("/results") ||
    pathname.startsWith("/result/")
  ) {
    return false;
  }

  return true;
}

export function getTawkConfig(): { propertyId: string; widgetId: string } {
  return {
    propertyId: process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID || DEFAULT_TAWK_PROPERTY_ID,
    widgetId: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || DEFAULT_TAWK_WIDGET_ID,
  };
}

/**
 * Generates an inline pre-hydration bootstrap script so Tawk.to starts fetching
 * before React hydration completes (crucial on slower shared hosting links).
 */
export function buildTawkBootstrapScript(propertyId: string, widgetId: string): string {
  const src = JSON.stringify(`https://embed.tawk.to/${propertyId}/${widgetId}`);
  const scriptId = JSON.stringify(TAWK_SCRIPT_ID);

  return `(function(){
  if (typeof window === "undefined" || typeof document === "undefined") return;
  var p = window.location.pathname || "/";
  var h = (window.location.hostname || "").toLowerCase();
  var isDash = p === "/admin" || p.indexOf("/admin/") === 0 || p === "/adminlogin" || p === "/staff" || p.indexOf("/staff/") === 0;
  var isCbtHost = h.indexOf("cbt.") === 0 || h === "cbt.localhost" || h.indexOf("cbt-") === 0;
  if (!isDash && (isCbtHost || p.indexOf("/cbt") === 0 || p.indexOf("/results") === 0 || p.indexOf("/result/") === 0)) return;
  var head = document.head || document.getElementsByTagName("head")[0];
  if (head) {
    var origins = ["https://embed.tawk.to", "https://va.tawk.to"];
    for (var i = 0; i < origins.length; i++) {
      if (!document.querySelector('link[rel="preconnect"][href="' + origins[i] + '"]')) {
        var lk = document.createElement("link");
        lk.rel = "preconnect";
        lk.href = origins[i];
        lk.crossOrigin = "anonymous";
        head.appendChild(lk);
      }
    }
  }
  if (document.getElementById(${scriptId})) return;
  window.Tawk_API = window.Tawk_API || {};
  if (isDash && !window.Tawk_API.customStyle) {
    window.Tawk_API.customStyle = {
      visibility: {
        desktop: { position: "br", xOffset: 16, yOffset: 16 },
        mobile: { position: "br", xOffset: 12, yOffset: 76 }
      }
    };
  }
  window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();
  var s1 = document.createElement("script");
  s1.id = ${scriptId};
  s1.async = true;
  s1.src = ${src};
  s1.charset = "UTF-8";
  s1.setAttribute("crossorigin", "*");
  s1.addEventListener("error", function(){ if (s1.parentNode) s1.parentNode.removeChild(s1); });
  var s0 = document.getElementsByTagName("script")[0];
  if (s0 && s0.parentNode) {
    s0.parentNode.insertBefore(s1, s0);
  } else if (head) {
    head.appendChild(s1);
  }
})();`;
}

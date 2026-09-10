/** @type {import('next').NextConfig} */

/* CSP notes, because the loose directives are deliberate rather than lazy:

   'unsafe-inline' in script-src is unavoidable without nonce plumbing through
   Next's bootstrap, and in style-src it is required because every component
   styles itself with React inline props. So script-src buys little here.
   connect-src is the directive that earns its place: if an XSS ever appeared it
   could not ship a host token or a conversation to an attacker's domain.

   fonts.googleapis.com and fonts.gstatic.com are listed because globals.css
   @imports Archivo and IBM Plex Mono. Omitting either drops the app silently to
   system fonts. */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        /* Neither a guest link nor a host link may be frameable. Replying and
           agreeing to keep are consent actions, and a consent action inside
           someone else's iframe is a clickjack. */
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        /* Belt and braces over the browser default: an XID code must not ride
           out in a Referer header. */
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    }];
  },
};

module.exports = nextConfig;

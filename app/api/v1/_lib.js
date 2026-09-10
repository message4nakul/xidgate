/* Shared plumbing for the public API.

   This layer is deliberately thin. It reads a bearer token, forwards it to a
   security-definer function, and translates the error it gets back. It holds no
   privileged credential of its own — the anon key it uses is already public in
   the browser bundle, so a compromise of this route grants nothing that reading
   the site's JavaScript would not. All authorization lives in Postgres. */

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/* Named errors from the database, mapped to status codes and to sentences a
   developer can act on without reading our source. */
const ERRORS = {
  NO_KEY:         [401, "Missing Authorization header. Send: Authorization: Bearer xg_live_..."],
  BAD_KEY:        [401, "That API key is not recognised."],
  KEY_REVOKED:    [401, "That API key has been revoked."],
  NOT_FOUND:      [404, "No XID with that code belongs to this key."],
  ALREADY_ENDED:  [409, "That XID has already ended."],
  DAILY_LIMIT:    [429, "30 XIDs created in the last 24 hours. The allowance frees up as older ones age out."],
  CODE_COLLISION: [503, "Could not allocate a code. Retry."],
};

export function fail(code, message, extra) {
  return Response.json({ error: code, message, ...(extra || {}) }, { status: (ERRORS[code] || [400])[0] });
}

/* A key is xg_live_ plus base64url. Checking the shape here means a malformed or
   absent key costs a string comparison instead of a database round trip, which
   is the whole of the cheap-flood vector. It reveals nothing: the format is
   public, and a correctly shaped wrong key still fails upstream. */
const KEY_SHAPE = /^xg_live_[A-Za-z0-9_-]{40,50}$/;

export function bearer(req) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(\S+)$/i);
  if (!m) return null;
  return KEY_SHAPE.test(m[1]) ? m[1] : false;   // false = present but malformed
}

export async function rpc(name, args) {
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) {
    /* Postgres raises named errors; surface the name rather than the raw SQL
       message, which leaks schema detail and helps nobody. */
    const name = Object.keys(ERRORS).find((k) => text.includes(k));
    const [status, message] = ERRORS[name] || [502, "Upstream error."];
    return { error: Response.json({ error: name || "UPSTREAM", message }, { status }) };
  }
  const data = JSON.parse(text || "[]");
  return { row: Array.isArray(data) ? data[0] : data };
}

export const noStore = { headers: { "Cache-Control": "no-store" } };

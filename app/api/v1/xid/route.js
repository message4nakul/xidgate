import { bearer, rpc, fail } from "../_lib";

/* POST /api/v1/xid — mint an XID and get a shareable link back.

   Body (all optional except nothing):
     label      string   what you'll recognise it by
     hours      "any" | "H-H"
     tz         IANA zone the hours are judged in
     ttl_ms     how long it lives, capped at a year
     people     integer or null for no limit; 1 means the reopenable latch
     one_shot   close after the first person joins
*/
export async function POST(req) {
  const key = bearer(req);
  if (key === null) return fail("NO_KEY", "Missing Authorization header. Send: Authorization: Bearer xg_live_...");
  if (key === false) return fail("BAD_KEY", "That API key is not recognised.");

  /* An empty body is fine and means "all defaults". Malformed JSON is not: it is
     a bug in the caller, and silently creating a default XID burns their quota
     and hides the mistake. */
  let body = {};
  const raw = await req.text();
  if (raw.trim()) {
    try { body = JSON.parse(raw); } catch {
      return Response.json({ error: "BAD_BODY", message: "Request body is not valid JSON." }, { status: 400 });
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "BAD_BODY", message: "Request body must be a JSON object." }, { status: 400 });
    }
  }

  const ttl = Number(body.ttl_ms);
  const people = body.people === null || body.people === undefined ? null : Number(body.people);
  if (people !== null && (!Number.isInteger(people) || people < 1)) {
    return Response.json({ error: "BAD_PEOPLE", message: "people must be a whole number of 1 or more, or null for no limit." }, { status: 400 });
  }
  /* The shape check alone let "25-99" through, which creates an XID the trigger
     can never match: the enquirer can read but never send, forever, with no error
     anywhere. A lister typing their own hours would hit it eventually. */
  if (body.hours && body.hours !== "any") {
    const w = /^(\d{1,2})-(\d{1,2})$/.exec(body.hours);
    const a = w && Number(w[1]), b = w && Number(w[2]);
    if (!w || a > 23 || b > 24 || a === b) {
      return Response.json({
        error: "BAD_HOURS",
        message: 'hours must be "any", or a window like "9-18" with a start of 0-23 and an end of 0-24. "22-6" wraps past midnight. Start and end cannot be equal.',
      }, { status: 400 });
    }
  }

  const { row, error } = await rpc("api_create_xid", {
    p_key: key,
    p_label: body.label ?? null,
    p_hours: body.hours ?? "any",
    p_tz: body.tz ?? "Asia/Kolkata",
    p_ms: Number.isFinite(ttl) && ttl > 0 ? Math.round(ttl) : 86400000,
    p_people: people,
    p_one_shot: !!body.one_shot,
  });
  if (error) return error;

  return Response.json({
    code: row.code,
    url: row.url,
    /* Deliver this to the listing owner behind your own login. It is the whole
       credential for replying, so treat it like a password reset link: private,
       and never in a page a third party can see. */
    host_url: row.host_url,
    expires_at: row.expires_at,
    ends_in_ms: row.ends_in_ms,
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  return Response.json({
    service: "XIDgate API v1",
    endpoints: {
      "POST /api/v1/xid": "mint an XID; returns url for the enquirer and host_url for the owner",
      "GET /api/v1/xid/{code}": "status, expiry, how many joined, message count",
      "DELETE /api/v1/xid/{code}": "end it now",
    },
    auth: "Authorization: Bearer xg_live_...",
    note: "Message contents are deliberately not exposed. Conversations stay in XIDgate so that ending an XID still means the messages are gone.",
  }, { headers: { "Cache-Control": "no-store" } });
}

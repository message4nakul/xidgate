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
  if (!key) return fail("NO_KEY", "Missing Authorization header. Send: Authorization: Bearer xg_live_...");

  let body = {};
  try { body = await req.json(); } catch { /* an empty body is fine */ }

  const ttl = Number(body.ttl_ms);
  const people = body.people === null || body.people === undefined ? null : Number(body.people);
  if (people !== null && (!Number.isInteger(people) || people < 1)) {
    return Response.json({ error: "BAD_PEOPLE", message: "people must be a whole number of 1 or more, or null for no limit." }, { status: 400 });
  }
  if (body.hours && body.hours !== "any" && !/^\d{1,2}-\d{1,2}$/.test(body.hours)) {
    return Response.json({ error: "BAD_HOURS", message: 'hours must be "any" or a 24-hour window like "9-18".' }, { status: 400 });
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
    expires_at: row.expires_at,
    ends_in_ms: row.ends_in_ms,
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  return Response.json({
    service: "XIDgate API v1",
    endpoints: {
      "POST /api/v1/xid": "mint an XID, returns a shareable url",
      "GET /api/v1/xid/{code}": "status, expiry, how many joined, message count",
      "DELETE /api/v1/xid/{code}": "end it now",
    },
    auth: "Authorization: Bearer xg_live_...",
    note: "Message contents are deliberately not exposed. Conversations stay in XIDgate so that ending an XID still means the messages are gone.",
  }, { headers: { "Cache-Control": "no-store" } });
}

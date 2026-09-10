import { bearer, rpc, fail } from "../../_lib";

export async function GET(req, { params }) {
  const key = bearer(req);
  if (key === null) return fail("NO_KEY", "Missing Authorization header. Send: Authorization: Bearer xg_live_...");
  if (key === false) return fail("BAD_KEY", "That API key is not recognised.");
  const { row, error } = await rpc("api_get_xid", { p_key: key, p_code: params.code });
  if (error) return error;
  return Response.json(row, { headers: { "Cache-Control": "no-store" } });
}

/* DELETE ends the XID. It is not idempotent on purpose: ending something is
   irreversible, so a second call returns 409 rather than pretending it worked. */
export async function DELETE(req, { params }) {
  const key = bearer(req);
  if (key === null) return fail("NO_KEY", "Missing Authorization header. Send: Authorization: Bearer xg_live_...");
  if (key === false) return fail("BAD_KEY", "That API key is not recognised.");
  const { row, error } = await rpc("api_end_xid", { p_key: key, p_code: params.code });
  if (error) return error;
  return Response.json(row, { headers: { "Cache-Control": "no-store" } });
}

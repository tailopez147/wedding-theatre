function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });
}

function badRequest(msg) {
  return json({ ok: false, error: msg }, { status: 400 });
}

function normName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function handleRSVP(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  // Honeypot
  if (typeof body?.website === "string" && body.website.trim() !== "") {
    return json({ ok: true });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const attendingRaw = typeof body?.attending === "string" ? body.attending : "";

  if (name.length < 2 || name.length > 120) return badRequest("Name is required");

  const attending = attendingRaw === "yes" ? 1 : attendingRaw === "no" ? 0 : null;
  if (attending === null) return badRequest("Attending is required");

  const dietary = typeof body?.dietary === "string" ? body.dietary.trim().slice(0, 200) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "";

  const nameKey = normName(name);

  await env.DB.prepare(`
    INSERT INTO rsvps (name, name_key, attending, dietary, message, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(name_key) DO UPDATE SET
      name = excluded.name,
      attending = excluded.attending,
      dietary = excluded.dietary,
      message = excluded.message,
      updated_at = datetime('now')
  `).bind(name, nameKey, attending, dietary, message).run();

  return json({ ok: true });
}

async function handleStats(env) {
  const row = await env.DB.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN attending=1 THEN 1 ELSE 0 END), 0) AS yes,
      COALESCE(SUM(CASE WHEN attending=0 THEN 1 ELSE 0 END), 0) AS no,
      COUNT(*) AS total
    FROM rsvps
  `).first();

  return json(row || { yes: 0, no: 0, total: 0 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/rsvp") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      return handleRSVP(request, env);
    }

    if (url.pathname === "/api/stats") {
      if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
      return handleStats(env);
    }

    // Serve static site
    return env.ASSETS.fetch(request);
  },
};

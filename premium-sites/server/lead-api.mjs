import { createServer } from "node:http";
const origins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:4173,http://localhost:3000"
).split(",");
const buckets = new Map();
const kinds = new Set([
  "Estimation immobilière",
  "Rendez-vous agence",
  "Contact immobilier",
  "Visite immobilière",
  "Réservation restaurant",
  "Commande à emporter",
  "Événement privé",
  "Demande de bon cadeau",
  "Contact restaurant",
  "Contact paysagiste",
  "Visite conseil jardin",
]);
export function validateLead(data) {
  if (!data || typeof data !== "object" || !kinds.has(data.kind))
    return "Type de demande invalide.";
  if (
    typeof data.name !== "string" ||
    data.name.trim().length < 2 ||
    data.name.length > 120
  )
    return "Nom invalide.";
  if (
    typeof data.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
    data.email.length > 254
  )
    return "E-mail invalide.";
  if (data.consent !== "on") return "Consentement requis.";
  if (
    data.date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
      !/^\d{2}:\d{2}$/.test(data.time || "") ||
      Number.isNaN(new Date(`${data.date}T${data.time}:00`).getTime()) ||
      new Date(`${data.date}T${data.time}:00`) < new Date())
  )
    return "Créneau invalide.";
  if (Object.values(data).some((x) => typeof x !== "string" || x.length > 5000))
    return "Champ invalide.";
  return null;
}
export function createLeadServer() {
  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    const allowed = origin && origins.includes(origin);
    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    const reply = (code, body) => {
      res.writeHead(code, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    };
    if (req.method === "OPTIONS") {
      reply(allowed ? 204 : 403, {});
      return;
    }
    if (req.url !== "/leads" || req.method !== "POST") {
      reply(404, { error: "Introuvable" });
      return;
    }
    if (!allowed) {
      reply(403, { error: "Origine non autorisée" });
      return;
    }
    if (!req.headers["content-type"]?.startsWith("application/json")) {
      reply(415, { error: "JSON requis" });
      return;
    }
    const ip = req.socket.remoteAddress;
    const now = Date.now();
    for (const [key, val] of buckets) {
      if (val.until < now) buckets.delete(key);
    }
    const bucket = buckets.get(ip) || { count: 0, until: now + 600000 };
    bucket.count++;
    buckets.set(ip, bucket);
    if (bucket.count > 10) {
      reply(429, { error: "Trop de demandes" });
      return;
    }
    let body = "";
    try {
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 16000) {
          reply(413, { error: "Demande trop volumineuse" });
          req.destroy();
          return;
        }
      }
      const data = JSON.parse(body);
      if (data.website) {
        reply(422, { error: "Demande invalide" });
        return;
      }
      const error = validateLead(data);
      if (error) {
        reply(422, { error });
        return;
      }
      if (
        !process.env.RESEND_API_KEY ||
        !process.env.LEAD_TO ||
        !process.env.LEAD_FROM
      ) {
        reply(503, { error: "Service de contact non configuré" });
        return;
      }
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          from: process.env.LEAD_FROM,
          to: [process.env.LEAD_TO],
          reply_to: data.email,
          subject: `Nouvelle demande : ${data.kind}`,
          text: Object.entries(data)
            .filter(([k]) => !["consent", "website"].includes(k))
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n"),
        }),
      });
      if (!sent.ok) {
        reply(502, { error: "Transmission indisponible" });
        return;
      }
      reply(200, { status: "sent", reservationConfirmed: false });
    } catch {
      reply(400, { error: "La demande n’a pas été transmise" });
    }
  });
}
if (process.argv[1]?.endsWith("lead-api.mjs"))
  createLeadServer().listen(Number(process.env.PORT || 8787), "127.0.0.1", () =>
    console.log("API de contact prête ; nécessite des identifiants Resend."),
  );

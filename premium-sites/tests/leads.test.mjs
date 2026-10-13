import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLead, createLeadServer } from "../server/lead-api.mjs";
const valid = {
  kind: "Contact restaurant",
  name: "Client Test",
  email: "client@example.test",
  consent: "on",
};
test("API : coordonnées et consentement obligatoires", () => {
  assert.equal(validateLead(valid), null);
  assert.ok(validateLead({ ...valid, email: "incorrect" }));
  assert.ok(validateLead({ ...valid, consent: "" }));
  assert.ok(validateLead({ ...valid, kind: "unknown" }));
  assert.ok(validateLead({ ...valid, message: "a".repeat(6000) }));
});
test("API : refuse les créneaux passés et les dates mal formées", () => {
  assert.ok(validateLead({ ...valid, date: "2020-01-01", time: "12:00" }));
  assert.ok(validateLead({ ...valid, date: "demain", time: "midi" }));
  assert.ok(validateLead({ ...valid, date: "2026-99-99", time: "12:00" }));
});
test("API : sans fournisseur configuré, ne confirme jamais un envoi", async () => {
  const server = createLeadServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/leads`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:4173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(valid),
    });
    assert.equal(r.status, 503);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("API : bloque une origine externe", async () => {
  const server = createLeadServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/leads`, {
      method: "POST",
      headers: {
        Origin: "https://untrusted.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(valid),
    });
    assert.equal(r.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

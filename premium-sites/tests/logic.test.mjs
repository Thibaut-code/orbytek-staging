import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterProperties,
  landscapeEstimate,
  cartTotal,
  calendarEvent,
} from "../lib/logic.mjs";
test("les cinq critères immobiliers se combinent", () => {
  const items = [
    { id: 1, city: "Uccle", type: "Villa", price: 900000, area: 250, beds: 4 },
    {
      id: 2,
      city: "Uccle",
      type: "Appartement",
      price: 600000,
      area: 180,
      beds: 3,
    },
    { id: 3, city: "Lasne", type: "Villa", price: 1500000, area: 350, beds: 5 },
  ];
  assert.deepEqual(
    filterProperties(items, {
      location: "UCC",
      type: "Villa",
      price: 1000000,
      area: 200,
      beds: 4,
    }).map((p) => p.id),
    [1],
  );
  assert.equal(filterProperties(items, { price: 500000 }).length, 0);
});
test("le budget paysagiste prend en compte service, quantité et évacuation", () => {
  assert.deepEqual(landscapeEstimate("terrasse", 50, ["evacuation"]), {
    min: 4930,
    max: 9180,
    unit: "m²",
  });
  assert.equal(landscapeEstimate("haies", 20).unit, "m linéaires");
  assert.deepEqual(landscapeEstimate("elagage", 2), {
    min: 300,
    max: 900,
    unit: "arbres",
  });
  assert.equal(landscapeEstimate("creation", -10), null);
  assert.equal(landscapeEstimate("unknown", 100), null);
});
test("un panier calcule les quantités et ignore les produits inexistants", () => {
  assert.equal(
    cartTotal({ a: 2, b: 1, unknown: 9 }, [
      { id: "a", price: 16 },
      { id: "b", price: 32 },
    ]),
    64,
  );
  assert.equal(cartTotal({}, []), 0);
});
test("un rappel agenda reste explicite et échappe les caractères ICS", () => {
  const event = calendarEvent({
    title: "Demande à confirmer : visite, jardin",
    date: "2026-10-20",
    time: "14:00",
    description: "A;B\nC",
  });
  assert.match(event, /SUMMARY:Demande à confirmer : visite\\, jardin/);
  assert.match(event, /DESCRIPTION:A\\;B\\nC/);
  assert.match(event, /DTSTART:/);
  assert.throws(() =>
    calendarEvent({ title: "Test", date: "impossible", time: "12:00" }),
  );
});

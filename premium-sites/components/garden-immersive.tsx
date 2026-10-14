"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDown,
  Pause,
  Play,
  Plus,
  ArrowRight,
} from "lucide-react";
import { image } from "../lib/data";

export function GardenHero({ onProject }: { onProject: () => void }) {
  const [paused, setPaused] = useState(false);
  return (
    <section className="hero" data-garden-immersive>
      <div
        className={`hero-media garden-cinema ${paused ? "is-paused" : ""}`}
        aria-hidden="true"
      >
        <img
          src={image("garden-vision")}
          srcSet={[640, 960, 1280, 1920]
            .map((w) => `/demos/images/garden-vision-${w}.webp ${w}w`)
            .join(", ")}
          sizes="100vw"
          alt=""
          fetchPriority="high"
        />
      </div>
      <div className="wrap-premium garden-hero-layout">
        <div className="hero-content">
          <span className="eyebrow">ATELIER DE PAYSAGE · BRABANT WALLON</span>
          <h1>
            Votre jardin.
            <br />
            Une autre façon
            <br />
            <em>de vivre.</em>
          </h1>
          <p className="hero-copy">
            La douceur d’un soir. Le parfum des saisons.
            <br />
            Un lieu qui vous ressemble, juste dehors.
          </p>
          <div className="hero-actions">
            <button className="button" onClick={onProject}>
              Imaginons votre jardin <ArrowUpRight size={17} />
            </button>
            <a className="text-link" href="#jardin-interactif">
              Entrer dans le jardin <ArrowDown size={17} />
            </a>
          </div>
        </div>
        <a className="garden-hero-note" href="#jardin-interactif">
          <span className="eyebrow">LE JARDIN À EXPLORER</span>
          <span>
            L’art de se sentir
            <br />
            <em>ailleurs, chez soi.</em>
          </span>
          <span className="garden-note-link">
            4 détails qui changent tout <ArrowUpRight size={18} />
          </span>
        </a>
      </div>
      <div className="hero-bottom">
        <span>CONCEVOIR · AMÉNAGER · FAIRE GRANDIR</span>
        <span className="garden-concept-label">
          Jardin d’inspiration · création visuelle IA
        </span>
        <button
          className="garden-motion-toggle"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          {paused ? "Reprendre le mouvement" : "Mettre en pause"}
        </button>
      </div>
    </section>
  );
}

const details = [
  {
    title: "Le salon de plein air",
    short: "La terrasse",
    x: 81,
    y: 44,
    kicker: "HABITER LE DEHORS",
    text: "À l’abri d’une pergola en bois, la terrasse prolonge la maison. Une ombre légère, des assises généreuses : le jardin devient une pièce où l’on reste.",
    material: "Bois naturel & pierre claire",
    position: "90% 35%",
  },
  {
    title: "Le plaisir du chemin",
    short: "Les cheminements",
    x: 35,
    y: 71,
    kicker: "GUIDER SANS IMPOSER",
    text: "Des pas de pierre dessinent une promenade entre les massifs. Les joints plantés adoucissent les lignes et invitent à découvrir le jardin à son rythme.",
    material: "Dalles minérales & joints végétalisés",
    position: "35% 80%",
  },
  {
    title: "Un jardin en mouvement",
    short: "Les plantations",
    x: 49,
    y: 46,
    kicker: "COMPOSER AVEC LE VIVANT",
    text: "Graminées, floraisons légères et arbres aux silhouettes libres se répondent. Une palette à adapter au sol et à l’exposition, belle bien au-delà d’une seule saison.",
    material: "Graminées, vivaces & arbres multi-troncs",
    position: "47% 40%",
  },
  {
    title: "La lumière sur l’eau",
    short: "Le bassin",
    x: 79,
    y: 75,
    kicker: "INVITER AU CALME",
    text: "Un miroir d’eau capte le ciel et la lumière du soir. Ses berges plantées créent une transition douce avec la terrasse, pour une présence discrète et apaisante.",
    material: "Eau, reflets & végétation de berge",
    position: "85% 80%",
  },
];

export function GardenExplorer({ onProject }: { onProject: () => void }) {
  const [active, setActive] = useState(0);
  const detail = details[active];
  return (
    <section
      className="garden-explorer"
      id="jardin-interactif"
      aria-labelledby="garden-explorer-title"
    >
      <div className="wrap-premium">
        <div className="garden-explorer-heading">
          <div>
            <span className="eyebrow">UNE PROMENADE, QUATRE INSPIRATIONS</span>
            <h2 id="garden-explorer-title">
              La beauté est
              <br />
              <em>dans les détails.</em>
            </h2>
          </div>
          <p>
            Touchez les repères. Découvrez ce qui fait
            <br />
            d’un extérieur un véritable lieu de vie.
          </p>
        </div>
        <div className="garden-explorer-layout">
          <div className="garden-map">
            <img
              src={image("garden-vision")}
              alt="Jardin d’inspiration avec pergola à droite, allée en pierre à gauche, massifs au centre et bassin au premier plan"
              loading="lazy"
              width="1672"
              height="941"
            />
            {details.map((d, i) => (
              <button
                key={d.short}
                className={`garden-hotspot ${active === i ? "is-active" : ""}`}
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
                aria-label={`Explorer ${d.short.toLowerCase()}`}
                aria-pressed={active === i}
                aria-controls="garden-detail-panel"
                onClick={() => setActive(i)}
              >
                <span>
                  {active === i ? (
                    String(i + 1).padStart(2, "0")
                  ) : (
                    <Plus size={18} />
                  )}
                </span>
                <span className="garden-hotspot-label">{d.short}</span>
              </button>
            ))}
            <span className="garden-map-caption">
              UN JARDIN, MILLE FAÇONS DE LE VIVRE.
            </span>
          </div>
          <div
            id="garden-detail-panel"
            className="garden-detail-panel"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="garden-detail-top">
              <span className="eyebrow">{detail.kicker}</span>
              <span className="garden-detail-number">
                0{active + 1}
                <small> / 04</small>
              </span>
            </div>
            <div
              className="garden-detail-crop"
              style={{
                backgroundImage: `url(${image("garden-vision")})`,
                backgroundPosition: detail.position,
              }}
              aria-hidden="true"
            />
            <h3>{detail.title}</h3>
            <p>{detail.text}</p>
            <span className="garden-material">{detail.material}</span>
            <button className="text-link" onClick={onProject}>
              Et dans votre jardin ? <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
        <div className="garden-explorer-footer">
          <div className="garden-detail-choices" aria-label="Détails du jardin">
            {details.map((d, i) => (
              <button
                key={d.short}
                aria-pressed={active === i}
                aria-controls="garden-detail-panel"
                onClick={() => setActive(i)}
              >
                <span>0{i + 1}</span>
                {d.short}
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
          <p>
            Composition d’inspiration générée par IA.
            <br />
            Chaque projet réel se dessine avec son terrain.
          </p>
        </div>
      </div>
    </section>
  );
}

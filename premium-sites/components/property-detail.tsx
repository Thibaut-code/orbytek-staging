"use client";
import { useState } from "react";
import { BedDouble, Maximize, MapPin } from "lucide-react";
import {
  Experience,
  Header,
  Modal,
  LeadForm,
  Gallery,
  Footer,
  SectionTitle,
  ArrowUpRight,
  Check,
  WhatsAppDraft,
} from "./shared";
import { image, properties } from "../lib/data";
export default function PropertyDetail({
  property: p,
}: {
  property: (typeof properties)[number];
}) {
  const [panel, setPanel] = useState("");
  return (
    <Experience theme="estate">
      <Header
        brand="aurelia"
        sub="L’immobilier, autrement"
        links={[
          { label: "La collection", href: "../../#proprietes" },
          { label: "Notre approche", href: "../../#approche" },
        ]}
        cta="Organiser une visite"
        onAction={() => setPanel("visit")}
      />
      <main id="main" className="wrap-premium">
        <div className="pt-8">
          <a className="text-link" href="../../#proprietes">
            ← Retour à la collection
          </a>
        </div>
        <section className="detail-hero">
          <img src={image(p.image)} alt={p.title} fetchPriority="high" />
          <div className="detail-copy">
            <span className="eyebrow">
              {p.tag} · {p.city}
            </span>
            <h1>{p.title}</h1>
            <span className="property-location">
              <MapPin size={13} />
              {p.address}
            </span>
            <div className="property-specs">
              <span>
                <Maximize size={15} />
                {p.area} m²
              </span>
              <span>
                <BedDouble size={15} />
                {p.beds} chambres
              </span>
              <span>PEB {p.energy}</span>
            </div>
            <div className="detail-price">
              {new Intl.NumberFormat("fr-BE").format(p.price)} €
            </div>
            <p>{p.description}</p>
            <div className="detail-actions">
              <button className="button" onClick={() => setPanel("visit")}>
                Organiser une visite
                <ArrowUpRight size={16} />
              </button>
              <button
                className="button button-outline"
                onClick={() => setPanel("360")}
              >
                Visite virtuelle 360°
              </button>
            </div>
            <p className="fine-print">
              Bien fictif présenté pour illustrer l’expérience. Prix et
              caractéristiques de démonstration.
            </p>
          </div>
        </section>
        <section className="section">
          <div className="split-section">
            <SectionTitle
              eyebrow="LE LIEU, EN DÉTAIL"
              title="Les détails qui changent tout."
              body={p.description}
            />
            <ul className="feature-list">
              {p.features.map((x) => (
                <li key={x}>
                  <Check />
                  {x}
                </li>
              ))}
              <li>
                <Check />
                Surface habitable : {p.area} m²
              </li>
              <li>
                <Check />
                Performance énergétique : classe {p.energy}
              </li>
            </ul>
          </div>
          <Gallery
            images={[
              { src: p.image, alt: p.title },
              { src: "estate-interior", alt: "Inspiration : espace de vie" },
              { src: "estate-terrace", alt: "Inspiration : terrasse" },
            ]}
          />
        </section>
        <section className="section pt-0">
          <SectionTitle
            eyebrow="L’ADRESSE"
            title={`${p.city}, une autre façon de vivre.`}
          />
          <a
            className="button button-outline"
            target="_blank"
            rel="noopener"
            href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}
          >
            Explorer le quartier sur Google Maps
            <ArrowUpRight size={16} />
          </a>
          <p className="fine-print">
            Position illustrative du quartier. L’adresse précise d’un vrai bien
            sera communiquée par l’agence.
          </p>
        </section>
      </main>
      <Footer
        brand="aurelia"
        description="Une attention particulière à chaque lieu, et à chaque projet."
        links={[{ label: "Retour à la collection", href: "../../#proprietes" }]}
        onContact={() => setPanel("visit")}
      />
      {panel && (
        <Modal
          title={
            panel === "360"
              ? "Explorez le lieu à votre rythme."
              : `Une visite de ${p.title}`
          }
          onClose={() => setPanel("")}
          wide={panel === "360"}
        >
          {panel === "360" ? (
            <>
              <iframe
                title="Visite panoramique interactive à 360 degrés"
                src="/demos/tour.html"
                className="w-full h-[430px] border-0"
              />
              <p className="fine-print">
                Panorama 360° de démonstration indépendant de ce bien. Une vraie
                visite nécessite les prises de vue panoramiques du client.
              </p>
            </>
          ) : (
            <>
              <LeadForm
                kind="Visite immobilière"
                subject={`${p.title} · ${p.city}`}
                fields="booking"
              />
              <div className="mt-6">
                <WhatsAppDraft brand="Aurelia" />
              </div>
            </>
          )}
        </Modal>
      )}
    </Experience>
  );
}

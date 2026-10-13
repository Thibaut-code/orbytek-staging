"use client";
import { useEffect, useRef, useState } from "react";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  X,
  Menu,
  ArrowRight,
  ChevronDown,
  CalendarDays,
  MessageCircle,
  Check,
  Play,
  Sun,
  Moon,
} from "lucide-react";
import { calendarEvent } from "../lib/logic.mjs";
import { image } from "../lib/data";
export {
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  CalendarDays,
  MessageCircle,
  Check,
  Play,
};
export function Experience({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`experience ${theme}`}>
        <a className="skip" href="#main">
          Aller au contenu
        </a>
        {children}
      </div>
    </MotionConfig>
  );
}
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduced ? {} : { y: [18, 0], opacity: [0.8, 1] }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
export function Header({
  brand,
  sub,
  links,
  cta,
  onAction,
  darkToggle = false,
}: {
  brand: string;
  sub: string;
  links: { label: string; href: string }[];
  cta: string;
  onAction: () => void;
  darkToggle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  return (
    <header className="site-header">
      <a className="wordmark" href="#">
        <span className="brand-name">
          {brand}
          <span className="brand-dot">.</span>
        </span>
        <small>{sub}</small>
      </a>
      <nav
        aria-label="Navigation principale"
        className={open ? "nav-open" : ""}
      >
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className="header-tools">
        {darkToggle && (
          <button
            className="icon-button"
            aria-label={
              light ? "Activer le mode sombre" : "Activer le mode clair"
            }
            onClick={() => {
              setLight(!light);
              document.querySelector(".estate")?.classList.toggle("light-mode");
            }}
          >
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        )}
        <button className="button header-cta" onClick={onAction}>
          {cta}
          <ArrowUpRight size={16} />
        </button>
        <button
          className="menu-toggle icon-button"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
export function HeroMedia({
  name,
  video = false,
}: {
  name: string;
  video?: boolean;
}) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!video || reduced) return;
    const start = () => {
      setPlaying(true);
      cleanup();
    };
    const cleanup = () => {
      for (const event of ["pointerdown", "keydown", "scroll"])
        window.removeEventListener(event, start);
    };
    for (const event of ["pointerdown", "keydown", "scroll"])
      window.addEventListener(event, start, { once: true, passive: true });
    return cleanup;
  }, [video, reduced]);
  return (
    <div className="hero-media" aria-hidden="true">
      <img
        src={image(name)}
        srcSet={[640, 800, 960, 1280, 1920]
          .map((width) => `/demos/images/${name}-${width}.webp ${width}w`)
          .join(", ")}
        sizes="100vw"
        alt=""
        fetchPriority="high"
      />
      {video && playing && !reduced && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={image(name)}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        >
          <source src={`/demos/videos/${name}.mp4`} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
}) {
  return (
    <Reveal className="section-title">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </Reveal>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="Fermer" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function LeadForm({
  kind,
  subject = "",
  fields = "contact",
  initialService = "Création de jardin",
}: {
  kind: string;
  subject?: string;
  fields?: "contact" | "booking" | "estimate" | "garden";
  initialService?: string;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [event, setEvent] = useState<{ date: string; time: string } | null>(
    null,
  );
  const [step, setStep] = useState(1);
  const [service, setService] = useState(initialService);
  const today = new Date().toLocaleDateString("en-CA");
  const restaurantBooking = [
    "Réservation restaurant",
    "Commande à emporter",
  ].includes(kind);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (
      values.date &&
      new Date(`${values.date}T${values.time || "12:00"}:00`) <= new Date()
    ) {
      setStatus("Choisissez un créneau à venir.");
      return;
    }
    if (restaurantBooking && values.date) {
      const day = new Date(`${values.date}T12:00:00`).getDay();
      if (day === 1 || (day === 0 && String(values.time) >= "19:00")) {
        setStatus(
          "La maison est fermée le lundi et le dimanche soir. Choisissez un autre service.",
        );
        return;
      }
    }
    setBusy(true);
    const endpoint = process.env.NEXT_PUBLIC_REQUEST_ENDPOINT;
    try {
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, kind, subject }),
        });
        if (!response.ok) throw new Error();
        setStatus(
          "Votre demande a été transmise. L’équipe doit encore confirmer le créneau.",
        );
      } else {
        setStatus(
          "Votre demande est prête. Cette version de démonstration ne transmet aucune donnée : le service de réservation ou de contact sera raccordé pour le client.",
        );
      }
      if (values.date)
        setEvent({
          date: String(values.date),
          time: String(values.time || "12:00"),
        });
    } catch {
      setStatus(
        "L’envoi a échoué. Votre demande n’a pas été confirmée. Réessayez plus tard.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="lead-form" onSubmit={submit}>
      <div className="honeypot" aria-hidden="true">
        <label>
          Site web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {subject && <p className="form-context">{subject}</p>}
      {fields === "garden" && (
        <div className="form-progress">
          <span className={step === 1 ? "active" : ""}>01 Votre projet</span>
          <span className={step === 2 ? "active" : ""}>02 Vos coordonnées</span>
        </div>
      )}
      <div hidden={fields === "garden" && step !== 1}>
        {fields === "garden" && (
          <>
            <label>
              Votre besoin
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                name="service"
              >
                {[
                  "Création de jardin",
                  "Entretien de jardin",
                  "Terrasse",
                  "Clôture",
                  "Taille de haies",
                  "Élagage",
                  "Arrosage automatique",
                  "Piscine naturelle",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                {service === "Élagage"
                  ? "Nombre d’arbres"
                  : ["Clôture", "Taille de haies"].includes(service)
                    ? "Longueur estimée (m)"
                    : "Surface estimée (m²)"}
                <input
                  name="surface"
                  type="number"
                  min="1"
                  placeholder="Ex. 150"
                />
              </label>
              <label>
                Votre commune
                <input name="commune" placeholder="Ex. Waterloo" />
              </label>
            </div>
            <label>
              {service === "Entretien de jardin"
                ? "Fréquence souhaitée"
                : "Votre calendrier"}
              <select name="planning">
                {(service === "Entretien de jardin"
                  ? ["Une intervention", "Chaque mois", "Contrat saisonnier"]
                  : [
                      "Dès que possible",
                      "Dans les 3 mois",
                      "Dans les 6 mois",
                      "Je prépare mon projet",
                    ]
                ).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Ce que vous imaginez
              <textarea
                name="project"
                rows={3}
                placeholder="Vos envies, l’accès au jardin, les contraintes…"
              />
            </label>
            <button type="button" className="button" onClick={() => setStep(2)}>
              Continuer
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
      <div hidden={fields === "garden" && step !== 2}>
        <div className="form-grid">
          <label>
            Votre nom
            <input
              name="name"
              required
              autoComplete="name"
              placeholder="Prénom et nom"
            />
          </label>
          <label>
            Votre e-mail
            <input
              name="email"
              required
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.be"
            />
          </label>
        </div>
        <label>
          Téléphone
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+32…"
          />
        </label>
        {fields === "estimate" && (
          <>
            <div className="form-grid">
              <label>
                Commune
                <input required name="city" placeholder="Uccle, Waterloo…" />
              </label>
              <label>
                Type de bien
                <select name="propertyType">
                  <option>Maison</option>
                  <option>Villa</option>
                  <option>Appartement</option>
                </select>
              </label>
              <label>
                Surface habitable (m²)
                <input
                  required
                  name="area"
                  type="number"
                  min="10"
                  max="10000"
                />
              </label>
              <label>
                Votre projet
                <select name="timing">
                  <option>Vendre dans les 3 mois</option>
                  <option>Vendre dans les 6 mois</option>
                  <option>Connaître la valeur de mon bien</option>
                </select>
              </label>
            </div>
            <p className="fine-print">
              Une estimation fiable dépend d’une visite et de ventes
              comparables. Aucun prix automatique ne remplace l’avis d’un
              professionnel.
            </p>
          </>
        )}
        {(fields === "booking" || fields === "garden") && (
          <div className="form-grid">
            <label>
              Date souhaitée
              <input required type="date" name="date" min={today} />
            </label>
            <label>
              Heure souhaitée
              <select name="time">
                {(restaurantBooking
                  ? [
                      "12:00",
                      "12:30",
                      "13:00",
                      "19:00",
                      "19:30",
                      "20:00",
                      "20:30",
                    ]
                  : ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
                ).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {kind === "Réservation restaurant" && (
              <label>
                Convives
                <select name="guests">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        {fields !== "garden" && (
          <label>
            Un message pour l’équipe
            <textarea
              name="message"
              rows={3}
              placeholder="Vos questions ou souhaits particuliers…"
            />
          </label>
        )}
        <label className="checkbox">
          <input required name="consent" type="checkbox" />
          J’accepte que mes coordonnées soient utilisées pour répondre à cette
          demande.
        </label>
        <div className="form-actions">
          {fields === "garden" && (
            <button
              type="button"
              className="button button-outline"
              onClick={() => setStep(1)}
            >
              Retour
            </button>
          )}
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Envoi…" : "Préparer ma demande"}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
      {status && (
        <div className="form-status" role="status">
          {status}
          {event && (
            <button
              type="button"
              className="text-link"
              onClick={() => {
                const blob = new Blob(
                  [
                    calendarEvent({
                      title: `Demande à confirmer : ${kind}`,
                      date: event.date,
                      time: event.time,
                      description: subject,
                    }),
                  ],
                  { type: "text/calendar;charset=utf-8" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "rendez-vous-a-confirmer.ics";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Ajouter un rappel à mon agenda <CalendarDays size={16} />
            </button>
          )}
        </div>
      )}
    </form>
  );
}
export function FAQ({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="faq-list">
      {items.map((x, i) => (
        <details key={x.q}>
          <summary>
            <span className="faq-number">0{i + 1}</span>
            {x.q}
            <ChevronDown size={18} />
          </summary>
          <p>{x.a}</p>
        </details>
      ))}
    </div>
  );
}
export function Gallery({
  images,
}: {
  images: { src: string; alt: string }[];
}) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <>
      <div className="photo-grid">
        {images.map((p, i) => (
          <button
            className="gallery-photo"
            key={p.src + i}
            onClick={() => setActive(i)}
            aria-label={`Agrandir : ${p.alt}`}
          >
            <img src={image(p.src)} alt={p.alt} loading="lazy" />
            <span>
              <ArrowUpRight />
            </span>
          </button>
        ))}
      </div>
      {active !== null && (
        <Modal title={images[active].alt} onClose={() => setActive(null)} wide>
          <img
            className="lightbox-image"
            src={image(images[active].src)}
            alt={images[active].alt}
          />
          <div className="gallery-controls">
            <button
              className="button button-outline"
              onClick={() =>
                setActive((active - 1 + images.length) % images.length)
              }
            >
              Précédente
            </button>
            <span>
              {active + 1} / {images.length}
            </span>
            <button
              className="button button-outline"
              onClick={() => setActive((active + 1) % images.length)}
            >
              Suivante
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Article({
  title,
  text,
  category,
  onClose,
}: {
  title: string;
  text: string[];
  category: string;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <article className="article-content">
        <span className="eyebrow">{category} · 4 MIN DE LECTURE</span>
        {text.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>
    </Modal>
  );
}
export function MapPanel({
  kind = "estate",
}: {
  kind?: "estate" | "garden" | "restaurant";
}) {
  const [active, setActive] = useState(0);
  const places =
    kind === "estate"
      ? ["Uccle", "Bruxelles", "Waterloo", "Lasne"]
      : kind === "garden"
        ? ["Lasne", "Waterloo", "Uccle", "Rixensart"]
        : ["Bruxelles"];
  const coord = kind === "restaurant" ? "50.8466,4.3528" : "50.765,4.40";
  return (
    <div className="map-panel">
      <div className="map-art" aria-label={`Zone : ${places.join(", ")}`}>
        <svg viewBox="0 0 800 400" aria-hidden="true">
          <path
            className="map-river"
            d="M0 180Q160 80 290 240T580 180T800 300"
          />
          <path
            className="map-road"
            d="M120 0 330 400M600 0 360 400M0 330 800 100M0 120 800 350M400 0 420 400"
          />
        </svg>
        {places.map((p, i) => (
          <button
            key={p}
            className={`map-pin ${active === i ? "selected" : ""}`}
            style={{ left: `${22 + i * 18}%`, top: `${[38, 58, 28, 48][i]}%` }}
            onClick={() => setActive(i)}
          >
            <span>●</span>
            {p}
          </button>
        ))}
        <span className="map-caption">
          Carte de présentation · positions indicatives
        </span>
      </div>
      <div className="map-info">
        <span className="eyebrow">
          {kind === "garden" ? "NOTRE TERRAIN DE JEU" : "LES BONNES ADRESSES"}
        </span>
        <h3>{places[active]}</h3>
        <p>
          {kind === "garden"
            ? "Des jardins à vivre, en Brabant wallon et au sud de Bruxelles."
            : kind === "restaurant"
              ? "Au cœur de Bruxelles. La bonne table pour un déjeuner, un dîner ou une occasion à célébrer."
              : "Des quartiers choisis pour leur cadre de vie, leur caractère et leurs belles adresses."}
        </p>
        <a
          className="text-link"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(places[active] + ", Belgique")}`}
          target="_blank"
          rel="noopener"
        >
          Explorer sur Google Maps
          <ArrowUpRight size={16} />
        </a>
        {kind === "restaurant" && (
          <iframe
            title="Carte de Bruxelles"
            src={`https://maps.google.com/maps?q=${coord}&z=14&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
    </div>
  );
}
export function Footer({
  brand,
  description,
  links,
  onContact,
}: {
  brand: string;
  description: string;
  links: { label: string; href: string }[];
  onContact: () => void;
}) {
  const [legal, setLegal] = useState(false);
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <a className="brand-name" href="#">
            {brand}.
          </a>
          <p>{description}</p>
        </div>
        <div className="footer-links">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          <button onClick={onContact}>Prendre contact ↗</button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {brand} · Concept de démonstration
          Orbytek
        </span>
        <div>
          <button onClick={() => setLegal(true)}>
            Confidentialité & mentions
          </button>
          <a href="/creations.html">Retour aux créations ↗</a>
        </div>
      </div>
      {legal && (
        <Modal
          title="À propos de cette démonstration"
          onClose={() => setLegal(false)}
        >
          <p>
            Ce site est un concept de portfolio créé par Orbytek. Les marques,
            biens, menus, équipes et exemples présentés sont fictifs. Les
            illustrations ne représentent pas des biens proposés à la vente ni
            des réalisations attestées.
          </p>
          <p>
            Les favoris sont conservés uniquement dans votre navigateur. Sans
            service de contact configuré, les formulaires ne transmettent aucune
            donnée. Les cartes externes se chargent lorsque vous choisissez de
            les afficher.
          </p>
          <p>
            Pour une mise en production : renseigner l’identité légale du
            client, sa politique de confidentialité, ses coordonnées, ses
            certifications vérifiées et ses prestataires de réservation ou de
            paiement.
          </p>
        </Modal>
      )}
    </footer>
  );
}
export function ContactBubble({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="contact-bubble"
      onClick={onClick}
      aria-label="Contacter l’équipe"
    >
      <MessageCircle size={22} />
      <span>Parlons-en</span>
    </button>
  );
}
export function WhatsAppDraft({ brand }: { brand: string }) {
  return (
    <a
      className="text-link"
      href={`https://wa.me/?text=${encodeURIComponent(`Bonjour ${brand}, je souhaite en savoir plus sur votre offre.`)}`}
      target="_blank"
      rel="noopener"
    >
      <MessageCircle size={16} />
      Préparer un message WhatsApp
    </a>
  );
}

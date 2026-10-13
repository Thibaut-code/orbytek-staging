"use client";
import { useEffect, useState } from "react";
import {
  Heart,
  BedDouble,
  Maximize,
  MapPin,
  SlidersHorizontal,
  Scale,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import {
  Experience,
  Header,
  HeroMedia,
  Reveal,
  SectionTitle,
  ArrowUpRight,
  ArrowRight,
  Check,
  Modal,
  LeadForm,
  FAQ,
  MapPanel,
  Footer,
  ContactBubble,
  Article,
  WhatsAppDraft,
  Play,
} from "./shared";
import { properties, image } from "../lib/data";
import { filterProperties } from "../lib/logic.mjs";
const euro = (n: number) =>
  new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
const journals = [
  {
    title: "Bien vendre commence avant la première visite.",
    category: "VENDRE",
    text: [
      "Une vente réussie se prépare. Réunissez les plans, les informations énergétiques, les documents relatifs aux travaux et les renseignements utiles sur votre copropriété, le cas échéant. Un dossier clair aide chaque visiteur à se projeter.",
      "La présentation compte autant que les mètres carrés : lumière naturelle, circulation fluide et photographies soignées rendent un lieu plus lisible. L’objectif est de montrer son potentiel avec justesse.",
      "Le prix demandé doit tenir compte du quartier, de l’état, des volumes et de ventes comparables. Un expert peut vous aider à définir un positionnement cohérent et à suivre la réponse du marché.",
    ],
  },
  {
    title: "Le bon quartier, c’est celui qui vous ressemble.",
    category: "HABITER",
    text: [
      "Avant de choisir une adresse, imaginez vos journées : trajet domicile-travail, écoles, commerces, espaces verts et transports. Visitez le quartier à plusieurs heures pour comprendre son rythme.",
      "Une belle adresse ne suffit pas si le quotidien devient compliqué. Préparez une liste de vos besoins incontournables et de ce sur quoi vous pouvez faire un compromis.",
      "Parlez à votre conseiller de vos habitudes, autant que de votre budget. C’est souvent là que se trouve la différence entre un bien séduisant et un lieu où l’on se sent chez soi.",
    ],
  },
  {
    title: "Les détails qui font la valeur d’un lieu.",
    category: "INSPIRATION",
    text: [
      "La lumière, les proportions et la relation avec l’extérieur transforment la perception d’un intérieur. Ils méritent la même attention que la surface totale.",
      "Lors d’une visite, regardez la qualité des finitions, le rangement, l’orientation et la possibilité d’adapter les espaces à votre vie. Prenez le temps de comprendre les coûts d’entretien.",
      "Un lieu de caractère se reconnaît aussi à son potentiel. Une circulation repensée ou une meilleure connexion au jardin peuvent changer l’expérience quotidienne.",
    ],
  },
];
export default function Estate() {
  const [panel, setPanel] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    price: "",
    area: "",
    beds: "",
    type: "",
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showFav, setShowFav] = useState(false);
  const [compared, setCompared] = useState<string[]>([]);
  const [map, setMap] = useState(false);
  const [article, setArticle] = useState<number | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("aurelia-favorites") || "[]",
      );
      if (Array.isArray(saved))
        setFavorites(saved.filter((x) => properties.some((p) => p.id === x)));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem("aurelia-favorites", JSON.stringify(favorites));
      } catch {}
    }
  }, [favorites, loaded]);
  const toggleFavorite = (id: string) =>
    setFavorites((x) =>
      x.includes(id) ? x.filter((v) => v !== id) : [...x, id],
    );
  const visible = filterProperties(properties, filters).filter(
    (p: (typeof properties)[number]) => !showFav || favorites.includes(p.id),
  );
  const selectCompare = (id: string) =>
    setCompared((x) =>
      x.includes(id)
        ? x.filter((v) => v !== id)
        : x.length < 3
          ? [...x, id]
          : x,
    );
  const selected = properties.filter((p) => compared.includes(p.id));
  return (
    <Experience theme="estate">
      <Header
        brand="aurelia"
        sub="L’immobilier, autrement"
        links={[
          { label: "Nos propriétés", href: "#proprietes" },
          { label: "Notre approche", href: "#approche" },
          { label: "Le journal", href: "#journal" },
        ]}
        cta="Estimer mon bien"
        onAction={() => setPanel("estimate")}
        darkToggle
      />
      <main id="main">
        <section className="hero">
          <HeroMedia name="estate-hero" video />
          <div className="wrap-premium">
            <Reveal className="hero-content">
              <span className="eyebrow">
                BRUXELLES & BRABANT WALLON · IMMOBILIER DE CARACTÈRE
              </span>
              <h1>
                Certains lieux
                <br />
                changent <em>une vie.</em>
              </h1>
              <p className="hero-copy">
                Nous trouvons celui qui vous ressemble.
                <br />
                Des adresses singulières. Un regard attentif.
                <br />
                Une relation qui fait la différence.
              </p>
              <div className="hero-actions">
                <a className="button" href="#proprietes">
                  Découvrir nos propriétés
                  <ArrowUpRight size={16} />
                </a>
                <button
                  className="text-link"
                  onClick={() => setPanel("booking")}
                >
                  Rencontrons-nous
                  <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>
          </div>
          <span className="vertical-caption">UNE NOUVELLE FAÇON D’HABITER</span>
          <span className="hero-index">01</span>
          <div className="hero-bottom">
            <span>
              <MapPin size={13} />
              VILLA HORIZON · UCCLE
            </span>
            <span>285 M² · 4 CHAMBRES · JARDIN PRIVATIF</span>
            <a href="#proprietes">LA COLLECTION ↓</a>
          </div>
        </section>
        <div className="wrap-premium">
          <div className="stats-strip">
            {[
              ["06", "adresses dans cette collection"],
              ["04", "communes à explorer"],
              ["01", "interlocuteur à vos côtés"],
              ["100 %", "d’attention à votre projet"],
            ].map(([n, t]) => (
              <div className="stat" key={t}>
                <strong>{n}</strong>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <section className="section" id="proprietes">
            <div className="section-heading">
              <SectionTitle
                eyebrow="LA COLLECTION AURELIA"
                title={
                  <>
                    Des adresses.
                    <br />
                    <em>Des possibilités.</em>
                  </>
                }
                body="Chaque lieu a quelque chose à raconter. Trouvez celui qui ouvrira votre prochain chapitre."
              />
              <button className="text-link" onClick={() => setPanel("booking")}>
                Confiez-nous votre recherche
                <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="filter-bar">
              <label>
                Localisation
                <input
                  aria-label="Localisation"
                  placeholder="Ville ou commune"
                  value={filters.location}
                  onChange={(e) =>
                    setFilters({ ...filters, location: e.target.value })
                  }
                />
              </label>
              <label>
                Budget maximum
                <select
                  value={filters.price}
                  onChange={(e) =>
                    setFilters({ ...filters, price: e.target.value })
                  }
                >
                  <option value="">Tous les budgets</option>
                  {[700000, 900000, 1100000, 1500000].map((n) => (
                    <option key={n} value={n}>
                      {euro(n)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Type de bien
                <select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value })
                  }
                >
                  <option value="">Tous les biens</option>
                  <option>Villa</option>
                  <option>Maison</option>
                  <option>Appartement</option>
                </select>
              </label>
              <label>
                Surface minimum
                <select
                  value={filters.area}
                  onChange={(e) =>
                    setFilters({ ...filters, area: e.target.value })
                  }
                >
                  <option value="">Toutes les surfaces</option>
                  {[150, 200, 250, 300].map((n) => (
                    <option value={n} key={n}>
                      {n} m² et plus
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Chambres
                <select
                  value={filters.beds}
                  onChange={(e) =>
                    setFilters({ ...filters, beds: e.target.value })
                  }
                >
                  <option value="">Peu importe</option>
                  {[2, 3, 4, 5].map((n) => (
                    <option value={n} key={n}>
                      {n} et plus
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button-outline"
                aria-label="Réinitialiser les filtres"
                onClick={() =>
                  setFilters({
                    location: "",
                    price: "",
                    area: "",
                    beds: "",
                    type: "",
                  })
                }
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
            <div className="catalog-toolbar">
              <span>
                {visible.length} propriété{visible.length > 1 ? "s" : ""} ·
                Collection de démonstration
              </span>
              <div>
                <button
                  className={showFav ? "active" : ""}
                  onClick={() => setShowFav(!showFav)}
                >
                  Favoris ({favorites.length})
                </button>
                <button onClick={() => setPanel("compare")}>
                  Comparer ({compared.length}/3)
                </button>
                <button
                  className={map ? "active" : ""}
                  onClick={() => setMap(!map)}
                >
                  {map ? "Masquer la carte" : "Voir la carte"}
                </button>
              </div>
            </div>
            {map && (
              <div className="mb-8">
                <MapPanel />
              </div>
            )}
            <div className="property-grid">
              {visible.map((p: (typeof properties)[number], i: number) => (
                <Reveal key={p.id} delay={i * 0.04}>
                  <article className="property-card">
                    <div className="property-image">
                      <a
                        href={`biens/${p.id}/`}
                        aria-label={`Découvrir ${p.title}`}
                      >
                        <img
                          src={image(p.image)}
                          alt={`${p.title}, ${p.type.toLowerCase()} à ${p.city}`}
                          loading="lazy"
                        />
                      </a>
                      <span className="property-tag">{p.tag}</span>
                      <button
                        className={`favorite ${favorites.includes(p.id) ? "saved" : ""}`}
                        onClick={() => toggleFavorite(p.id)}
                        aria-label={`${favorites.includes(p.id) ? "Retirer" : "Ajouter"} ${p.title} ${favorites.includes(p.id) ? "des" : "aux"} favoris`}
                        aria-pressed={favorites.includes(p.id)}
                      >
                        <Heart
                          size={15}
                          fill={
                            favorites.includes(p.id) ? "currentColor" : "none"
                          }
                        />
                      </button>
                    </div>
                    <div className="property-body">
                      <span className="property-location">
                        <MapPin size={12} />
                        {p.city} · {p.type}
                      </span>
                      <a href={`biens/${p.id}/`}>
                        <h3>{p.title}</h3>
                      </a>
                      <div className="property-specs">
                        <span>
                          <Maximize size={13} />
                          {p.area} m²
                        </span>
                        <span>
                          <BedDouble size={13} />
                          {p.beds} chambres
                        </span>
                        <span>PEB {p.energy}</span>
                      </div>
                      <a className="property-price" href={`biens/${p.id}/`}>
                        {euro(p.price)}
                        <ArrowUpRight size={18} />
                      </a>
                      <label className="compare-option">
                        <input
                          type="checkbox"
                          checked={compared.includes(p.id)}
                          disabled={
                            compared.length === 3 && !compared.includes(p.id)
                          }
                          onChange={() => selectCompare(p.id)}
                        />
                        Ajouter au comparateur
                      </label>
                    </div>
                  </article>
                </Reveal>
              ))}
              {!visible.length && (
                <div className="empty-state">
                  <p>
                    {showFav
                      ? "Aucun favori ne correspond à cette recherche."
                      : "Aucun bien ne correspond à ces critères."}
                  </p>
                  <button
                    className="button button-outline"
                    onClick={() => {
                      setShowFav(false);
                      setFilters({
                        location: "",
                        price: "",
                        area: "",
                        beds: "",
                        type: "",
                      });
                    }}
                  >
                    Voir toute la collection
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
        <section className="section contrast-section" id="approche">
          <div className="wrap-premium split-section">
            <Reveal className="split-image">
              <img
                src={image("estate-interior")}
                alt="Un intérieur lumineux aux matières naturelles"
                loading="lazy"
              />
              <div className="image-label">
                <span>LE SENS DU DÉTAIL</span>
                <ArrowUpRight size={16} />
              </div>
            </Reveal>
            <Reveal className="split-copy">
              <span className="eyebrow">UN AUTRE REGARD SUR L’IMMOBILIER</span>
              <h2>
                Votre projet mérite
                <br />
                plus qu’une adresse.
              </h2>
              <p>
                Vendre, acheter, commencer un nouveau chapitre. Derrière chaque
                transaction, il y a une histoire qui mérite d’être comprise.
              </p>
              <p>
                Nous prenons le temps de vous écouter. Puis nous faisons ce que
                nous aimons : révéler la valeur d’un lieu, choisir les bons
                mots, soigner chaque rencontre.
              </p>
              <ul className="feature-list">
                <li>
                  <Check />
                  Une stratégie de vente adaptée à votre bien
                </li>
                <li>
                  <Check />
                  Une présentation photographique soignée
                </li>
                <li>
                  <Check />
                  Un accompagnement de la première visite à la signature
                </li>
              </ul>
              <button className="button" onClick={() => setPanel("estimate")}>
                Parlons de votre bien
                <ArrowUpRight size={16} />
              </button>
            </Reveal>
          </div>
        </section>
        <div className="wrap-premium">
          <section className="section">
            <SectionTitle
              eyebrow="LE DÉBUT D’UN NOUVEAU CHAPITRE"
              title="Des lieux qui ont trouvé leur histoire."
              body="Une sélection illustrative de ventes et de rencontres. Les exemples ci-dessous font partie du concept de démonstration."
            />
            <div className="photo-grid">
              {["estate-house", "estate-terrace", "estate-pool"].map(
                (src, i) => (
                  <div className="gallery-photo" key={src}>
                    <img
                      src={image(src)}
                      alt={
                        [
                          "Maison de caractère",
                          "Appartement avec terrasse",
                          "Villa avec piscine",
                        ][i]
                      }
                      loading="lazy"
                    />
                    <span
                      style={{
                        width: "auto",
                        borderRadius: 0,
                        padding: "10px",
                        fontSize: 9,
                      }}
                    >
                      VENDU · EXEMPLE
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>
          <section className="section pt-0">
            <SectionTitle
              eyebrow="LA CONFIANCE SE CONSTRUIT"
              title="Des projets, des rencontres."
            />
            <div className="testimonials">
              {[
                [
                  "Une écoute rare. Nous avons surtout apprécié le temps consacré à comprendre notre façon de vivre.",
                  "Claire & Thomas · Achat à Uccle",
                ],
                [
                  "Une présentation soignée et un suivi clair à chaque étape. Nous savions toujours où nous en étions.",
                  "Sophie · Vente à Waterloo",
                ],
                [
                  "Les bonnes questions dès le premier rendez-vous. Une relation simple, attentive et professionnelle.",
                  "Marc · Recherche à Bruxelles",
                ],
              ].map(([q, c], i) => (
                <div className="testimonial" key={c}>
                  <div className="stars">★★★★★</div>
                  <blockquote>« {q} »</blockquote>
                  <cite>{c} · témoignage illustratif</cite>
                  <br />
                  <button
                    className="video-button"
                    onClick={() => setPanel(`video-${i}`)}
                  >
                    <Play size={13} />
                    Leur histoire en images
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section className="section pt-0">
            <SectionTitle
              eyebrow="LES PERSONNES FONT LA DIFFÉRENCE"
              title="Des regards experts. Une même attention."
            />
            <div className="team-grid">
              {[
                ["EL", "Emma Laurent", "Conseil & stratégie de vente"],
                ["AM", "Alexandre Moreau", "Propriétés de caractère"],
                ["CD", "Camille Dubois", "Accompagnement acquéreur"],
              ].map(([initials, name, role]) => (
                <Reveal className="expert" key={name}>
                  <div className="expert-avatar">{initials}</div>
                  <h3>{name}</h3>
                  <p>{role}</p>
                  <p className="fine-print">
                    Équipe fictive de la démonstration
                  </p>
                </Reveal>
              ))}
            </div>
            <div className="promise-strip">
              {[
                [
                  ShieldCheck,
                  "Un dossier clair",
                  "Les documents et informations utiles, réunis avant les premières visites.",
                ],
                [
                  KeyRound,
                  "Un suivi attentif",
                  "Un interlocuteur identifié et des étapes expliquées.",
                ],
                [
                  Scale,
                  "Des engagements vérifiables",
                  "Les agréments IPI et garanties du futur client seront présentés après vérification.",
                ],
              ].map(([Icon, title, text]: any) => (
                <div key={title}>
                  <Icon size={25} className="mb-5" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="section pt-0" id="journal">
            <SectionTitle
              eyebrow="LE JOURNAL AURELIA"
              title="Quelques idées pour la suite."
            />
            <div className="journal-grid">
              {journals.map((j, i) => (
                <Reveal className="journal-card" key={j.title}>
                  <span className="eyebrow">
                    {j.category} · CONSEILS & INSPIRATION
                  </span>
                  <h3>{j.title}</h3>
                  <button className="text-link" onClick={() => setArticle(i)}>
                    Lire l’article
                    <ArrowUpRight size={15} />
                  </button>
                </Reveal>
              ))}
            </div>
          </section>
          <section className="section pt-0">
            <SectionTitle
              eyebrow="VOS QUESTIONS, SIMPLEMENT"
              title="Avant de faire le premier pas."
            />
            <FAQ
              items={[
                {
                  q: "Comment se déroule une estimation ?",
                  a: "Vous présentez votre bien et votre projet. Un conseiller organise ensuite une visite, étudie les caractéristiques et les ventes comparables, puis explique son positionnement. La demande en ligne sert à préparer cet échange.",
                },
                {
                  q: "Puis-je organiser une visite à distance ?",
                  a: "Oui, une visite vidéo ou une visite virtuelle peut compléter le dossier. Les contenus réels doivent être fournis pour chaque bien ; les visuels de ce portfolio sont illustratifs.",
                },
                {
                  q: "Mes favoris restent-ils enregistrés ?",
                  a: "Vos favoris sont conservés dans ce navigateur. Ils restent disponibles lors de votre prochaine visite, sauf si vous effacez les données du navigateur.",
                },
                {
                  q: "Quels frais dois-je prévoir ?",
                  a: "Les honoraires, conditions de mission et frais éventuels sont précisés par l’agence avant tout engagement. Cette démonstration ne propose aucun contrat de vente.",
                },
              ]}
            />
          </section>
        </div>
        <section className="cta-section">
          <span className="eyebrow">
            UNE ESTIMATION. UNE RENCONTRE. UN PREMIER PAS.
          </span>
          <h2>
            Et si nous parlions
            <br />
            <em>de votre prochain chapitre ?</em>
          </h2>
          <p>Votre bien a une histoire. Commençons par l’écouter.</p>
          <button className="button" onClick={() => setPanel("estimate")}>
            Demander mon estimation
            <ArrowUpRight size={16} />
          </button>
        </section>
      </main>
      <Footer
        brand="aurelia"
        description="Des lieux singuliers. Des relations durables. L’immobilier de caractère à Bruxelles et en Brabant wallon."
        links={[
          { label: "La collection", href: "#proprietes" },
          { label: "Notre approche", href: "#approche" },
          { label: "Le journal", href: "#journal" },
        ]}
        onContact={() => setPanel("contact")}
      />
      <ContactBubble onClick={() => setPanel("contact")} />
      {panel && (
        <Modal
          title={
            panel === "estimate"
              ? "Quelle est l’histoire de votre bien ?"
              : panel === "compare"
                ? "Votre sélection, côte à côte."
                : panel.startsWith("video")
                  ? "Une histoire à raconter."
                  : panel === "booking"
                    ? "Prenons le temps de nous rencontrer."
                    : "Votre projet commence ici."
          }
          onClose={() => setPanel("")}
          wide={panel === "compare"}
        >
          {panel === "compare" ? (
            selected.length ? (
              <>
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>Votre sélection</th>
                      {selected.map((p) => (
                        <th key={p.id}>
                          <a href={`biens/${p.id}/`}>{p.title} ↗</a>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Commune", (p: any) => p.city],
                      ["Prix", (p: any) => euro(p.price)],
                      ["Surface", (p: any) => `${p.area} m²`],
                      ["Chambres", (p: any) => p.beds],
                      ["PEB", (p: any) => p.energy],
                      [
                        "Extérieur",
                        (p: any) =>
                          p.land ? `${p.land} m² de terrain` : "Terrasse",
                      ],
                    ].map(([label, fn]: any) => (
                      <tr key={label}>
                        <th>{label}</th>
                        {selected.map((p) => (
                          <td key={p.id}>{fn(p)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="fine-print">
                  Sélectionnez jusqu’à trois biens pour comparer leurs
                  caractéristiques.
                </p>
              </>
            ) : (
              <p>
                Cochez « Ajouter au comparateur » sur les biens qui vous
                intéressent.
              </p>
            )
          ) : panel.startsWith("video") ? (
            <>
              <video
                controls
                playsInline
                poster={image("estate-interior")}
                className="w-full"
                src="/demos/videos/estate-hero.mp4"
              />
              <p className="fine-print">
                Film d’ambiance illustratif. Les témoignages vidéo du client
                seront ajoutés avec leur autorisation.
              </p>
            </>
          ) : (
            <>
              <LeadForm
                kind={
                  panel === "estimate"
                    ? "Estimation immobilière"
                    : panel === "booking"
                      ? "Rendez-vous agence"
                      : "Contact immobilier"
                }
                fields={
                  panel === "estimate"
                    ? "estimate"
                    : panel === "booking"
                      ? "booking"
                      : "contact"
                }
              />
              <div className="mt-6">
                <WhatsAppDraft brand="Aurelia" />
              </div>
            </>
          )}
        </Modal>
      )}
      {article !== null && (
        <Article {...journals[article]} onClose={() => setArticle(null)} />
      )}
    </Experience>
  );
}

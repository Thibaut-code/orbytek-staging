"use client";
import { useState } from "react";
import {
  Sprout,
  Scissors,
  Trees,
  Fence,
  Droplets,
  Waves,
  Leaf,
  Sun,
  MoveHorizontal,
  ShieldCheck,
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
import { image, projects } from "../lib/data";
import { landscapeEstimate } from "../lib/logic.mjs";
const services = [
  {
    icon: Sprout,
    name: "Création de jardins",
    text: "Un jardin pensé comme une pièce de vie. Végétal, lumière et matières, en équilibre.",
    key: "creation",
  },
  {
    icon: Leaf,
    name: "Entretien & tonte",
    text: "Un jardin qui reste beau au fil des saisons. Entretien régulier ou intervention ponctuelle.",
    key: "entretien",
  },
  {
    icon: Scissors,
    name: "Taille de haies",
    text: "Des contours soignés, une taille adaptée et le respect du rythme des végétaux.",
    key: "haies",
  },
  {
    icon: Sun,
    name: "Terrasses",
    text: "Bois, pierre, belles perspectives. Un espace pour recevoir et ralentir.",
    key: "terrasse",
  },
  {
    icon: Fence,
    name: "Clôtures",
    text: "Délimiter, protéger et préserver votre intimité, sans fermer le paysage.",
    key: "cloture",
  },
  {
    icon: Trees,
    name: "Élagage",
    text: "Accompagner les arbres avec une intervention raisonnée et adaptée à leur état.",
    key: "elagage",
  },
  {
    icon: Droplets,
    name: "Arrosage automatique",
    text: "L’eau au bon endroit, au bon moment. Une installation pensée pour votre jardin.",
    key: "arrosage",
  },
  {
    icon: Waves,
    name: "Piscines naturelles",
    text: "Une baignade intégrée au paysage. Un projet à étudier avec les spécialistes du bassin.",
    key: "piscine",
  },
  {
    icon: ShieldCheck,
    name: "Suivi saisonnier",
    text: "Observer, ajuster, entretenir. Un accompagnement pour que votre jardin grandisse bien.",
    key: "entretien",
  },
];
const journals = [
  {
    title: "Un jardin beau en hiver aussi.",
    category: "LES SAISONS",
    text: [
      "Un jardin ne s’arrête pas à l’automne. Les silhouettes des arbres, les graminées et les persistants donnent du relief lorsque les floraisons se font plus discrètes.",
      "Avant de planter, observez le sol, l’exposition et les vues depuis la maison. Une palette adaptée à ces conditions demandera généralement moins de corrections et sera plus cohérente dans le temps.",
      "Laissez une place à la vie du jardin : feuilles au pied des massifs, abris pour la petite faune et floraisons étalées enrichissent l’espace au fil des saisons.",
    ],
  },
  {
    title: "Bois ou pierre pour votre terrasse ?",
    category: "LES MATIÈRES",
    text: [
      "Le choix d’une terrasse commence par l’usage : repas, repos, circulation, exposition au soleil et relation avec la maison. La matière vient ensuite.",
      "Le bois apporte une présence chaleureuse et demande un suivi adapté à l’essence et à la pose. La pierre offre un registre plus minéral ; son épaisseur, sa finition et son comportement humide doivent être étudiés.",
      "Dans les deux cas, la préparation du support, la gestion des eaux et les détails de raccord sont essentiels. Comparez des solutions complètes, pas uniquement un prix au mètre carré.",
    ],
  },
  {
    title: "Moins d’eau, plus de bon sens.",
    category: "LE VÉGÉTAL",
    text: [
      "Une gestion sobre de l’eau commence par des plantes adaptées au sol et à l’exposition. Les besoins d’un massif récent sont différents de ceux d’un jardin bien installé.",
      "Le paillage et un arrosage ciblé limitent certaines pertes. Observez l’humidité du sol avant d’arroser et adaptez les fréquences à la météo.",
      "Une installation automatique doit être réglée, suivie et ajustée. Elle gagne à être associée à une conception attentive plutôt qu’à compenser des plantations mal adaptées.",
    ],
  },
];
export default function Garden() {
  const [panel, setPanel] = useState("");
  const [category, setCategory] = useState("Tous");
  const [position, setPosition] = useState(50);
  const [service, setService] = useState("creation");
  const [area, setArea] = useState(150);
  const changeService = (next: string) => {
    setService(next);
    setArea(next === "elagage" ? 2 : service === "elagage" ? 150 : area);
  };
  const [evacuation, setEvacuation] = useState(false);
  const [project, setProject] = useState<(typeof projects)[number] | null>(
    null,
  );
  const [article, setArticle] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const estimate = landscapeEstimate(
    service,
    area,
    evacuation ? ["evacuation"] : [],
  );
  return (
    <Experience theme="garden">
      <Header
        brand="vert & pierre"
        sub="Paysages à vivre"
        links={[
          { label: "Notre regard", href: "#regard" },
          { label: "Savoir-faire", href: "#services" },
          { label: "Nos jardins", href: "#realisations" },
          { label: "Votre projet", href: "#estimation" },
        ]}
        cta="Parlons de votre jardin"
        onAction={() => setPanel("quote")}
      />
      <main id="main">
        <section className="hero">
          <HeroMedia name="garden-hero" />
          <div className="wrap-premium">
            <Reveal className="hero-content">
              <span className="eyebrow">
                PAYSAGISTE · BRABANT WALLON & SUD DE BRUXELLES
              </span>
              <h1>
                Dehors,
                <br />
                la vie <em>prend racine.</em>
              </h1>
              <p className="hero-copy">
                Des jardins qui vous ressemblent.
                <br />
                Du premier trait aux dernières plantations,
                <br />
                nous donnons forme à votre vie dehors.
              </p>
              <div className="hero-actions">
                <button className="button" onClick={() => setPanel("quote")}>
                  Imaginons votre jardin
                  <ArrowUpRight size={16} />
                </button>
                <a className="text-link" href="#realisations">
                  Voir nos jardins
                  <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>
          </div>
          <span className="vertical-caption">
            LE VÉGÉTAL. LA MATIÈRE. LA VIE.
          </span>
          <div className="hero-bottom">
            <span>
              <Sprout size={14} />
              DES ESPACES POUR SE SENTIR BIEN
            </span>
            <span>CONCEPTION · AMÉNAGEMENT · ENTRETIEN</span>
            <a href="#regard">LAISSEZ-VOUS INSPIRER ↓</a>
          </div>
        </section>
        <div className="wrap-premium">
          <div className="stats-strip">
            {[
              ["09", "savoir-faire complémentaires"],
              ["04", "jardins dans cette collection"],
              ["03", "étapes, un projet partagé"],
              ["01", "vision : votre vie dehors"],
            ].map(([n, t]) => (
              <div className="stat" key={t}>
                <strong>{n}</strong>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <section className="section split-section" id="regard">
            <Reveal className="split-copy">
              <span className="eyebrow">NOTRE REGARD</span>
              <h2>
                Un beau jardin
                <br />
                commence par
                <br />
                <em>une bonne écoute.</em>
              </h2>
              <p>
                Comment aimez-vous vivre dehors ? Un café au soleil, de grandes
                tablées, un coin d’ombre ou le plaisir de voir le jardin changer
                avec les saisons.
              </p>
              <p>
                Nous partons de ces moments. Puis nous composons avec le lieu,
                son sol, sa lumière et vos envies. Pour dessiner un jardin
                juste, agréable à vivre et pensé pour durer.
              </p>
              <ul className="feature-list">
                <li>
                  <Check />
                  Des végétaux adaptés à votre terrain
                </li>
                <li>
                  <Check />
                  Des matières qui dialoguent avec la maison
                </li>
                <li>
                  <Check />
                  Un entretien anticipé dès la conception
                </li>
              </ul>
              <button className="text-link" onClick={() => setPanel("visit")}>
                Faire le tour de votre jardin
                <ArrowUpRight size={16} />
              </button>
            </Reveal>
            <Reveal className="split-image">
              <img
                src={image("garden-detail")}
                alt="Le soin des plantations et du travail au jardin"
                loading="lazy"
              />
              <div className="image-label">
                <span>UNE ATTENTION À CHAQUE DÉTAIL</span>
                <Sprout size={18} />
              </div>
            </Reveal>
          </section>
          <section className="section pt-0" id="services">
            <SectionTitle
              eyebrow="DU PREMIER CROQUIS À CHAQUE SAISON"
              title={
                <>
                  Tout ce qui fait
                  <br />
                  <em>un jardin à vivre.</em>
                </>
              }
              body="Un projet global ou une intervention ciblée : le même soin, à chaque échelle."
            />
            <div className="service-grid">
              {services.map((s) => (
                <Reveal className="service-card" key={s.name}>
                  <s.icon />
                  <h3>{s.name}</h3>
                  <p>{s.text}</p>
                  <button
                    className="text-link"
                    onClick={() => {
                      changeService(s.key);
                      setPanel("quote");
                    }}
                  >
                    Parlons de ce besoin
                    <ArrowUpRight size={13} />
                  </button>
                </Reveal>
              ))}
            </div>
          </section>
        </div>
        <section className="section contrast-section">
          <div className="wrap-premium">
            <div className="section-heading">
              <SectionTitle
                eyebrow="CHANGER DE PERSPECTIVE"
                title={
                  <>
                    Le même espace.
                    <br />
                    <em>Une autre vie.</em>
                  </>
                }
                body="Faites glisser le curseur pour explorer deux ambiances de jardin."
              />
              <span className="text-link">
                <MoveHorizontal size={16} />
                Glissez pour découvrir
              </span>
            </div>
            <div
              className="before-after"
              style={{ "--position": `${position}%` } as React.CSSProperties}
            >
              <img
                src={image("garden-after")}
                alt="Inspiration après : jardin paysager aux lignes structurées"
                loading="lazy"
              />
              <img
                className="before-layer"
                src={image("garden-before")}
                alt="Inspiration avant : espace de jardin à aménager"
                loading="lazy"
              />
              <div className="slider-rule" />
              <span className="slider-knob">↔</span>
              <span className="before-after-label before">
                AVANT · INSPIRATION
              </span>
              <span className="before-after-label after">
                APRÈS · INSPIRATION
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                aria-label="Comparaison avant après"
                aria-valuetext={`${position} % de la vue avant`}
              />
            </div>
            <p className="fine-print">
              Deux photos d’inspiration pour démontrer le comparateur. Elles ne
              représentent pas la transformation réelle d’un même terrain.
            </p>
          </div>
        </section>
        <div className="wrap-premium">
          <section className="section" id="realisations">
            <div className="section-heading">
              <SectionTitle
                eyebrow="LES JARDINS DE LA COLLECTION"
                title={
                  <>
                    De belles idées.
                    <br />
                    <em>Des lieux à habiter.</em>
                  </>
                }
                body="Des projets illustratifs pour découvrir les possibilités d’un jardin bien pensé."
              />
              <button
                className="text-link"
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? "Masquer la carte" : "Explorer les communes"}
                <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="pill-row">
              {[
                "Tous",
                "Création",
                "Terrasses",
                "Entretien",
                "Piscines naturelles",
              ].map((c) => (
                <button
                  className={`pill ${category === c ? "active" : ""}`}
                  key={c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {showMap && (
              <div className="mb-10">
                <MapPanel kind="garden" />
              </div>
            )}
            <div className="project-grid-premium">
              {projects
                .filter((p) => category === "Tous" || p.category === category)
                .map((p) => (
                  <Reveal key={p.id}>
                    <button
                      className="project-photo"
                      onClick={() => setProject(p)}
                      aria-label={`Découvrir ${p.title}`}
                    >
                      <img src={image(p.image)} alt={p.title} loading="lazy" />
                      <span>
                        <ArrowUpRight size={18} />
                      </span>
                    </button>
                    <div className="project-info">
                      <div>
                        <span className="eyebrow">
                          {p.category} · {p.city}
                        </span>
                        <h3>{p.title}</h3>
                      </div>
                      <span>{p.area}</span>
                    </div>
                  </Reveal>
                ))}
            </div>
          </section>
        </div>
        <section className="section contrast-section" id="estimation">
          <div className="wrap-premium estimate-layout">
            <Reveal className="split-copy">
              <span className="eyebrow">
                UNE PREMIÈRE IDÉE, SANS ENGAGEMENT
              </span>
              <h2>
                Votre projet
                <br />
                commence
                <br />
                <em>à prendre forme.</em>
              </h2>
              <p>
                Explorez une enveloppe indicative pour votre jardin. Le terrain,
                l’accès, les matériaux et le niveau de finition font ensuite
                toute la différence.
              </p>
              <p>
                Lors d’une visite, nous affinons vos besoins et préparons un
                devis détaillé. Ce simulateur vous aide simplement à démarrer la
                conversation.
              </p>
              <button className="text-link" onClick={() => setPanel("visit")}>
                Prévoir une visite conseil
                <ArrowUpRight size={16} />
              </button>
            </Reveal>
            <Reveal className="estimate-card">
              <label>
                Votre besoin
                <select
                  value={service}
                  onChange={(e) => changeService(e.target.value)}
                >
                  {services
                    .filter((s, i) => i < 8)
                    .map((s) => (
                      <option value={s.key} key={s.name}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {service === "elagage"
                  ? "Nombre d’arbres"
                  : ["haies", "cloture"].includes(service)
                    ? "Longueur à traiter"
                    : "Surface estimée"}
                <input
                  type="range"
                  min={service === "elagage" ? 1 : 10}
                  max={service === "elagage" ? 10 : 800}
                  step={service === "elagage" ? 1 : 10}
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  aria-label="Surface ou longueur du projet"
                />
                <span className="range-value">
                  <span>
                    {service === "elagage" ? 1 : 10} {estimate?.unit}
                  </span>
                  <strong>
                    {area} {estimate?.unit}
                  </strong>
                  <span>
                    {service === "elagage" ? 10 : 800} {estimate?.unit}
                  </span>
                </span>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={evacuation}
                  onChange={(e) => setEvacuation(e.target.checked)}
                />
                Inclure une provision d’évacuation des déchets verts
              </label>
              <div className="estimate-result">
                <span className="eyebrow">ENVELOPPE INDICATIVE</span>
                <strong>
                  {estimate
                    ? `${new Intl.NumberFormat("fr-BE").format(estimate.min)} – ${new Intl.NumberFormat("fr-BE").format(estimate.max)} €`
                    : "Précisez votre projet"}
                </strong>
                <span>
                  {service === "entretien" || service === "haies"
                    ? "Par intervention · hypothèses de démonstration"
                    : "Hors contraintes particulières · hypothèses de démonstration"}
                </span>
              </div>
              <button
                className="button w-full"
                onClick={() => setPanel("quote")}
              >
                Affinons ce projet ensemble
                <ArrowUpRight size={16} />
              </button>
              <p className="fine-print">
                Simulation hors TVA, sans valeur de devis. Barèmes illustratifs
                à remplacer par ceux du professionnel. Élagage et bassin : une
                visite technique est indispensable.
              </p>
            </Reveal>
          </div>
        </section>
        <div className="wrap-premium">
          <section className="section">
            <SectionTitle
              eyebrow="CHAQUE ÉTAPE A SON IMPORTANCE"
              title="Du premier échange au premier été."
            />
            <div className="steps-grid process-steps">
              {[
                [
                  "01",
                  "On écoute.",
                  "Une visite, des questions et l’observation du lieu. Votre quotidien guide les premières idées.",
                ],
                [
                  "02",
                  "On dessine.",
                  "Un projet expliqué, des matières choisies et un devis détaillé. Vous savez où nous allons.",
                ],
                [
                  "03",
                  "On fait grandir.",
                  "Un chantier suivi, des plantations soignées et des conseils pour accompagner les saisons.",
                ],
              ].map(([n, t, p]) => (
                <Reveal className="step" key={n}>
                  <div className="step-number">{n}</div>
                  <h3>{t}</h3>
                  <p>{p}</p>
                </Reveal>
              ))}
            </div>
            <div className="promise-strip">
              {[
                [
                  "Un devis lisible",
                  "Des prestations détaillées, des options expliquées, un calendrier partagé.",
                ],
                [
                  "Des conseils après le chantier",
                  "Un jardin évolue. Nous préparons son entretien avec vous dès le départ.",
                ],
                [
                  "Des engagements documentés",
                  "Assurances, certifications et garanties du client seront affichées après vérification.",
                ],
              ].map(([h, p]) => (
                <div key={h}>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="section pt-0">
            <SectionTitle
              eyebrow="LES GENS DERRIÈRE LES JARDINS"
              title="Des mains. Des idées. Du soin."
            />
            <div className="team-grid">
              {[
                ["ML", "Mathilde Leclerc", "Conception & regard paysager"],
                ["TR", "Thomas Renard", "Aménagement & matières"],
                ["NB", "Nora Bernard", "Végétal & suivi saisonnier"],
              ].map(([initials, name, role]) => (
                <Reveal className="expert" key={name}>
                  <div className="expert-avatar">{initials}</div>
                  <h3>{name}</h3>
                  <p>{role}</p>
                  <p className="fine-print">Équipe fictive de ce concept</p>
                </Reveal>
              ))}
            </div>
          </section>
          <section className="section pt-0">
            <SectionTitle
              eyebrow="LE BONHEUR SE VOIT DEHORS"
              title="Des jardins qui trouvent leur place."
            />
            <div className="testimonials">
              {[
                [
                  "Nous avons enfin un jardin dans lequel nous vivons vraiment. Le coin repas est devenu notre endroit préféré.",
                  "Anne & Julien · Lasne",
                ],
                [
                  "Des conseils clairs, de belles matières et un chantier suivi avec attention.",
                  "Paul · Waterloo",
                ],
                [
                  "Le jardin reste beau au fil des saisons, avec un entretien qui correspond à notre rythme.",
                  "Caroline · Uccle",
                ],
              ].map(([q, n]) => (
                <div className="testimonial" key={n}>
                  <div className="stars">★★★★★</div>
                  <blockquote>« {q} »</blockquote>
                  <cite>{n} · avis illustratif</cite>
                  <br />
                  <button
                    className="video-button"
                    onClick={() => setPanel("video")}
                  >
                    <Play size={13} />
                    Un jardin en images
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section className="section pt-0" id="conseils">
            <SectionTitle
              eyebrow="LE CARNET DU JARDIN"
              title="Quelques graines d’inspiration."
            />
            <div className="journal-grid">
              {journals.map((j, i) => (
                <Reveal className="journal-card" key={j.title}>
                  <span className="eyebrow">{j.category} · CONSEILS</span>
                  <h3>{j.title}</h3>
                  <button className="text-link" onClick={() => setArticle(i)}>
                    Lire le conseil
                    <ArrowUpRight size={15} />
                  </button>
                </Reveal>
              ))}
            </div>
          </section>
          <section className="section pt-0">
            <SectionTitle
              eyebrow="AVANT DE SORTIR LES PLANS"
              title="Vos questions ont leur place."
            />
            <FAQ
              items={[
                {
                  q: "Par où commencer mon projet de jardin ?",
                  a: "Décrivez votre façon de vivre dehors, vos envies et les contraintes connues. Une visite permet ensuite d’observer le terrain, les accès, le sol et l’exposition avant de proposer une solution.",
                },
                {
                  q: "Intervenez-vous pour un petit jardin ?",
                  a: "Le concept couvre les jardins de toutes tailles. Le périmètre réel, le minimum d’intervention et les délais seront précisés par le professionnel client.",
                },
                {
                  q: "Le calculateur donne-t-il un prix définitif ?",
                  a: "Non. Il utilise des hypothèses illustratives et ne constitue pas un devis. Le terrassement, les accès, les matériaux et les besoins techniques peuvent modifier fortement le budget.",
                },
                {
                  q: "Peut-on prévoir un entretien régulier ?",
                  a: "Le formulaire permet de sélectionner un entretien ponctuel, mensuel ou saisonnier. Le rythme est défini selon le jardin et les prestations nécessaires.",
                },
                {
                  q: "Quelles garanties accompagne un aménagement ?",
                  a: "Les garanties et conditions contractuelles doivent être définies pour chaque prestation. Elles seront fournies par le professionnel et ne sont pas inventées dans cette démonstration.",
                },
              ]}
            />
          </section>
        </div>
        <section
          className="cta-section"
          style={
            {
              background: "#203b2c",
              color: "#f5f4ec",
              "--muted": "#b7c3af",
            } as React.CSSProperties
          }
        >
          <span className="eyebrow">UN JARDIN COMMENCE PAR UNE RENCONTRE</span>
          <h2>
            Et si votre prochaine
            <br />
            <em>belle pièce était dehors ?</em>
          </h2>
          <p>Parlez-nous de votre lieu. Nous parlerons de vos possibles.</p>
          <button
            className="button button-light"
            style={{ background: "#c4d394", color: "#203b2c" }}
            onClick={() => setPanel("quote")}
          >
            Imaginons votre jardin
            <ArrowUpRight size={16} />
          </button>
        </section>
      </main>
      <Footer
        brand="vert & pierre"
        description="Des paysages à vivre. Conception, aménagement et entretien en Brabant wallon et au sud de Bruxelles."
        links={[
          { label: "Nos savoir-faire", href: "#services" },
          { label: "Les jardins", href: "#realisations" },
          { label: "Le carnet", href: "#conseils" },
        ]}
        onContact={() => setPanel("contact")}
      />
      <ContactBubble onClick={() => setPanel("contact")} />
      {panel && (
        <Modal
          title={
            panel === "video"
              ? "Le jardin, en mouvement."
              : panel === "contact"
                ? "Parlons de vos envies."
                : panel === "visit"
                  ? "Faisons le tour de votre jardin."
                  : "Donnons forme à votre projet."
          }
          onClose={() => setPanel("")}
        >
          {panel === "video" ? (
            <>
              <video
                className="w-full"
                src="/demos/videos/garden-hero.mp4"
                controls
                playsInline
                poster={image("garden-hero")}
              />
              <p className="fine-print">
                Film d’ambiance illustratif. Les témoignages vidéo du client
                seront ajoutés avec son autorisation.
              </p>
            </>
          ) : (
            <>
              <LeadForm
                kind={
                  panel === "contact"
                    ? "Contact paysagiste"
                    : "Visite conseil jardin"
                }
                initialService={
                  {
                    creation: "Création de jardin",
                    entretien: "Entretien de jardin",
                    terrasse: "Terrasse",
                    cloture: "Clôture",
                    haies: "Taille de haies",
                    elagage: "Élagage",
                    arrosage: "Arrosage automatique",
                    piscine: "Piscine naturelle",
                  }[service]
                }
                fields={
                  panel === "quote"
                    ? "garden"
                    : panel === "visit"
                      ? "booking"
                      : "contact"
                }
                subject={
                  panel === "quote"
                    ? `${services.find((s) => s.key === service)?.name} · ${area} ${estimate?.unit} · budget indicatif ${estimate?.min} à ${estimate?.max} €`
                    : ""
                }
              />
              <div className="mt-6">
                <WhatsAppDraft brand="Vert & Pierre" />
              </div>
            </>
          )}
        </Modal>
      )}
      {project && (
        <Modal title={project.title} onClose={() => setProject(null)} wide>
          <img
            className="lightbox-image"
            src={image(project.image)}
            alt={project.title}
          />
          <p className="eyebrow mt-6">
            {project.category} · {project.city} · {project.area}
          </p>
          <p className="mt-5">{project.text}</p>
          <button
            className="button"
            onClick={() => {
              setProject(null);
              setPanel("quote");
            }}
          >
            Un projet comme celui-ci ?<ArrowUpRight size={16} />
          </button>
          <p className="fine-print">Projet illustratif de démonstration.</p>
        </Modal>
      )}
      {article !== null && (
        <Article {...journals[article]} onClose={() => setArticle(null)} />
      )}
    </Experience>
  );
}

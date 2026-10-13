"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  ShoppingBag,
  Gift,
  Wine,
  Flame,
  Clock,
  Leaf,
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
  Gallery,
  Play,
} from "./shared";
import { menu, wines, image } from "../lib/data";
import { cartTotal } from "../lib/logic.mjs";
const money = (n: number) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(
    n,
  );
function opening() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (t: string) => parts.find((x) => x.type === t)?.value || "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    value("weekday"),
  );
  const minutes = Number(value("hour")) * 60 + Number(value("minute"));
  const open =
    day !== 1 &&
    ((minutes >= 720 && minutes < 870) ||
      (day !== 0 && minutes >= 1140 && minutes < 1350));
  return {
    day,
    open,
    label: open
      ? "La cuisine est ouverte"
      : day === 1
        ? "Lundi · jour de repos"
        : day === 0
          ? "Dimanche · déjeuner de 12h à 14h30"
          : "Prochain service : 12h–14h30 / 19h–22h30",
  };
}
export default function Restaurant() {
  const [panel, setPanel] = useState("");
  const [category, setCategory] = useState("Entrées");
  const [veggie, setVeggie] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [gift, setGift] = useState(100);
  const [hours, setHours] = useState<{
    day: number;
    open: boolean;
    label: string;
  } | null>(null);
  const [wineType, setWineType] = useState("Tous");
  const [map, setMap] = useState(false);
  const [instagram, setInstagram] = useState(false);
  const [giftReady, setGiftReady] = useState(false);
  useEffect(() => {
    setHours(opening());
    const timer = setInterval(() => setHours(opening()), 60000);
    return () => clearInterval(timer);
  }, []);
  const add = (id: string) =>
    setCart((x) => ({ ...x, [id]: (x[id] || 0) + 1 }));
  const change = (id: string, delta: number) =>
    setCart((x) => {
      const next = { ...x, [id]: Math.max(0, (x[id] || 0) + delta) };
      if (!next[id]) delete next[id];
      return next;
    });
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = cartTotal(cart, menu);
  const dishes = menu.filter(
    (p) =>
      p.category === category && (!veggie || p.tags.includes("Végétarien")),
  );
  return (
    <Experience theme="restaurant">
      <Header
        brand="maison braise"
        sub="Brasserie contemporaine · Bruxelles"
        links={[
          { label: "L’esprit maison", href: "#maison" },
          { label: "La carte", href: "#carte" },
          { label: "Les moments", href: "#moments" },
          { label: "Nous trouver", href: "#venir" },
        ]}
        cta="Réserver une table"
        onAction={() => setPanel("booking")}
      />
      <main id="main">
        <section className="hero">
          <HeroMedia name="restaurant-hero" video />
          <div className="wrap-premium">
            <Reveal className="hero-content">
              <span className="eyebrow">DU FEU. DU GOÛT. ET DES GENS.</span>
              <h1>
                Le goût des
                <br />
                <em>moments partagés.</em>
              </h1>
              <p className="hero-copy">
                Une cuisine qui a du cœur.
                <br />
                Des produits de saison, une belle table,
                <br />
                et cette envie de rester un peu plus longtemps.
              </p>
              <div className="hero-actions">
                <button className="button" onClick={() => setPanel("booking")}>
                  Votre table vous attend
                  <ArrowUpRight size={16} />
                </button>
                <a className="text-link" href="#carte">
                  Découvrir la carte
                  <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>
          </div>
          <div className="hero-bottom">
            <span>BRUXELLES · CUISINE DE SAISON</span>
            <span>LE PLAISIR DE BIEN RECEVOIR, TOUT SIMPLEMENT</span>
            <a href="#maison">ENTREZ, INSTALLEZ-VOUS ↓</a>
          </div>
        </section>
        <div className="wrap-premium">
          <div className="service-note">
            <span className="open-status">
              <span
                className="status-dot"
                style={{ background: hours?.open ? "#688859" : "#ac9274" }}
              />
              {hours?.label || "Mardi–samedi : midi & soir · Dimanche : midi"}
            </span>
            <span>LE MARCHÉ DONNE LE TON. LE CHEF FAIT LE RESTE.</span>
            <button className="text-link" onClick={() => setPanel("booking")}>
              Réserver
              <ArrowUpRight size={13} />
            </button>
          </div>
          <section className="section split-section" id="maison">
            <Reveal className="split-copy">
              <span className="eyebrow">L’ESPRIT MAISON</span>
              <h2>
                La bonne cuisine.
                <br />
                <em>La vraie convivialité.</em>
              </h2>
              <p>
                Maison Braise, c’est une idée simple : les meilleurs repas sont
                ceux que l’on partage. Une brasserie contemporaine où la cuisine
                reste généreuse, l’accueil sincère et les saisons bien
                présentes.
              </p>
              <p>
                Dans l’assiette, des recettes lisibles et des produits qui ont
                quelque chose à dire. Dans la salle, des matières chaleureuses,
                des conversations qui s’étirent et le plaisir d’être ensemble.
              </p>
              <a className="text-link" href="#signature">
                Rencontrer notre cuisine
                <ArrowUpRight size={16} />
              </a>
            </Reveal>
            <Reveal className="split-image">
              <img
                src={image("restaurant-room")}
                alt="Salle chaleureuse d’une brasserie, tables dressées et lumières douces"
                loading="lazy"
              />
              <div className="image-label">
                <span>UNE TABLE POUR CHAQUE MOMENT</span>
                <span>MAISON BRAISE</span>
              </div>
            </Reveal>
          </section>
        </div>
        <div className="marquee">
          Le marché <span>✳</span> La saison <span>✳</span> Le feu{" "}
          <span>✳</span> Le partage <span>✳</span> Le marché <span>✳</span> La
          saison
        </div>
        <section className="section" id="carte">
          <div className="wrap-premium">
            <div className="section-heading">
              <SectionTitle
                eyebrow="LA CARTE, AU FIL DES ENVIES"
                title={
                  <>
                    Le produit d’abord.
                    <br />
                    <em>Le plaisir, toujours.</em>
                  </>
                }
                body="Des assiettes franches, quelques clins d’œil aux classiques et une signature à la braise."
              />
              <button className="text-link" onClick={() => setPanel("cart")}>
                <ShoppingBag size={16} />À emporter ({count})
              </button>
            </div>
            <div className="menu-layout">
              <div>
                <div className="pill-row">
                  {["Entrées", "Plats", "Desserts"].map((c) => (
                    <button
                      key={c}
                      className={`pill ${category === c ? "active" : ""}`}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={veggie}
                    onChange={(e) => setVeggie(e.target.checked)}
                  />
                  <Leaf size={13} />
                  Voir les propositions végétariennes
                </label>
                <div className="menu-items">
                  {dishes.map((d) => (
                    <Reveal className="dish" key={d.id}>
                      <div>
                        <h3>
                          {d.name}
                          {d.tags.map((t) => (
                            <span className="dish-tag" key={t}>
                              {t}
                            </span>
                          ))}
                        </h3>
                        <p>{d.detail}</p>
                        <small>Allergènes : {d.allergens}</small>
                      </div>
                      <div className="dish-price">
                        <strong>{d.price} €</strong>
                        <button
                          aria-label={`Ajouter ${d.name} à la commande`}
                          onClick={() => add(d.id)}
                        >
                          {cart[d.id] ? (
                            <span style={{ fontSize: 10 }}>{cart[d.id]}</span>
                          ) : (
                            <Plus size={13} />
                          )}
                        </button>
                      </div>
                    </Reveal>
                  ))}
                  {!dishes.length && (
                    <p className="fine-print">
                      Aucune proposition dans cette sélection. Essayez une autre
                      catégorie.
                    </p>
                  )}
                </div>
                <p className="fine-print">
                  Prix et menu illustratifs. Informez l’équipe de vos allergies
                  : les informations seront confirmées en cuisine.
                </p>
              </div>
              <Reveal className="menu-photo">
                <img
                  src={image(
                    category === "Entrées"
                      ? "food-burrata"
                      : category === "Plats"
                        ? "food-steak"
                        : "food-dessert",
                  )}
                  alt={`Inspiration culinaire : ${category.toLowerCase()}`}
                  loading="lazy"
                />
                <div className="image-label">
                  <span>
                    {category === "Plats"
                      ? "LA SIGNATURE À LA BRAISE"
                      : "LE GOÛT DES CHOSES SIMPLES"}
                  </span>
                  <Flame size={18} />
                </div>
              </Reveal>
            </div>
          </div>
        </section>
        <section className="section contrast-section" id="signature">
          <div className="wrap-premium split-section">
            <Reveal className="split-image">
              <img
                src={image("chef")}
                alt="Un chef au travail en cuisine"
                loading="lazy"
              />
            </Reveal>
            <Reveal className="split-copy">
              <span className="eyebrow">LA SIGNATURE DU CHEF</span>
              <h2>
                De l’instinct.
                <br />
                Et beaucoup
                <br />
                <em>d’attention.</em>
              </h2>
              <p>
                « J’aime les plats qui n’ont pas besoin de se raconter
                longtemps. Un bon produit, une cuisson juste et cette petite
                touche qui donne envie d’y revenir. »
              </p>
              <p>
                Adrien, notre chef dans ce concept, imagine une carte qui évolue
                avec le marché. Des légumes au premier plan, des viandes à la
                braise et des sauces qu’on prend le temps de faire.
              </p>
              <ul className="feature-list">
                <li>
                  <Check />
                  Des arrivages guidés par la saison
                </li>
                <li>
                  <Check />
                  Une cuisine préparée sur place
                </li>
                <li>
                  <Check />
                  Des producteurs à présenter, des origines à partager
                </li>
              </ul>
              <p className="fine-print">
                Portrait éditorial fictif. Producteurs et distinctions réels
                seront documentés pour le restaurant client.
              </p>
            </Reveal>
          </div>
        </section>
        <div className="wrap-premium">
          <section className="section" id="vins">
            <SectionTitle
              eyebrow="LES MAINS DE LA MAISON"
              title="La cuisine est une équipe."
              body="Du premier arrivage au dernier dessert, chacun apporte son regard, son savoir-faire et le même plaisir de recevoir."
            />
            <div className="team-grid mb-24">
              {[
                ["AL", "Adrien Laurent", "Chef · le produit et les cuissons"],
                ["CM", "Camille Martin", "Cuisine · la saison dans l’assiette"],
                ["LR", "Léa Robert", "Pâtisserie · la dernière note"],
              ].map(([initials, name, role]) => (
                <Reveal className="expert" key={name}>
                  <div className="expert-avatar">{initials}</div>
                  <h3>{name}</h3>
                  <p>{role}</p>
                  <p className="fine-print">
                    Équipe illustrative du concept Maison Braise
                  </p>
                </Reveal>
              ))}
            </div>
            <div className="section-heading">
              <SectionTitle
                eyebrow="LE BON ACCORD"
                title={
                  <>
                    Un verre. Une découverte.
                    <br />
                    <em>Une belle conversation.</em>
                  </>
                }
                body="Une carte resserrée, des vignerons à découvrir et des bouteilles pour accompagner votre moment."
              />
              <Wine size={35} strokeWidth={1} />
            </div>
            <div className="pill-row">
              {["Tous", "Blanc", "Rouge", "Rosé", "Bulles"].map((x) => (
                <button
                  key={x}
                  className={`pill ${wineType === x ? "active" : ""}`}
                  onClick={() => setWineType(x)}
                >
                  {x}
                </button>
              ))}
            </div>
            <div className="wine-grid">
              {wines
                .filter((w) => wineType === "Tous" || w.type === wineType)
                .map((w) => (
                  <div className="wine" key={w.name}>
                    <span className="eyebrow">{w.type}</span>
                    <h3>{w.name}</h3>
                    <p>{w.notes}</p>
                    <div className="wine-price">
                      <span>Le verre · {w.glass} €</span>
                      <span>La bouteille · {w.bottle} €</span>
                    </div>
                  </div>
                ))}
            </div>
            <p className="fine-print">
              Sélection fictive pour la démonstration. L’abus d’alcool est
              dangereux pour la santé.
            </p>
          </section>
          <section className="section pt-0">
            <SectionTitle
              eyebrow="UN LIEU, PLUSIEURS AMBIANCES"
              title="La maison, en quelques images."
            />
            <Gallery
              images={[
                {
                  src: "restaurant-room",
                  alt: "Une salle où l’on se sent bien",
                },
                { src: "food-steak", alt: "La cuisine à la braise" },
                { src: "restaurant-hero", alt: "Le soin de chaque assiette" },
                { src: "food-burrata", alt: "La fraîcheur des entrées" },
                { src: "chef", alt: "L’énergie de la cuisine" },
                { src: "food-dessert", alt: "Finir sur une note douce" },
              ]}
            />
          </section>
          <section className="section pt-0" id="moments">
            <SectionTitle
              eyebrow="IL Y A TOUJOURS UNE BONNE OCCASION"
              title={
                <>
                  Les moments
                  <br />
                  <em>qu’on aime prolonger.</em>
                </>
              }
            />
            <div className="event-grid">
              {[
                [
                  "Jeudi",
                  "Le dîner des découvertes",
                  "Un menu en plusieurs temps et des accords à explorer. Un moment pour les curieux.",
                ],
                [
                  "Dimanche",
                  "Le déjeuner en famille",
                  "Une grande table, des assiettes généreuses et le plaisir de prendre son temps.",
                ],
                [
                  "Sur mesure",
                  "La maison, rien que pour vous",
                  "Anniversaire, repas d’équipe ou occasion à célébrer : imaginons votre événement.",
                ],
              ].map(([date, title, text]) => (
                <Reveal className="event-card" key={title}>
                  <div className="event-date">{date}</div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <button
                    className="text-link"
                    onClick={() =>
                      setPanel(
                        title === "La maison, rien que pour vous"
                          ? "private"
                          : "booking",
                      )
                    }
                  >
                    Parlons de votre moment
                    <ArrowUpRight size={15} />
                  </button>
                </Reveal>
              ))}
            </div>
          </section>
          <section className="section split-section contrast-section px-8 mb-20">
            <Reveal className="split-copy">
              <span className="eyebrow">OFFRIR UN MOMENT, PAS UN OBJET</span>
              <h2>
                Le plus beau cadeau ?<br />
                <em>Un bon souvenir.</em>
              </h2>
              <p>
                Un dîner à deux, un déjeuner à partager, une découverte à
                offrir. Le bon cadeau Maison Braise laisse chacun choisir son
                moment.
              </p>
              <button
                className="button"
                onClick={() => {
                  setGiftReady(false);
                  setPanel("gift");
                }}
              >
                <Gift size={16} />
                Composer un bon cadeau
                <ArrowUpRight size={16} />
              </button>
            </Reveal>
            <Reveal className="split-image">
              <img
                src={image("restaurant-room")}
                alt="Une table préparée pour une occasion spéciale"
                loading="lazy"
              />
            </Reveal>
          </section>
          <section className="section pt-0">
            <SectionTitle
              eyebrow="AUTOUR DE LA TABLE"
              title="Ce qu’on aime entendre."
            />
            <div className="testimonials">
              {[
                [
                  "Une cuisine généreuse, une salle où l’on se sent bien et un service attentionné.",
                  "Juliette",
                ],
                [
                  "Le genre d’adresse où le déjeuner se transforme en un très bon après-midi.",
                  "Nicolas",
                ],
                [
                  "Des produits qui ont du goût. Et cette envie de revenir avec des amis.",
                  "Sarah",
                ],
              ].map(([q, n]) => (
                <div className="testimonial" key={n}>
                  <div className="stars">★★★★★</div>
                  <blockquote>« {q} »</blockquote>
                  <cite>{n} · avis illustratif</cite>
                </div>
              ))}
            </div>
          </section>
          <section className="section pt-0" id="venir">
            <div className="split-section">
              <div>
                <SectionTitle
                  eyebrow="ON VOUS GARDE UNE PLACE"
                  title="Passez la porte."
                  body="Au cœur de Bruxelles, pour un déjeuner entre collègues, un dîner à deux ou une grande tablée."
                />
                <button className="button" onClick={() => setPanel("booking")}>
                  Réserver une table
                  <ArrowUpRight size={16} />
                </button>
                <div className="mt-6">
                  <button className="text-link" onClick={() => setMap(!map)}>
                    Voir le quartier sur la carte
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="mb-6">Les horaires de la maison</h3>
                <table className="hours-table">
                  <tbody>
                    {[
                      ["Lundi", "Fermé"],
                      ["Mardi", "12h–14h30 · 19h–22h30"],
                      ["Mercredi", "12h–14h30 · 19h–22h30"],
                      ["Jeudi", "12h–14h30 · 19h–22h30"],
                      ["Vendredi", "12h–14h30 · 19h–22h30"],
                      ["Samedi", "12h–14h30 · 19h–22h30"],
                      ["Dimanche", "12h–14h30"],
                    ].map(([d, t], i) => (
                      <tr
                        key={d}
                        className={hours?.day === (i + 1) % 7 ? "today" : ""}
                      >
                        <td>{d}</td>
                        <td>{t}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="fine-print">
                  Horaires de démonstration, heure de Bruxelles. Pour un groupe
                  de plus de 8 personnes, contactez l’équipe.
                </p>
              </div>
            </div>
            {map && (
              <div className="mt-10">
                <MapPanel kind="restaurant" />
              </div>
            )}
          </section>
          <section className="section pt-0">
            <div className="section-heading">
              <SectionTitle
                eyebrow="L’INSTANT MAISON"
                title="Quelques nouvelles de la cuisine."
              />
              <button
                className="text-link"
                onClick={() => setInstagram(!instagram)}
              >
                Le carnet Instagram
                <ArrowUpRight size={16} />
              </button>
            </div>
            {instagram ? (
              <>
                <Gallery
                  images={[
                    { src: "food-burrata", alt: "Le marché du jour" },
                    { src: "chef", alt: "Avant le service" },
                    { src: "food-dessert", alt: "La touche finale" },
                  ]}
                />
                <p className="fine-print">
                  Aperçu éditorial du flux. Le compte Instagram professionnel du
                  client devra être connecté pour les publications réelles.
                </p>
              </>
            ) : (
              <p className="fine-print">
                Ouvrez le carnet pour découvrir les instants qui composent la
                maison.
              </p>
            )}
          </section>
          <section className="section pt-0">
            <SectionTitle
              eyebrow="AVANT VOTRE VISITE"
              title="Les petites questions pratiques."
            />
            <FAQ
              items={[
                {
                  q: "Comment réserver une table ?",
                  a: "Choisissez la date, l’heure et le nombre de convives. Dans cette démonstration, la demande est préparée sans être envoyée. Sur le site client, le service de réservation connecté confirmera la disponibilité.",
                },
                {
                  q: "Peut-on venir avec des enfants ?",
                  a: "La maison accueille les repas en famille. Les besoins particuliers et l’accès pour poussette peuvent être indiqués lors de la demande.",
                },
                {
                  q: "Proposez-vous des alternatives végétariennes ?",
                  a: "Oui, le filtre végétarien permet de voir les plats concernés. Pour toute allergie ou contrainte alimentaire, échangez avec l’équipe avant de commander.",
                },
                {
                  q: "Puis-je commander à emporter ?",
                  a: "Ajoutez les plats au panier puis préparez votre commande. Le paiement et la transmission à la cuisine seront activés après raccordement du prestataire client.",
                },
                {
                  q: "Le restaurant est-il accessible ?",
                  a: "Les informations d’accès, de stationnement et d’accessibilité devront être vérifiées et renseignées à partir du lieu réel.",
                },
              ]}
            />
          </section>
        </div>
        <section className="cta-section">
          <span className="eyebrow">
            LES BONS MOMENTS COMMENCENT PAR UNE TABLE
          </span>
          <h2>
            On se retrouve
            <br />
            <em>chez Maison Braise ?</em>
          </h2>
          <p>La cuisine s’occupe du reste.</p>
          <button className="button" onClick={() => setPanel("booking")}>
            Réserver mon moment
            <ArrowUpRight size={16} />
          </button>
        </section>
      </main>
      <Footer
        brand="maison braise"
        description="Une brasserie contemporaine, une cuisine de saison et le plaisir de bien recevoir. Bruxelles."
        links={[
          { label: "La carte", href: "#carte" },
          { label: "Les vins", href: "#vins" },
          { label: "Horaires & accès", href: "#venir" },
        ]}
        onContact={() => setPanel("contact")}
      />
      <ContactBubble onClick={() => setPanel("contact")} />
      {panel && (
        <Modal
          title={
            panel === "booking"
              ? "Votre prochain bon moment."
              : panel === "cart"
                ? "Votre table, à la maison."
                : panel === "gift"
                  ? "Un moment à offrir."
                  : panel === "private"
                    ? "La maison pour votre occasion."
                    : "Écrivez-nous."
          }
          onClose={() => setPanel("")}
          wide={panel === "cart"}
        >
          {panel === "cart" ? (
            <>
              {count ? (
                <>
                  {menu
                    .filter((d) => cart[d.id])
                    .map((d) => (
                      <div className="cart-line" key={d.id}>
                        <div>
                          {d.name}
                          <br />
                          <small className="fine-print">
                            {money(d.price)} / portion
                          </small>
                        </div>
                        <div className="quantity">
                          <button
                            aria-label={`Retirer une portion de ${d.name}`}
                            onClick={() => change(d.id, -1)}
                          >
                            −
                          </button>
                          <span>{cart[d.id]}</span>
                          <button
                            aria-label={`Ajouter une portion de ${d.name}`}
                            onClick={() => change(d.id, 1)}
                          >
                            +
                          </button>
                        </div>
                        <strong>{money(d.price * cart[d.id])}</strong>
                      </div>
                    ))}
                  <div className="cart-total">
                    <span>Total indicatif</span>
                    <strong>{money(total)}</strong>
                  </div>
                  <LeadForm
                    kind="Commande à emporter"
                    subject={
                      menu
                        .filter((d) => cart[d.id])
                        .map((d) => `${cart[d.id]} × ${d.name}`)
                        .join(" · ") + ` — ${money(total)}`
                    }
                    fields="booking"
                  />
                  <p className="fine-print">
                    Aucun paiement prélevé. Le restaurant doit confirmer la
                    commande et ses modalités.
                  </p>
                </>
              ) : (
                <>
                  <p>Votre panier attend vos premières envies.</p>
                  <button
                    className="button"
                    onClick={() => {
                      setPanel("");
                      document
                        .querySelector("#carte")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Découvrir la carte
                    <ArrowRight size={16} />
                  </button>
                </>
              )}
            </>
          ) : panel === "gift" ? (
            <>
              <p>
                Choisissez un montant, puis préparez votre demande. Le bon
                officiel est émis uniquement après confirmation et paiement
                auprès du restaurant.
              </p>
              <div className="gift-amounts">
                {[50, 100, 150, 200].map((n) => (
                  <button
                    className={`pill ${gift === n ? "active" : ""}`}
                    onClick={() => {
                      setGift(n);
                      setGiftReady(false);
                    }}
                    key={n}
                  >
                    {n} €
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setGiftReady(true);
                }}
                className="lead-form"
              >
                <label>
                  À qui souhaitez-vous l’offrir ?
                  <input
                    name="recipient"
                    required
                    placeholder="Prénom du destinataire"
                  />
                </label>
                <label>
                  Votre message
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Un mot pour accompagner ce moment…"
                  />
                </label>
                <button className="button" type="submit">
                  Prévisualiser le cadeau
                  <Gift size={16} />
                </button>
              </form>
              {giftReady && (
                <div className="form-status mt-6">
                  <span className="eyebrow">
                    MAISON BRAISE · APERÇU DU CADEAU
                  </span>
                  <h3 className="my-4">Un moment à partager · {gift} €</h3>
                  <p>
                    Ceci est un aperçu, sans valeur de paiement ni bon émis.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => setPanel("gift-request")}
                  >
                    Demander ce bon à l’équipe
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <LeadForm
              kind={
                panel === "booking"
                  ? "Réservation restaurant"
                  : panel === "private"
                    ? "Événement privé"
                    : panel === "gift-request"
                      ? "Demande de bon cadeau"
                      : "Contact restaurant"
              }
              fields={panel === "booking" ? "booking" : "contact"}
              subject={
                panel === "gift-request"
                  ? `Bon cadeau de ${gift} €`
                  : panel === "private"
                    ? "Décrivez l’occasion, la date et le nombre d’invités."
                    : ""
              }
            />
          )}
        </Modal>
      )}
    </Experience>
  );
}

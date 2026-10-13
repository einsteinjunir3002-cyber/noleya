import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const AFRICA_PIECES = [
  "M208.75,0.50 L204.50,0.00 L132.00,10.25 L109.50,19.50 L93.75,20.50 L66.75,46.50 L63.75,61.50 L38.25,78.75 L17.50,116.50 L19.00,153.25 L16.00,169.75 L73.25,238.00 L76.25,238.50 L101.25,232.25 L137.50,234.75 L165.00,226.00 L183.25,240.25 L201.75,239.75 L203.50,242.00 L203.50,258.50 L202.50,264.75 L205.00,265.00 L255.00,225.00 L235.00,175.00 L270.00,135.00 L270.00,50.50 L247.75,46.00 L246.00,43.75 L244.00,37.75 L241.50,36.00 L219.25,34.75 L211.25,24.00 L211.75,21.00 L215.75,18.00 L216.50,14.75 Z",
  "M281.50,35.75 L279.50,38.25 L277.75,49.25 L275.00,51.25 L270.00,50.50 L270.00,135.00 L235.00,175.00 L254.50,224.00 L300.00,285.00 L350.00,270.00 L395.00,310.00 L414.50,310.00 L412.75,303.50 L413.50,301.25 L419.50,297.25 L446.25,259.25 L448.75,257.25 L471.50,246.75 L495.00,195.00 L495.50,190.50 L493.25,188.50 L490.75,188.50 L452.75,198.50 L450.75,198.25 L448.75,196.50 L432.25,171.50 L415.50,157.25 L395.50,113.00 L367.75,71.50 L368.00,67.25 L369.75,64.75 L372.75,64.25 L378.00,65.75 L380.75,63.25 L378.00,52.00 L376.25,50.00 L348.75,43.75 L323.25,49.25 L304.50,44.00 L295.75,36.00 Z",
  "M255.00,225.00 L205.75,264.50 L202.25,265.25 L201.25,272.00 L201.75,274.75 L218.75,296.00 L231.75,346.50 L219.75,384.50 L219.75,387.00 L240.25,432.75 L244.25,464.75 L265.00,490.25 L265.00,508.50 L265.75,510.50 L267.50,511.75 L271.00,511.75 L332.25,503.50 L335.00,501.50 L378.00,452.00 L380.75,439.75 L386.50,435.50 L388.25,432.75 L388.75,403.00 L389.75,399.25 L400.00,387.75 L419.50,382.00 L422.00,379.75 L422.25,340.25 L414.50,310.00 L395.00,310.00 L350.00,270.00 L300.00,285.00 Z"
];

const AFRICA_PHOTO_BOUNDS = [
  { x: 12, y: 0, width: 264, height: 266 },
  { x: 258, y: 23, width: 245, height: 302 },
  { x: 198, y: 220, width: 228, height: 297 }
];

const GOOD_THINGS_PATH =
  "M0 0A1 1 0 00-196-240L-835 363A1 1 0 00-624 574L4-2ZM548-29A1 1 0 00304-229L-971 1052A1 1 0 00-742 1229L557-37M-243 827-624 1201A1 1 0 00-371 1404L24 1012A1 1 0 00-250 834M468 154 73 557A1 1 0 00294 809L714 379A1 1 0 00465 154M529 642-140 1315A1 1 0 0098 1546L775 831A1 1 0 00525 646";

const CURRENT_YEAR = new Date().getFullYear();

function AfricaMap({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 500 512" role="img" aria-label="Map of Africa">
      <defs>
        {AFRICA_PIECES.map((d, index) => (
          <clipPath key={index} id={`africa-piece-clip-${index}`}>
            <path d={d} />
          </clipPath>
        ))}
      </defs>
      {AFRICA_PIECES.map((d, index) => (
        <g key={index} className={`map-piece map-piece-${index}`}>
          <path d={d} />
          <image
            className="map-photo"
            href={`/images/africa-piece-${index + 1}.webp`}
            {...AFRICA_PHOTO_BOUNDS[index]}
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#africa-piece-clip-${index})`}
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
          <path className="map-piece-outline" d={d} />
        </g>
      ))}
    </svg>
  );
}

export default function Home({ onNavigate }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const heroRef = useRef(null);
  const mapRef = useRef(null);
  const belowRef = useRef(null);
  const headlineRef = useRef(null);
  const artworkRef = useRef(null);

  useEffect(() => {
    const pieces = mapRef.current?.querySelectorAll(".map-piece");
    const artwork = artworkRef.current?.querySelector(".good-things-artwork");
    const reveals = belowRef.current?.querySelectorAll(".below-reveal");

    if (!pieces?.length || !artwork || !reveals?.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(pieces, { autoAlpha: 1, x: 0, y: 0 });
      gsap.set(artwork, { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1 });
      const ctx = gsap.context(() => {
        if (headlineRef.current) {
          gsap.fromTo(
            headlineRef.current,
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              duration: 0.35,
              scrollTrigger: { trigger: headlineRef.current, start: "top 85%", once: true }
            }
          );
        }
      }, belowRef);
      return () => ctx.revert();
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(".hero-title", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" });
      gsap.fromTo(
        ".needed-wrap",
        { autoAlpha: 0, y: 32 },
        { autoAlpha: 1, y: 0, duration: 1, delay: 0.22, ease: "bounce.out" }
      );
      gsap.fromTo(
        ".hero-copy",
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.65, delay: 0.28, ease: "power2.out" }
      );
      gsap.fromTo(
        ".hero-actions",
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.65, delay: 0.4, ease: "power2.out" }
      );

      gsap.fromTo(
        pieces,
        {
          autoAlpha: 0,
          x: (i) => (i === 0 ? -80 : 80 * (i === 1 ? 1 : 0)),
          y: (i) => (i === 0 ? -30 : i === 1 ? -20 : 90),
          rotation: (i) => (i === 0 ? -4 : 4 * (i === 1 ? 1 : 0)),
          scale: 1.06
        },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 2.6,
          stagger: 0.25,
          ease: "power2.out",
          transformOrigin: "50% 50%",
          scrollTrigger: { trigger: mapRef.current, start: "top 85%", once: true }
        }
      );

      gsap.fromTo(
        reveals,
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1.6,
          stagger: 0.28,
          ease: "power2.out",
          scrollTrigger: { trigger: belowRef.current, start: "top 78%", once: true }
        }
      );

      if (headlineRef.current) {
        gsap.fromTo(
          headlineRef.current,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0 0 0)",
            duration: 2.0,
            ease: "power1.inOut",
            scrollTrigger: { trigger: headlineRef.current, start: "top 82%", once: true }
          }
        );
      }

      gsap.fromTo(
        belowRef.current,
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: 1.6,
          ease: "power2.inOut",
          scrollTrigger: { trigger: belowRef.current, start: "top 78%", once: true }
        }
      );

      gsap.fromTo(
        artwork,
        { autoAlpha: 0, x: 0, y: 38, rotation: 0, scale: 0.97 },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 1.85,
          ease: "power2.out",
          transformOrigin: "50% 50%",
          scrollTrigger: {
            trigger: artworkRef.current,
            start: "top 82%",
            toggleActions: "play reverse play reverse"
          }
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleNav = (e, path) => {
    e.preventDefault();
    setIsMenuOpen(false);
    if (path.startsWith("#")) {
      const el = document.querySelector(path);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <main className="landing-shell">
      <section className="hero" aria-labelledby="hero-title" ref={heroRef}>
        <header className="site-header">
          <a className="brand" href="#home" aria-label="Noleya home" onClick={(e) => handleNav(e, "#home")}>
            <span className="brand-mark" aria-hidden="true">✳</span>
            <span>NOLEYA</span>
          </a>
          <span className="header-note">Together, we grow.</span>
          <div className="menu-wrap">
            <button
              className="menu-toggle"
              type="button"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="site-menu"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              {isMenuOpen ? <X size={21} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
            </button>
            {isMenuOpen && (
              <nav className="menu-dropdown" id="site-menu" aria-label="Main menu">
                <a href="/donate" onClick={(e) => handleNav(e, "/donate")}>
                  Donate <ArrowUpRight size={15} />
                </a>
                <a href="/volunteer" onClick={(e) => handleNav(e, "/volunteer")}>
                  Volunteer <ArrowUpRight size={15} />
                </a>
              </nav>
            )}
          </div>
        </header>

        <div className="hero-content" id="home">
          <h1 className="hero-title" id="hero-title">
            A brighter future,<br className="mobile-break" /> right where it's
            <br className="desktop-break" />
            <span className="needed-wrap">
              <span className="needed-word">Needed</span>
            </span>{" "}
            most.
          </h1>
          <p className="hero-copy">
            At Noleya, we bring people together to support <br className="desktop-break" />
            communities across Africa, one act of care at a time.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/donate" onClick={(e) => handleNav(e, "/donate")}>
              Donate today{" "}
              <span className="button-icon">
                <ArrowRight size={19} />
              </span>
            </a>
            <a className="button button-secondary" href="/volunteer" onClick={(e) => handleNav(e, "/volunteer")}>
              Volunteer{" "}
              <span className="button-icon">
                <ArrowUpRight size={18} />
              </span>
            </a>
          </div>
          <div className="map-visual" ref={mapRef}>
            <AfricaMap />
          </div>
        </div>

        <span className="side-note" aria-hidden="true">CARE THAT TRAVELS FURTHER</span>
      </section>

      <section className="below-fold transform -translate-y-" aria-label="Noleya community" ref={belowRef}>
        <span className="below-kicker below-reveal font-[700]">N O L E Y A &nbsp; / &nbsp; A F R I C A</span>
        <p className="below-headline font-[700]" ref={headlineRef}>
          Good things grow when we grow them together.
        </p>
        <div className="below-artwork" aria-hidden="true" ref={artworkRef}>
          <svg viewBox="-1001.27 -286.847 1807 1883" role="presentation">
            <defs>
              <clipPath id="good-things-clip">
                <path d={GOOD_THINGS_PATH} />
              </clipPath>
            </defs>
            <g className="good-things-artwork">
              <path className="good-things-fallback" d={GOOD_THINGS_PATH} />
              <image
                href="/images/good-things.webp"
                x="-1001.27"
                y="-286.847"
                width="1807"
                height="1883"
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#good-things-clip)"
              />
            </g>
          </svg>
        </div>
      </section>

      <section className="support-section" aria-labelledby="support-title">
        <div className="support-inner">
          <div className="support-heading">
            <div>
              <span className="support-kicker">OUR WORK</span>
              <h2 id="support-title">Support that meets real needs.</h2>
            </div>
            <p>We bring practical resources and lasting care to the people and communities we serve.</p>
          </div>
          <div className="support-grid">
            <article className="support-card support-card-wide">
              <img src="/images/support.webp" alt="Noleya community support in action" />
              <div className="support-card-copy">
                <span>01 / EDUCATION</span>
                <h3>Learning starts with access.</h3>
                <p>School supplies, learning materials, and support for young people.</p>
              </div>
            </article>
            <article className="support-card">
              <img src="/images/africa-piece-1.webp" alt="Community members smiling together" />
              <div className="support-card-copy">
                <span>02 / EVERYDAY CARE</span>
                <h3>Essentials for families.</h3>
                <p>Practical items and resources for daily life.</p>
              </div>
            </article>
            <article className="support-card">
              <img src="/images/africa-piece-2.webp" alt="Children supported through community care" />
              <div className="support-card-copy">
                <span>03 / WELLBEING</span>
                <h3>Care with dignity.</h3>
                <p>Support that helps people feel safe, healthy, and seen.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-main">
          <a className="brand footer-brand" href="#home" aria-label="Noleya home" onClick={(e) => handleNav(e, "#home")}>
            <span className="brand-mark" aria-hidden="true">✳</span>
            <span>NOLEYA</span>
          </a>
          <p>
            Care that travels further.<br />Together, we grow.
          </p>
          <nav className="footer-links" aria-label="Footer navigation">
            <a href="#home" onClick={(e) => handleNav(e, "#home")}>Home</a>
            <a href="/donate" onClick={(e) => handleNav(e, "/donate")}>Donate</a>
            <a href="/volunteer" onClick={(e) => handleNav(e, "/volunteer")}>Volunteer</a>
          </nav>
          <a className="footer-contact" href="mailto:hello@noleya.org">
            Get in touch <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>© {CURRENT_YEAR} Noleya Foundation</span>
          <span>Supporting communities across Africa</span>
        </div>
      </footer>
    </main>
  );
}

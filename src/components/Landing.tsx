import { useEffect, useState } from "react";
import appDesktop from "../assets/app-desktop.png";
import appMobile from "../assets/app-mobile.png";
import { AuthFormCard } from "./modals/AuthFormCard";

// Pit-board landing (Direction B, devpost/landing-pitboard.html). Conditions
// table, bays, timeline, honesty rails — hairline-grid grammar, no card soup. The closing board wires the real auth (register/login/forgot).
// All styles are the pb- block in halo.css, scoped under .pb.

export function Landing({ onAuthed }: { onAuthed: () => void }) {
  // Theme toggle: the pb styles are token-based, so flipping data-theme is the
  // whole switch. Persisted — the app reads the same key on the logged-in side.
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("caddie-theme", next);
    } catch {
      /* private mode — theme just won't persist */
    }
    setTheme(next);
  }

  // Reveal-on-scroll for fade-marked blocks + topbar scroll-spy (skipped for
  // reduced motion users via the CSS override).
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".pb .fade").forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.06 },
    );
    document.querySelectorAll(".pb .fade").forEach((el) => io.observe(el));

    const links = [...document.querySelectorAll<HTMLAnchorElement>('.pb .topbar nav a[href^="#"]')];
    const spy = new IntersectionObserver(
      (es) => {
        es.forEach((en) => {
          if (!en.isIntersecting) return;
          const id = "#" + en.target.id;
          links.forEach((a) => {
            if (a.getAttribute("href") === id) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    links.forEach((a) => {
      const t = document.querySelector(a.getAttribute("href") ?? "");
      if (t) spy.observe(t);
    });
    return () => {
      io.disconnect();
      spy.disconnect();
    };
  }, []);

  return (
    <div className="pb">
      <a className="skip" href="#pb-main">Skip to content</a>

      <div className="topbar">
        <span className="wordmark">Caddie</span>
        <nav aria-label="Board sections">
          <a href="#pb-discover">Discover</a>
          <a href="#pb-vet">Vet</a>
          <a href="#pb-plan">Plan</a>
          <a href="#pb-ship">Ship</a>
          <a href="#pb-judge">Judge</a>
          <a href="#pb-honest">Honesty</a>
        </nav>
        <div className="actions">
          <button onClick={toggleTheme} className="link-quiet" title="Switch theme">
            {theme === "dark" ? "◐ light" : "◐ dark"}
          </button>
          <a className="link-quiet" href="#pb-start">Log in</a>
          <a className="btn btn-key" href="#pb-start">Create your bag</a>
        </div>
      </div>

      <main id="pb-main">
        {/* HERO ────────────────────────────────────────────────── */}
        <section className="hero" aria-labelledby="pb-hero-h">
          <div className="hero-l">
            <p className="eyebrow"><span className="rule" aria-hidden="true" /><span className="lbl mono">an ai chief of staff for hackathon builders</span></p>
            <h1 id="pb-hero-h" className="h1">It carries the bag.<br />You swing.</h1>
            <p className="lede">Entries rarely die from bad code. They die from fine print nobody read, scope that ate the weekend, and a pitch that landed too late. Caddie works the three of them so the hours you have go into the build.</p>
            <div className="hero-cta">
              <a className="btn btn-key" href="#pb-start">Create your bag</a>
              <a className="btn btn-line" href="#pb-bag">See a real bag</a>
            </div>
          </div>
          <div className="hero-r">
            <div className="devices fade">
              <div className="shot">
                <div className="bar" aria-hidden="true"><i /><i /><i /><span className="host mono">caddie.jamalibrahim.dev</span></div>
                <img src={appDesktop} width={1280} height={800} alt="The Caddie workspace: The Card with a live RevenueCat deadline card, fit verdict, and the chat channel — real running app, dark theme." />
              </div>
              <div className="mobile-shot">
                <img src={appMobile} width={390} height={844} alt="Caddie on a phone: the deadline and fit cards in one column, with the chat composer and the Chat · Today · Tasks · Profile dock." />
              </div>
            </div>
          </div>
        </section>

        {/* RUN SPINE ──────────────────────────────────────────── */}
        <div className="spine-wrap" id="pb-run">
          <div className="spine-head">
            <p className="lbl mono">the run, in order</p>
            <h2 className="h2" style={{ marginTop: "1rem", maxWidth: "26ch" }}>A competition is not one task. It is a dozen, spread over weeks.</h2>
            <p className="lede" style={{ marginTop: "1.25rem" }}>So this is not a feature list — it is the run itself. Each step leaves an artifact on the record; the graphics below are how Caddie actually renders them.</p>
          </div>
          <div className="spine">
            <nav className="spine-rail" aria-label="Steps of a run">
              <p className="rail-title lbl mono">The run</p>
              <a className="rail-link" href="#pb-discover"><span>01</span><span>Discover</span></a>
              <a className="rail-link" href="#pb-vet"><span>02</span><span>Vet</span></a>
              <a className="rail-link" href="#pb-plan"><span>03</span><span>Plan</span></a>
              <a className="rail-link" href="#pb-ship"><span>04</span><span>Ship</span></a>
              <a className="rail-link" href="#pb-judge"><span>05</span><span>Judge</span></a>
              <a className="rail-link" href="#pb-submit"><span>06</span><span>Submit</span></a>
            </nav>

            <div className="acts">
              <section className="act fade" id="pb-discover" aria-labelledby="pb-discover-h">
                <p className="act-step"><b>Step 01</b><span>Discover</span></p>
                <h3 id="pb-discover-h">It reads the live feed, so nothing current slips past.</h3>
                <p className="lede">Open contests straight from Devpost's own listing — filtered to open, ranked against the builder's stack, with the major companies never far from the top.</p>
                <dl className="figures">
                  <div>
                    <dt>Open right now</dt>
                    <dd className="fig-value">9</dd>
                    <dd className="fig-note">The live feed, this hour — ended contests never enter the list.</dd>
                  </div>
                  <div className="is-ok">
                    <dt>Major-org runs</dt>
                    <dd className="fig-value">5</dd>
                    <dd className="fig-note">Amazon, NVIDIA × Nebius, Meta and AWS among the open set.</dd>
                  </div>
                  <div>
                    <dt>Ranked by</dt>
                    <dd className="fig-value">stack</dd>
                    <dd className="fig-note">Your chips, your hours — the ordering is yours, not the front page's.</dd>
                  </div>
                </dl>
              </section>

              <section className="act fade" id="pb-vet" aria-labelledby="pb-vet-h">
                <p className="act-step"><b>Step 02</b><span>Vet</span></p>
                <h3 id="pb-vet-h">It reads the fine print and pins every claim.</h3>
                <p className="lede">A rules page becomes a snapshot, then verbatim claims — each citing the line it came from — and a fit verdict against the builder's country, stack and hours.</p>
                <div className="act-grid">
                  <div className="frag">
                    <p className="frag-k"><span style={{ color: "var(--pb-ok)" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>verdict · fit</span><span className="pill" style={{ background: "var(--pb-tint-ok)", color: "var(--pb-ok)" }}>strong fit</span></p>
                    <h4>Strong fit — 4 days left to decide</h4>
                    <div className="nested" style={{ background: "var(--pb-tint-ok)" }}>
                      <p className="mrow"><span className="k">Country</span><span className="ar" style={{ color: "var(--pb-ok)" }}>→</span><span className="v">Nigeria · eligible</span></p>
                      <p className="mrow"><span className="k">Hours</span><span className="ar" style={{ color: "var(--pb-ok)" }}>→</span><span className="v">12/wk clears a 6-day window</span></p>
                      <p className="mrow"><span className="k">Risk</span><span className="ar" style={{ color: "var(--pb-warn)" }}>→</span><span className="v">pre-existing code barred</span></p>
                    </div>
                    <p className="note"><span className="mk" style={{ color: "var(--pb-ok)" }}>▸</span>Build clean. Snapshot and rules URL are pinned if you need to argue it.</p>
                    <p className="fresh">· updated 6h ago</p>
                  </div>
                  <div className="frag">
                    <p className="frag-k"><span style={{ color: "var(--pb-primary)" }}>rules · digest</span><span className="pill" style={{ background: "var(--pb-tint-primary)", color: "var(--pb-primary)" }}>cited</span></p>
                    <h4>One clause moved since last read</h4>
                    <p className="mrow" style={{ marginTop: "0.5rem" }}><span className="k">§4.2</span><span className="ar" style={{ color: "var(--pb-primary)" }}>→</span><span className="v">"Pre-existing code is out of bounds."</span></p>
                    <p className="mrow"><span className="k">Delta</span><span className="ar" style={{ color: "var(--pb-primary)" }}>→</span><span className="v">tightened · ideas still allowed</span></p>
                    <p className="mrow"><span className="k">Receipt</span><span className="ar" style={{ color: "var(--pb-primary)" }}>→</span><span className="v">snapshot + rules URL retained</span></p>
                    <p className="fresh">· rechecked 18:40 · source pinned</p>
                  </div>
                </div>
              </section>

              <section className="act fade" id="pb-plan" aria-labelledby="pb-plan-h">
                <p className="act-step"><b>Step 03</b><span>Plan</span></p>
                <h3 id="pb-plan-h">One interview. Three documents. A repo.</h3>
                <p className="lede">scope.md, prd.md and spec.md for the builder's actual idea — then a private GitHub repo, license committed, without a single git command. The locked scope line flags anything that tries to grow.</p>
                <div className="act-grid">
                  <div className="frag">
                    <p className="frag-k"><span style={{ color: "var(--pb-ok)" }}>ideate · scope</span><span className="pill" style={{ background: "var(--pb-tint-ok)", color: "var(--pb-ok)" }}>locked</span></p>
                    <h4>Locked line: brief + repo + review</h4>
                    <p className="mrow" style={{ marginTop: "0.5rem" }}><span className="k">Cut</span><span className="ar" style={{ color: "var(--pb-ok)" }}>→</span><span className="v">scheduler · push · auth · MLH crawl</span></p>
                    <p className="mrow"><span className="k">Build fits</span><span className="ar" style={{ color: "var(--pb-ok)" }}>→</span><span className="v">12 hrs × 6 days, with slack</span></p>
                    <p className="note"><span className="mk" style={{ color: "var(--pb-ok)" }}>▸</span>I'll flag anything that tries to grow into the bag.</p>
                  </div>
                  <div className="frag">
                    <p className="frag-k"><span style={{ color: "var(--pb-ok)" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>plan · docs</span><span className="pill" style={{ background: "var(--pb-tint-ok)", color: "var(--pb-ok)" }}>ready</span></p>
                    <h4>Scope cut to what one person can ship</h4>
                    <div className="chips"><span className="chip"><b>✓</b> scope.md</span><span className="chip"><b>✓</b> prd.md</span><span className="chip"><b>✓</b> spec.md</span></div>
                    <p className="mrow" style={{ marginTop: "0.625rem" }}><span className="k">Repo</span><span className="ar" style={{ color: "var(--pb-ok)" }}>→</span><span className="v">your account · private</span></p>
                    <p className="mrow"><span className="k">License</span><span className="ar" style={{ color: "var(--pb-ok)" }}>→</span><span className="v">MIT, committed</span></p>
                    <p className="mrow"><span className="k">You ran</span><span className="ar" style={{ color: "var(--pb-ok)" }}>→</span><span className="v">zero git commands</span></p>
                    <span className="cta-tag" style={{ background: "var(--pb-ok)", color: "var(--pb-on-key)" }}>Open repo</span>
                  </div>
                </div>
              </section>

              <section className="act fade" id="pb-ship" aria-labelledby="pb-ship-h">
                <p className="act-step"><b>Step 04</b><span>Ship</span></p>
                <h3 id="pb-ship-h">Private until the builder says otherwise.</h3>
                <p className="lede">The repo lands in the builder's own GitHub account. Making it public — the contest rules require a detectable license — is one confirmed request, not a scramble.</p>
                <dl className="figures">
                  <div>
                    <dt>Repo owner</dt>
                    <dd className="fig-value">you</dd>
                    <dd className="fig-note">The code lands in your account, not ours.</dd>
                  </div>
                  <div className="is-warn">
                    <dt>Visibility</dt>
                    <dd className="fig-value">private</dd>
                    <dd className="fig-note">Flip to public in one confirmed step, license already in.</dd>
                  </div>
                </dl>
              </section>

              <section className="act fade" id="pb-judge" aria-labelledby="pb-judge-h">
                <p className="act-step"><b>Step 05</b><span>Judge</span></p>
                <h3 id="pb-judge-h">Get judged before the judges do.</h3>
                <p className="lede">The entry scores against the contest's own criteria — with the risks ranked and a fix attached to each one. Re-run it any time before the clock closes.</p>
                <div className="act-grid">
                  <div className="frag">
                    <p className="frag-k"><span style={{ color: "var(--pb-warn)" }}>judge · review</span><span className="pill" style={{ background: "var(--pb-tint-warn)", color: "var(--pb-warn)" }}>attention</span></p>
                    <h4>Presentation is dragging the score</h4>
                    <div className="bars">
                      <div><div className="bar-head"><span className="bar-name">Design</span><span className="bar-track"><span style={{ display: "block", height: "100%", width: "70%", background: "var(--pb-ok)" }} /></span><span className="bar-score" style={{ color: "var(--pb-ok)" }}>7</span></div></div>
                      <div><div className="bar-head"><span className="bar-name">Impact</span><span className="bar-track"><span style={{ display: "block", height: "100%", width: "60%", background: "var(--pb-warn)" }} /></span><span className="bar-score" style={{ color: "var(--pb-warn)" }}>6</span></div></div>
                      <div><div className="bar-head"><span className="bar-name">Innovation</span><span className="bar-track"><span style={{ display: "block", height: "100%", width: "80%", background: "var(--pb-ok)" }} /></span><span className="bar-score" style={{ color: "var(--pb-ok)" }}>8</span></div></div>
                      <div><div className="bar-head"><span className="bar-name">Presentation</span><span className="bar-track"><span style={{ display: "block", height: "100%", width: "40%", background: "var(--pb-danger)" }} /></span><span className="bar-score" style={{ color: "var(--pb-danger)" }}>4</span></div><p className="bar-why">Fix: one problem slide, a 90-second reel, a live URL.</p></div>
                    </div>
                    <p className="note"><span className="mk" style={{ color: "var(--pb-warn)" }}>▸</span>Presentation carries 25% of this scorecard.</p>
                  </div>
                  <div className="frag">
                    <p className="frag-k"><span style={{ color: "var(--pb-warn)" }}>judge · review</span><span className="pill" style={{ background: "var(--pb-tint-warn)", color: "var(--pb-warn)" }}>2 fixes open</span></p>
                    <h4>Will It Ship review · Oct 22</h4>
                    <p className="mrow" style={{ marginTop: "0.5rem" }}><span className="k">Open</span><span className="ar" style={{ color: "var(--pb-warn)" }}>→</span><span className="v">record demo · add live URL</span></p>
                    <p className="mrow"><span className="k">Clear</span><span className="ar" style={{ color: "var(--pb-warn)" }}>→</span><span className="v">repo · license · docs · form</span></p>
                    <p className="fresh">· re-run any time before the clock closes</p>
                  </div>
                </div>
              </section>

              <section className="act fade" id="pb-submit" aria-labelledby="pb-submit-h">
                <p className="act-step"><b>Step 06</b><span>Submit</span></p>
                <h3 id="pb-submit-h">Then it stops, and the human presses Submit.</h3>
                <p className="lede">A checklist seeded against the clock — video, repo, description, review — with a digest email the day items come due. The build, the demo and the pitch stay yours.</p>
                <dl className="figures">
                  <div>
                    <dt>Checklist items</dt>
                    <dd className="fig-value">5</dd>
                    <dd className="fig-note">Seeded against the deadline the moment rules land.</dd>
                  </div>
                  <div className="is-ok">
                    <dt>Digest email</dt>
                    <dd className="fig-value">daily</dd>
                    <dd className="fig-note">When an item comes due — not before, not after.</dd>
                  </div>
                  <div className="is-ok">
                    <dt>Submissions by Caddie</dt>
                    <dd className="fig-value">0</dd>
                    <dd className="fig-note">It will never swing for you.</dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        </div>

        {/* HONESTY ─────────────────────────────────────────────── */}
        <section className="band" id="pb-honest" aria-labelledby="pb-hon-h" style={{ paddingBottom: 56 }}>
          <div className="band-head">
            <div>
              <p className="lbl mono" style={{ marginBottom: "1rem" }}>keep it honest</p>
              <h2 id="pb-hon-h" className="h2">An AI that reads the rules can also misread them.</h2>
            </div>
            <p className="lede">So the product is built around being checkable rather than around sounding confident.</p>
          </div>

          <div className="honest">
            <div>
              <p className="lbl mono">summaries</p>
              <h3>AI-read, never unsourced</h3>
              <p>Every digest sits on the verbatim clause and the page it came from. Read the quote yourself before you burn a week.</p>
            </div>
            <div>
              <p className="lbl mono">freshness</p>
              <h3>Stamped with its age</h3>
              <p>Each card carries the time it last updated. Three hours old says three hours old.</p>
            </div>
            <div>
              <p className="lbl mono">re-check</p>
              <h3>Changes become deltas</h3>
              <p>The previous snapshot and source URL are retained, so a moved clause shows up as a delta you can see.</p>
            </div>
            <div>
              <p className="lbl mono">privacy</p>
              <h3>Your bag stays yours</h3>
              <p>Contests, plan and tasks are private to your account. The repo lands in your own GitHub account and stays private.</p>
            </div>
          </div>

          <div className="locked">
            <div>
              <p className="lbl mono">what caddie will not do</p>
              <h3>The club stays in your hands.</h3>
            </div>
            <ul>
              <li><i aria-hidden="true">✕</i><span>It will not swing for you — the build, the demo and the pitch are yours.</span></li>
              <li><i aria-hidden="true">✕</i><span>It will not widen the bag on its own; the locked scope line flags anything that tries to grow.</span></li>
              <li><i aria-hidden="true">✕</i><span>It will not call a rule it couldn't read "clear". A failed read shows up as a fault.</span></li>
            </ul>
            <p className="lockline">LOCKED LINE: BRIEF + REPO + REVIEW<span className="blink" aria-hidden="true"> ▍</span></p>
          </div>
        </section>

        {/* SAMPLE BAG ──────────────────────────────────────────── */}
        <section className="band" id="pb-bag" aria-labelledby="pb-bag-h">
          <div className="band-head">
            <div>
              <p className="lbl mono" style={{ marginBottom: "1rem" }}>the card</p>
              <h2 id="pb-bag-h" className="h2">One bag, the whole state of the entry.</h2>
            </div>
            <p className="lede">Ordered by what needs you next — clock first, then the verdict, then the work that is actually open.</p>
          </div>

          <div className="stackgrid">
            <div className="frag span2">
              <p className="frag-k"><span style={{ color: "var(--pb-warn)" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>clock · deadline</span><span className="pill" style={{ background: "var(--pb-tint-warn)", color: "var(--pb-warn)" }}>locked</span></p>
              <h4>Submit by Oct 26 · 5pm EDT — video is the artifact</h4>
              <div className="nested" style={{ background: "var(--pb-tint-warn)", display: "flex", gap: "1.25rem", alignItems: "center" }}>
                <p className="big" style={{ fontSize: "2rem", color: "var(--pb-warn)", margin: 0 }}>31<span style={{ fontSize: "0.5em", letterSpacing: "0.1em" }}>d</span></p>
                <div>
                  <p className="mrow"><span className="k">Your time</span><span className="ar" style={{ color: "var(--pb-warn)" }}>→</span><span className="v">Sun 26 Oct, 10:00</span></p>
                  <p className="mrow"><span className="k">Review</span><span className="ar" style={{ color: "var(--pb-warn)" }}>→</span><span className="v">Oct 22</span></p>
                </div>
              </div>
              <p className="note"><span className="mk" style={{ color: "var(--pb-warn)" }}>▸</span>Judges will not run your code. Presentation is 25% of the score.</p>
              <p className="fresh">· updated 3h ago</p>
            </div>

            <div className="frag">
              <p className="frag-k"><span style={{ color: "var(--pb-danger)" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17.5v.5" /></svg>fault · rules</span><span className="pill" style={{ background: "var(--pb-tint-danger)", color: "var(--pb-danger)" }}>blocked</span></p>
              <h4>No deadline parsed from the rules yet</h4>
              <p className="mrow" style={{ marginTop: "0.5rem" }}><span className="k">Page</span><span className="ar" style={{ color: "var(--pb-danger)" }}>→</span><span className="v">the Chip Challenge rules</span></p>
              <p className="mrow"><span className="k">Meaning</span><span className="ar" style={{ color: "var(--pb-danger)" }}>→</span><span className="v">unknown, not "no deadline"</span></p>
              <span className="cta-tag" style={{ background: "var(--pb-danger)", color: "var(--pb-on-key)" }}>Retry in chat</span>
            </div>

            <div className="frag">
              <p className="frag-k"><span style={{ color: "var(--pb-ok)" }}>verdict · fit</span><span className="pill" style={{ background: "var(--pb-tint-ok)", color: "var(--pb-ok)" }}>strong fit</span></p>
              <h4>Eligible, and it fits your week</h4>
              <p className="mrow" style={{ marginTop: "0.5rem" }}><span className="k">Stack</span><span className="ar" style={{ color: "var(--pb-ok)" }}>→</span><span className="v">React + Python</span></p>
              <p className="mrow"><span className="k">Payout</span><span className="ar" style={{ color: "var(--pb-ok)" }}>→</span><span className="v">wire to personal account</span></p>
              <p className="fresh">· updated 6h ago</p>
            </div>

            <div className="frag">
              <p className="frag-k"><span style={{ color: "var(--pb-ok)" }}>plan · docs</span><span className="pill" style={{ background: "var(--pb-tint-ok)", color: "var(--pb-ok)" }}>ready</span></p>
              <h4>Build brief is signed off</h4>
              <div className="chips"><span className="chip"><b>✓</b> scope.md</span><span className="chip"><b>✓</b> prd.md</span><span className="chip"><b>✓</b> spec.md</span></div>
              <span className="cta-tag" style={{ background: "var(--pb-ok)", color: "var(--pb-on-key)" }}>Read the plan</span>
            </div>

            <div className="frag">
              <p className="frag-k"><span style={{ color: "var(--pb-quiet)" }}>watch · rules</span><span className="pill">quiet</span></p>
              <h4>Nothing moved since yesterday</h4>
              <p className="mrow" style={{ marginTop: "0.5rem" }}><span className="k">Last check</span><span className="ar">→</span><span className="v">18:40 · clean</span></p>
              <p className="fresh">· low stakes, deliberately muted</p>
            </div>
          </div>
          <p className="bagnote">Sample bag reconstructed from the repo's planning docs (scope.md · prd.md · spec.md) and the card states Caddie actually renders. Contest numbers are Devpost's, not ours.</p>
        </section>

        {/* CLOSING — real auth ─────────────────────────────────── */}
        <section className="close" id="pb-start" aria-labelledby="pb-close-h">
          <div className="close-l">
            <p className="lbl mono">start here</p>
            <h2 id="pb-close-h" className="h2" style={{ marginTop: "1.25rem", maxWidth: "18ch" }}>Put the bag down. Go build.</h2>
            <p className="lede" style={{ marginTop: "1.25rem" }}>Register in 20 seconds. The first contest on the bag is vetted before you finish the onboarding brief.</p>
          </div>
          <div className="close-r">
            <AuthFormCard onAuthed={onAuthed} />
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="foot-mark" aria-hidden="true">Caddie</p>
        <div className="foot-grid">
          <p>Built for Build With AI: Basics · Devpost Learn. The planning docs — scope.md, prd.md, spec.md — live in the repo with the code.</p>
          <nav className="foot-links" aria-label="Footer">
            <a href="https://devpost.com" target="_blank" rel="noreferrer">Devpost</a>
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://caddie.jamalibrahim.dev">Open Caddie</a>
          </nav>
        </div>
      </footer>

      <div className="mbar">
        <span>t-31d · oct 26 5pm</span>
        <a className="btn btn-key" href="#pb-start" style={{ padding: "0.4375rem 0.75rem", fontSize: "0.75rem" }}>Create your bag</a>
      </div>
    </div>
  );
}
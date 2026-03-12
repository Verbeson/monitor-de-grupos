import { useState, useEffect, useRef } from "react";

const MP_SUBSCRIBE_URL = "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=df6fffef0b634a13b94f51ed1fbf4199";

// Substitua pelo link da Chrome Web Store apos publicar
const CHROME_STORE_URL = "https://chrome.google.com/webstore/detail/EXTENSION_ID_AQUI";

const PLANS = [
  {
    name: "Free",
    price: "R$ 0",
    period: "",
    desc: "Para experimentar sem compromisso",
    features: [
      "1 grupo monitorado",
      "1 contato ignorado",
      "1 palavra ignorada",
      "Alertas com som",
    ],
    cta: "Instalar grátis",
    highlight: false,
    link: null,
  },
  {
    name: "Pro",
    price: "R$ 19,90",
    period: "/mês",
    desc: "Para quem não pode perder nada",
    features: [
      "Grupos ilimitados",
      "Contatos ignorados ilimitados",
      "Palavras ignoradas ilimitadas",
      "Alertas com som",
      "Suporte prioritário",
    ],
    cta: "Assinar agora",
    highlight: true,
    link: MP_SUBSCRIBE_URL,
  },
];

const FEATURES = [
  {
    icon: "◎",
    title: "Monitoramento seletivo",
    desc: "Escolha exatamente quais grupos e contatos importam. Ignore o resto.",
  },
  {
    icon: "◈",
    title: "Alertas sonoros",
    desc: "Sons diferentes por conversa. Você sabe o que chegou antes de olhar.",
  },
  {
    icon: "⬡",
    title: "Múltiplas contas",
    desc: "Pessoal e trabalho no mesmo lugar. Sem abrir várias janelas.",
  },
  {
    icon: "◇",
    title: "Filtros inteligentes",
    desc: "Bloqueie números irrelevantes. Seu foco é seu.",
  },
  {
    icon: "○",
    title: "Privacidade total",
    desc: "Seus dados ficam no seu navegador. Não coletamos nada.",
  },
  {
    icon: "◻",
    title: "Popup instantâneo",
    desc: "Notificação aparece onde você está. Sem trocar de aba.",
  },
];

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.15 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

function FadeIn({ children, delay = 0, className = "" }) {
  const ref = useRef();
  const inView = useInView(ref);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [hovered, setHovered] = useState(null);

  const price = (base) => {
    if (base === "R$ 0") return base;
    const num = parseFloat(base.replace("R$ ", "").replace(",", "."));
    const discounted = billingAnnual ? (num * 0.75).toFixed(2).replace(".", ",") : base.replace("R$ ", "");
    return `R$ ${discounted}`;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c10",
      color: "#e8edf2",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; background: #080c10; }
        ::-webkit-scrollbar-thumb { background: #25f57220; border-radius: 2px; }
        .grid-bg {
          background-image: linear-gradient(rgba(37,245,114,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,245,114,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .glow { box-shadow: 0 0 40px rgba(37,245,114,0.12), 0 0 80px rgba(37,245,114,0.04); }
        .glow-border { border: 1px solid rgba(37,245,114,0.25); }
        .glow-border:hover { border-color: rgba(37,245,114,0.6); box-shadow: 0 0 20px rgba(37,245,114,0.1); }
        .btn-primary {
          background: #25f572;
          color: #080c10;
          border: none;
          padding: 14px 32px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: all 0.2s;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
        }
        .btn-primary:hover { background: #5fffa0; transform: translateY(-1px); }
        .btn-ghost {
          background: transparent;
          color: #e8edf2;
          border: 1px solid rgba(232,237,242,0.2);
          padding: 14px 32px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          cursor: pointer;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: all 0.2s;
        }
        .btn-ghost:hover { border-color: rgba(37,245,114,0.5); color: #25f572; }
        .pill {
          display: inline-block;
          border: 1px solid rgba(37,245,114,0.3);
          color: #25f572;
          padding: 4px 14px;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          border-radius: 0;
        }
        .feature-card {
          border: 1px solid rgba(232,237,242,0.07);
          padding: 32px 28px;
          transition: all 0.3s;
          background: rgba(255,255,255,0.01);
        }
        .feature-card:hover {
          border-color: rgba(37,245,114,0.3);
          background: rgba(37,245,114,0.03);
          transform: translateY(-3px);
        }
        .plan-card {
          border: 1px solid rgba(232,237,242,0.1);
          padding: 40px 32px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        .plan-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: transparent;
          transition: background 0.3s;
        }
        .plan-card:hover::before { background: rgba(37,245,114,0.5); }
        .plan-card.highlight {
          border-color: rgba(37,245,114,0.4);
          background: rgba(37,245,114,0.04);
        }
        .plan-card.highlight::before { background: #25f572; }
        .toggle {
          width: 44px; height: 24px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .toggle.on { background: #25f572; }
        .toggle-dot {
          position: absolute;
          top: 3px; left: 3px;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #080c10;
          transition: transform 0.2s;
        }
        .toggle.on .toggle-dot { transform: translateX(20px); }
        .check { color: #25f572; margin-right: 10px; }
        nav a { color: rgba(232,237,242,0.6); text-decoration: none; font-size: 13px; letter-spacing: 0.05em; transition: color 0.2s; }
        nav a:hover { color: #25f572; }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .pulse-ring {
          position: absolute;
          width: 100%; height: 100%;
          border-radius: 50%;
          border: 1px solid #25f572;
          animation: pulse-ring 2.5s ease-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .mockup { animation: float 4s ease-in-out infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .cursor { animation: blink 1s step-end infinite; }
      `}</style>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: "1px solid rgba(232,237,242,0.06)",
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,12,16,0.9)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Monitor<span style={{ color: "#25f572" }}>.</span>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          <a href="#recursos">Recursos</a>
          <a href="#precos">Preços</a>
          <a href="#faq">FAQ</a>
        </div>
        <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: "10px 24px", fontSize: 12, textDecoration: "none" }}>
          Adicionar ao Chrome
        </a>
      </nav>

      {/* HERO */}
      <section className="grid-bg" style={{ padding: "120px 48px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(37,245,114,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
          <div style={{ marginBottom: 24 }}>
            <span className="pill">Chrome Extension</span>
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(48px, 7vw, 84px)",
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            marginBottom: 28,
          }}>
            Nunca mais perca<br />
            <span style={{ color: "#25f572" }}>o que importa</span>
          </h1>
          <p style={{
            fontSize: 17, lineHeight: 1.7,
            color: "rgba(232,237,242,0.55)",
            maxWidth: 520, margin: "0 auto 48px",
          }}>
            Monitore grupos do WhatsApp Web com filtros precisos e alertas sonoros.
            Só o que você definiu chega até você.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: "none" }}>Adicionar ao Chrome — grátis</a>
            <a href="#precos" className="btn-ghost" style={{ textDecoration: "none" }}>Ver planos</a>
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: "rgba(232,237,242,0.3)", letterSpacing: "0.05em" }}>
            SEM CARTÃO DE CRÉDITO &nbsp;·&nbsp; INSTALA EM 30 SEGUNDOS
          </p>
        </div>

        {/* MOCKUP */}
        <div className="mockup" style={{ marginTop: 80, display: "flex", justifyContent: "center" }}>
          <div className="glow" style={{
            background: "#0d1117",
            border: "1px solid rgba(37,245,114,0.2)",
            borderRadius: 12,
            width: 320,
            padding: "20px",
            textAlign: "left",
            fontSize: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#25f572", position: "relative" }}>
                <div className="pulse-ring" />
              </div>
              <span style={{ color: "#25f572", fontSize: 11, letterSpacing: "0.1em" }}>MONITORANDO</span>
              <span style={{ marginLeft: "auto", color: "rgba(232,237,242,0.3)" }}>3 grupos ativos</span>
            </div>
            {[
              { name: "Equipe Dev", msg: "Deploy feito com sucesso", time: "agora", new: true },
              { name: "Clientes VIP", msg: "Obrigado pelo suporte!", time: "2min", new: true },
              { name: "Monitoramento", msg: "Alerta: servidor offline", time: "5min", new: false },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 0",
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0,
                  background: item.new ? "#25f572" : "rgba(255,255,255,0.2)",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: item.new ? "#e8edf2" : "rgba(232,237,242,0.5)", fontWeight: 500 }}>{item.name}</span>
                    <span style={{ color: "rgba(232,237,242,0.3)", fontSize: 10 }}>{item.time}</span>
                  </div>
                  <div style={{ color: "rgba(232,237,242,0.4)", marginTop: 2, fontSize: 11 }}>{item.msg}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(37,245,114,0.6)", fontSize: 11 }}>
              _ configurar filtros<span className="cursor">|</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="recursos" style={{ padding: "100px 48px", maxWidth: 1100, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span className="pill" style={{ marginBottom: 16, display: "inline-block" }}>Recursos</span>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Projetado para foco
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 1, background: "rgba(255,255,255,0.04)" }}>
          {FEATURES.map((f, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="feature-card" style={{ background: "#080c10", height: "100%" }}>
                <div style={{ fontSize: 28, marginBottom: 16, color: "#25f572" }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ color: "rgba(232,237,242,0.5)", fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="precos" style={{ padding: "100px 48px", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span className="pill" style={{ marginBottom: 16, display: "inline-block" }}>Preços</span>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 32 }}>
                Simples e transparente
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
                <span style={{ fontSize: 13, color: billingAnnual ? "rgba(232,237,242,0.4)" : "#e8edf2" }}>Mensal</span>
                <div className={`toggle ${billingAnnual ? "on" : ""}`} onClick={() => setBillingAnnual(!billingAnnual)}>
                  <div className="toggle-dot" />
                </div>
                <span style={{ fontSize: 13, color: billingAnnual ? "#25f572" : "rgba(232,237,242,0.4)" }}>
                  Anual <span style={{ fontSize: 11, opacity: 0.7 }}>(-25%)</span>
                </span>
              </div>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {PLANS.map((plan, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className={`plan-card ${plan.highlight ? "highlight" : ""}`}>
                  {plan.highlight && (
                    <div style={{
                      position: "absolute", top: 16, right: 16,
                      background: "#25f572", color: "#080c10",
                      fontSize: 10, padding: "3px 10px",
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      fontWeight: 500,
                    }}>Popular</div>
                  )}
                  <div style={{ marginBottom: 8, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(232,237,242,0.5)" }}>{plan.name}</div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800 }}>{price(plan.price)}</span>
                    <span style={{ color: "rgba(232,237,242,0.4)", fontSize: 13 }}>{plan.period}</span>
                  </div>
                  <p style={{ color: "rgba(232,237,242,0.45)", fontSize: 13, marginBottom: 28 }}>{plan.desc}</p>
                  <ul style={{ listStyle: "none", marginBottom: 36 }}>
                    {plan.features.map((f, j) => (
                      <li key={j} style={{ fontSize: 13, marginBottom: 10, color: "rgba(232,237,242,0.75)", display: "flex", alignItems: "flex-start" }}>
                        <span className="check">+</span>{f}
                      </li>
                    ))}
                  </ul>
                  {plan.link ? (
                    <a href={plan.link} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ width: "100%", display: "block", textAlign: "center", textDecoration: "none" }}>
                      {plan.cta}
                    </a>
                  ) : (
                    <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ width: "100%", display: "block", textAlign: "center", textDecoration: "none" }}>
                      {plan.cta}
                    </a>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "100px 48px", maxWidth: 700, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="pill" style={{ marginBottom: 16, display: "inline-block" }}>FAQ</span>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Dúvidas frequentes
            </h2>
          </div>
        </FadeIn>
        {[
          { q: "Precisa deixar o WhatsApp Web aberto?", a: "Sim. A extensão lê as notificações em tempo real do WhatsApp Web. A aba pode estar em segundo plano, mas precisa estar aberta." },
          { q: "Meus dados são coletados?", a: "Não. Tudo processa localmente no seu navegador. Nenhuma mensagem ou dado é enviado para nossos servidores." },
          { q: "Funciona com WhatsApp Business?", a: "Sim, funciona com contas pessoais e Business no WhatsApp Web." },
          { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem multa, sem burocracia. Cancele direto pelo painel a qualquer hora." },
        ].map((item, i) => (
          <FadeIn key={i} delay={i * 0.07}>
            <div style={{
              borderBottom: "1px solid rgba(232,237,242,0.07)",
              padding: "24px 0",
            }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#e8edf2" }}>
                <span style={{ color: "#25f572", marginRight: 12, fontSize: 12 }}>+</span>{item.q}
              </div>
              <p style={{ color: "rgba(232,237,242,0.5)", fontSize: 14, lineHeight: 1.7, paddingLeft: 22 }}>{item.a}</p>
            </div>
          </FadeIn>
        ))}
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: "80px 48px 100px", textAlign: "center" }}>
        <FadeIn>
          <div className="glow-border" style={{ maxWidth: 640, margin: "0 auto", padding: "64px 48px", background: "rgba(37,245,114,0.02)" }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>
              Pronto para ter<br /><span style={{ color: "#25f572" }}>foco de verdade?</span>
            </h2>
            <p style={{ color: "rgba(232,237,242,0.45)", fontSize: 15, marginBottom: 36 }}>
              Instale grátis e configure em menos de 2 minutos.
            </p>
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ fontSize: 14, padding: "16px 40px", textDecoration: "none", display: "inline-block" }}>
              Adicionar ao Chrome — grátis
            </a>
          </div>
        </FadeIn>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(232,237,242,0.06)", padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800 }}>
          Monitor<span style={{ color: "#25f572" }}>.</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(232,237,242,0.25)", letterSpacing: "0.05em" }}>
          Extensão não oficial. Sem vínculo com WhatsApp LLC ou Meta.
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="/monitor-de-grupos/privacy.html" style={{ fontSize: 12, color: "rgba(232,237,242,0.35)", textDecoration: "none" }}>Privacidade</a>
        </div>
      </footer>
    </div>
  );
}

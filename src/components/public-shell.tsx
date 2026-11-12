import Link from "next/link";
import { Menu, Sprout } from "lucide-react";

export function PublicHeader() {
  return <>
    <div className="announcement">2026–2027 admissions are open · This is a fictional demonstration school</div>
    <header className="public-nav">
      <div className="container nav-row">
        <Link className="brand" href="/"><span className="brand-mark">N</span><span>Nanjil Grove Academy</span></Link>
        <nav className="nav-links" aria-label="Primary navigation">
          <Link href="/">Home</Link><Link href="/about">About</Link><Link href="/academics">Academics</Link><Link href="/campus-life">Campus Life</Link><Link href="/admissions">Admissions</Link>
        </nav>
        <Link className="button secondary" href="/login">Portal</Link>
        <Link className="button mobile-nav" href="/admissions" aria-label="Open admissions and navigation"><Menu size={18} /> Menu</Link>
      </div>
    </header>
  </>;
}

export function PublicFooter() {
  return <footer className="footer"><div className="container">
    <div className="footer-statement">Learn deeply. Lead kindly. Build what comes next.</div>
    <div className="footer-grid">
      <div><div className="brand"><span className="brand-mark"><Sprout size={20}/></span><span>Nanjil Grove Academy</span></div><p>A fictional demonstration institution by Infinex Loop, Nagercoil.</p></div>
      <div><strong>Explore</strong><Link href="/about">About school</Link><Link href="/academics">Academics</Link><Link href="/campus-life">Campus life</Link></div>
      <div><strong>Admissions</strong><Link href="/admissions">Apply online</Link><Link href="/admissions#track">Track application</Link><Link href="/demo-access">Demo access</Link></div>
      <div><strong>Contact</strong><a href="tel:+914652290260">+91 4652 290 260</a><a href="mailto:office@nanjilgrove.demo">office@nanjilgrove.demo</a><span>Nagercoil · Tamil Nadu</span></div>
    </div>
    <p style={{marginTop: "2rem", opacity: .7, fontSize: ".78rem"}}>© 2026 Nanjil Grove Academy demo. All people and records are synthetic.</p>
  </div></footer>;
}

export function PublicPage({ children }: { children: React.ReactNode }) { return <><PublicHeader/><main>{children}</main><PublicFooter/></>; }

export function PageHero({ title, children }: { title: string; children: React.ReactNode }) { return <section className="page-hero"><div className="container"><h1>{title}</h1><p>{children}</p></div></section>; }

export function SectionHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) { return <div className="section-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div><p>{children}</p></div>; }

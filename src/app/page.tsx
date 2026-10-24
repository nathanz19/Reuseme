import Link from "next/link";
import { ScrollFade } from "@/components/ScrollFade";
import { EditorLink } from "@/components/EditorLink";
import Image from "next/image";
import { SectionLink } from "@/components/SectionLink";
import { ScrollBubble } from "@/components/ScrollBubble";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ArrowUpRight, Check, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div data-landing-scroll className="landing-page h-dvh overflow-y-auto bg-white text-[#263c30] selection:bg-[#cdd8bf]">
      <header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6 sm:px-10">
        <nav aria-label="Main navigation" className="flex items-center text-xs sm:text-sm">
          <SectionLink id="how-it-works">How it works</SectionLink>
        </nav>
        <Link href="/" aria-label="Reuseme home" className="flex items-center justify-self-center gap-2 text-base tracking-[-0.04em] sm:text-lg">
          REUSEME <Image src="/favicon.ico" alt="" width={22} height={22} />
        </Link>
        <EditorLink className="flex items-center gap-2 justify-self-end text-xs sm:text-sm hover:underline underline-offset-4">Open editor <ArrowUpRight size={16} /></EditorLink>
      </header>

      <main>
        <section className="relative isolate grid overflow-hidden lg:min-h-[calc(100dvh-76px)] lg:grid-cols-2">
          <ScrollBubble />
          <ScrollReveal className="flex flex-col items-start justify-center px-6 py-20 sm:px-10 sm:py-24 lg:py-20">
            <p className="mb-8 text-xs uppercase tracking-[0.17em]">More convenient resume builder for you</p>
            <ScrollFade><h1 className="max-w-3xl font-serif text-[clamp(4rem,8vw,9rem)] leading-[0.96] tracking-[-0.055em]">Reuse more,<br />apply more.</h1></ScrollFade>
            <p className="mt-10 max-w-md text-xl leading-x`snug tracking-tight sm:text-2xl">All your experience, in one place. A thoughtful resume for every opportunity.</p>
            <EditorLink className="mt-9 inline-flex items-center gap-5 border-b border-[#263c30] pb-1.5 text-base transition-colors hover:text-[#52704e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#263c30]">Get started <ArrowRight size={18} /></EditorLink>
            <p className="mt-5 text-xs text-[#586650]">No account needed. Documents saved in your browser. Free AI-Tailered resume review.</p>
          </ScrollReveal>

          <div aria-hidden="true" className="relative flex min-h-[580px] items-center justify-center overflow-hidden bg-[#dfe3da] px-7 py-16 sm:px-16 lg:mr-2 lg:min-h-[700px] lg:px-10">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.5)_45%,transparent_70%)]" />
            <ScrollReveal delay={180} className="relative w-full max-w-[430px] -rotate-3 bg-[#fffefa] px-8 py-12 text-[#263c30] shadow-[16px_28px_65px_-25px_rgba(38,60,48,0.4)] sm:px-11">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#78806f]">Your story, thoughtfully told</p>
              <p className="mt-5 font-serif text-4xl tracking-tight">Alex Morgan</p>
              <p className="mt-2 text-[10px] text-[#78806f]">Product designer · Brooklyn, NY</p>
              <div className="mt-8 border-t border-[#d9ddcf] pt-4">
                <p className="text-[9px] uppercase tracking-[0.16em]">Profile</p>
                <p className="mt-3 font-serif text-base leading-relaxed">Turning thoughtful ideas into simple, useful experiences.</p>
              </div>
              <div className="mt-7 border-t border-[#d9ddcf] pt-4">
                <p className="text-[9px] uppercase tracking-[0.16em]">Experience</p>
                <p className="mt-4 text-xs font-medium">A career built on curiosity</p>
                <p className="mt-1 text-[9px] text-[#78806f]">Your role · Your company · Your impact</p>
                <div className="mt-4 space-y-2.5"><div className="h-1 w-full bg-[#e8eade]" /><div className="h-1 w-11/12 bg-[#e8eade]" /><div className="h-1 w-4/5 bg-[#e8eade]" /></div>
              </div>
              <div className="mt-7 border-t border-[#d9ddcf] pt-4">
                <p className="text-[9px] uppercase tracking-[0.16em]">Selected projects</p>
                <div className="mt-4 space-y-2.5"><div className="h-1 w-full bg-[#e8eade]" /><div className="h-1 w-4/5 bg-[#e8eade]" /></div>
              </div>
              <div className="mt-10 flex items-center gap-2 text-[9px] text-[#78806f]"><Check size={12} /> Made for your next opportunity.</div>
            </ScrollReveal>
            <span className="absolute right-6 bottom-6 text-[10px] uppercase tracking-[0.18em] text-[#586650]">A fresh page. A new possibility.</span>
          </div>
        </section>

        <section id="how-it-works" aria-label="How Reuseme helps" className="scroll-mt-8 px-6 py-20 sm:px-10 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
            <ScrollReveal><h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Less starting over.<br />More moving forward.</h2></ScrollReveal>
            <div className="grid gap-9 sm:grid-cols-3">
              {[
                { title: "Keep your story", text: "Collect your roles, projects, and skills in a vault you can come back to." },
                { title: "Find the right words", text: "Use AI and a job description to tailor the experience you already have." },
                { title: "Make your next move", text: "Choose a template, arrange your content, and export a polished PDF." },
              ].map(({ title, text }, index) => <ScrollReveal key={title} delay={index * 120} className="border-t border-[#263c30]/25 pt-4"><p className="mb-6 text-xs text-[#78806f]">0{index + 1}</p><h3 className="text-base font-medium">{title}</h3><p className="mt-3 text-sm leading-relaxed text-[#586650]">{text}</p></ScrollReveal>)}
            </div>
          </div>
        </section>
        <footer id="about" className="mx-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#263c30]/20 py-7 text-xs text-[#586650] sm:mx-10"><span>REUSEME</span><p>© 2026 REUSEME. All rights reserved.</p></footer>
      </main>
    </div>
  );
}

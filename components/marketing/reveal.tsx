"use client";

// Reveal-on-scroll del mockup V3: IntersectionObserver que añade la clase `.in`
// (con `prefers-reduced-motion` cubierto en marketing.css). Variante "stagger"
// escalona la entrada de los hijos directos.

import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  as?: "section" | "div" | "footer";
  variant?: "reveal" | "stagger";
  id?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function Reveal({ as: Tag = "section", variant = "reveal", id, className, style, children }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const base = variant === "stagger" ? "ld-stagger" : "ld-reveal";
  return createElement(
    Tag,
    { ref, id, className: className ? `${base} ${className}` : base, style },
    children
  );
}

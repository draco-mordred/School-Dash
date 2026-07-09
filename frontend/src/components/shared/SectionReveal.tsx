import React, { useEffect, useRef, useState } from "react";

type Props = React.PropsWithChildren<{
  id?: string;
  className?: string;
}>;

export default function SectionReveal({ id, className = "", children }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq && mq.matches) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsRevealed(true);
          else setIsRevealed(false);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "-10% 0px -10% 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id={id} ref={ref as any} className={`${className} section-reveal ${isRevealed ? "is-revealed" : ""}`}>
      {children}
    </section>
  );
}

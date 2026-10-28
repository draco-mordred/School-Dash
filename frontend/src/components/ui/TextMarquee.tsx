import { useEffect, useRef, useState } from "react";

/**
 * Apple Music-style text flow marquee.
 * Renders children in a single line; when the text overflows the container
 * it continuously scrolls back and forth at a gentle, readable pace
 * (pauses on hover). Uses the .text-flow-* styles in index.css.
 */
const TextMarquee = ({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const textNode = element.querySelector(".text-flow-track") as HTMLElement | null;
      if (!textNode) return;

      const nextDistance = Math.max(0, textNode.scrollWidth - element.clientWidth);
      setDistance(nextDistance);
      setShouldAnimate(nextDistance > 4);
    };

    measure();

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={`text-flow-scroll w-full ${className}`}
      style={{
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        ["--marquee-distance" as string]: `${distance}px`,
        ["--marquee-duration" as string]: "22s",
        ...style,
      }}
    >
      <span className={`text-flow-track ${shouldAnimate ? "text-flow-animate" : ""}`}>
        {children}
      </span>
    </div>
  );
};

export default TextMarquee;

import { h, JSX, Fragment } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ITestimonial } from "../testimonitals";
import { IconStar } from "../../../components/icons/iconStar";
import { IconHeart } from "../../../components/icons/iconHeart";
import { IconArrowRight } from "../../../components/icons/iconArrowRight";
import { Tailwind_colors, Tailwind_semantic } from "../../../utils/tailwindConfig";
import { Markdown } from "../../../components/markdown";

function applyHighlight(text: string, highlight?: [number, number]): string {
  if (!highlight) {
    return text;
  }
  return text.slice(0, highlight[0]) + "**" + text.slice(highlight[0], highlight[1]) + "**" + text.slice(highlight[1]);
}

function sourceLabel(source: ITestimonial["source"]): string {
  switch (source) {
    case "appstore":
      return "Appstore";
    case "googleplay":
      return "Google Play";
    case "reddit":
      return "Reddit";
  }
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type ITestimonialTab = "stores" | "reddit";

export function TestimonialsView(props: { testimonials: ITestimonial[] }): JSX.Element {
  const shuffled = useMemo(() => {
    const stores = shuffle(props.testimonials.filter((t) => t.source === "appstore" || t.source === "googleplay")).sort(
      (a, b) => (a.priority || 99) - (b.priority || 99)
    );
    const reddit = shuffle(props.testimonials.filter((t) => t.source === "reddit")).sort(
      (a, b) => (a.priority || 99) - (b.priority || 99)
    );
    return { stores, reddit };
  }, [props.testimonials]);

  const [tab, setTab] = useState<ITestimonialTab>("stores");
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = (): void => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const items = tab === "stores" ? shuffled.stores : shuffled.reddit;
  const perPage = isMobile ? 1 : 2;
  const maxPage = Math.max(0, Math.ceil(items.length / perPage) - 1);
  const gap = 16;
  const buffer = 4;
  const [renderedPages, setRenderedPages] = useState(buffer);

  useEffect(() => {
    if (page + buffer > renderedPages) {
      setRenderedPages(page + buffer);
    }
  }, [page, buffer, renderedPages]);

  const getPageWidth = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return 0;
    }
    const firstChild = el.children[0] as HTMLElement | undefined;
    if (!firstChild) {
      return el.offsetWidth + gap;
    }
    return firstChild.offsetWidth + gap;
  }, [gap]);

  const scrollToPage = useCallback(
    (p: number) => {
      const el = scrollRef.current;
      if (!el) {
        return;
      }
      const pageWidth = getPageWidth();
      isScrolling.current = true;
      el.scrollTo({ left: p * pageWidth, behavior: "smooth" });
      setTimeout(() => {
        isScrolling.current = false;
      }, 400);
    },
    [getPageWidth]
  );

  const handleScroll = useCallback(() => {
    if (isScrolling.current) {
      return;
    }
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const pageWidth = getPageWidth();
    if (pageWidth === 0) {
      return;
    }
    const newPage = Math.round(el.scrollLeft / pageWidth);
    setPage(newPage);
  }, [getPageWidth]);

  const handleTabChange = (newTab: ITestimonialTab): void => {
    setTab(newTab);
    setPage(0);
    setRenderedPages(buffer);
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ left: 0 });
    }
  };

  const handlePrev = (): void => {
    const p = Math.max(0, page - 1);
    setPage(p);
    scrollToPage(p);
  };

  const handleNext = (): void => {
    const p = Math.min(maxPage, page + 1);
    setPage(p);
    scrollToPage(p);
  };

  return (
    <div className="relative py-12 mx-0 md:mx-auto md:py-20" style={{ maxWidth: 1000 }}>
      <div className="flex items-center justify-center gap-3 px-4 mb-4">
        <h2 className="text-3xl font-bold md:text-4xl">Athletes</h2>
        <IconHeart size={32} color={Tailwind_colors().red[500]} />
        <h2 className="text-3xl font-bold md:text-4xl">Liftosaur</h2>
      </div>
      <div className="flex justify-center gap-2 px-4 mb-8">
        <button
          className="px-4 py-2 text-sm font-semibold transition-colors rounded-full cursor-pointer hover:bg-purple-50 active:bg-purple-200"
          style={{
            backgroundColor: tab === "stores" ? Tailwind_colors().purple[100] : undefined,
            color: tab === "stores" ? Tailwind_colors().purple[700] : Tailwind_semantic().text.secondary,
          }}
          onClick={() => handleTabChange("stores")}
        >
          App Stores
        </button>
        <button
          className="px-4 py-2 text-sm font-semibold transition-colors rounded-full cursor-pointer hover:bg-purple-50 active:bg-purple-200"
          style={{
            backgroundColor: tab === "reddit" ? Tailwind_colors().purple[100] : undefined,
            color: tab === "reddit" ? Tailwind_colors().purple[700] : Tailwind_semantic().text.secondary,
          }}
          onClick={() => handleTabChange("reddit")}
        >
          Reddit
        </button>
      </div>
      <div className="hidden md:block">
        <div
          className="absolute flex justify-end gap-2"
          style={{
            right: "1.5rem",
            top: "8.5rem",
          }}
        >
          <div className="flex gap-2">
            <button
              className="flex items-center justify-center w-10 h-10 transition-colors border rounded-full cursor-pointer border-border-prominent hover:bg-gray-100 active:bg-gray-200"
              onClick={handlePrev}
              style={{ opacity: page === 0 ? 0.5 : 1 }}
              disabled={page === 0}
            >
              <IconArrowRight style={{ transform: "rotate(180deg)" }} />
            </button>
            <button
              className="flex items-center justify-center w-10 h-10 transition-colors border rounded-full cursor-pointer border-border-prominent hover:bg-gray-100 active:bg-gray-200"
              style={{ opacity: page >= maxPage ? 0.5 : 1 }}
              onClick={handleNext}
              disabled={page >= maxPage}
            >
              <IconArrowRight />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto hide-scrollbar"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          gap: `${gap}px`,
          ...(isMobile
            ? { paddingLeft: "16px", paddingRight: "16px", scrollPaddingLeft: "32px", scrollPaddingRight: "32px" }
            : {}),
        }}
      >
        {Array.from({ length: Math.min(renderedPages, maxPage + 1) }, (_, pageIdx) => {
          const pageItems = items.slice(pageIdx * perPage, pageIdx * perPage + perPage);
          return (
            <div
              className="flex items-start flex-shrink-0"
              style={{
                scrollSnapAlign: "start",
                gap: `${gap}px`,
                width: isMobile ? "calc(100% - 32px)" : "100%",
              }}
            >
              {pageItems.map((t) => {
                const stars = Array.from({ length: t.rating || 0 }, (__, si) => (
                  <IconStar key={si} isSelected={true} color={Tailwind_colors().yellow[500]} />
                ));
                return (
                  <div className="flex-1 p-6 border border-yellow-200 md:p-8 rounded-2xl bg-yellow-50">
                    {t.source === "reddit" ? (
                      <div
                        className="mb-6 text-base leading-relaxed"
                        style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
                      >
                        <Markdown
                          value={applyHighlight(t.text, t.highlight)}
                          className="markdown testimonial-highlight"
                        />
                      </div>
                    ) : (
                      <p className="mb-6 text-base leading-relaxed">
                        {t.highlight ? (
                          <>
                            {t.text.slice(0, t.highlight[0])}
                            <strong
                              style={{
                                backgroundColor: Tailwind_colors().yellow[200],
                                boxDecorationBreak: "clone",
                                WebkitBoxDecorationBreak: "clone",
                              }}
                            >
                              {t.text.slice(t.highlight[0], t.highlight[1])}
                            </strong>
                            {t.text.slice(t.highlight[1])}
                          </>
                        ) : (
                          t.text
                        )}
                      </p>
                    )}
                    <div className="text-sm font-bold" style={{ color: Tailwind_semantic().text.primary }}>
                      {t.source === "reddit" ? (
                        <a
                          href={t.url}
                          target="_blank"
                          className="underline"
                          style={{ color: Tailwind_semantic().text.link }}
                        >
                          {t.author} on Reddit
                        </a>
                      ) : (
                        <a
                          href={t.url}
                          target="_blank"
                          className="underline"
                          style={{ color: Tailwind_semantic().text.link }}
                        >
                          {t.author} on {sourceLabel(t.source)}
                        </a>
                      )}
                    </div>
                    {stars.length > 0 && <div className="flex gap-0 mt-1">{stars}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

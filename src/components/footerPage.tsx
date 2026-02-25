import { JSX, h } from "preact";
import { IconInstagramFlat } from "./icons/iconInstagramFlat";
import { IconYoutube } from "./icons/iconYoutube";
import { IconReddit } from "./icons/iconReddit";
import { IconDiscord } from "./icons/iconDiscord";

interface IProps {
  maxWidth?: number;
}

const footerLinks: [string, string][] = [
  ["Roadmap", "https://github.com/astashov/liftosaur/discussions"],
  ["Docs", "/docs"],
  ["Web Editor", "/planner"],
  ["1RM Calculator", "/one-rep-max-calculator"],
  ["Your Programs", "/user/programs"],
  ["Blog", "/blog"],
  ["Exercises", "/exercises"],
  ["Terms & Conditions", "/terms.html"],
  ["Privacy", "/privacy.html"],
  ["Affiliate Program", "/affiliates"],
];

export function FooterPage(props: IProps): JSX.Element {
  const maxWidth = props.maxWidth != null ? `${props.maxWidth}px` : "800px";
  return (
    <footer className="mt-8 ">
      <div style={{ backgroundColor: "#28204B" }}>
        <div className="px-6 mx-auto" style={{ maxWidth }}>
          <div className="flex flex-col md:flex-row md:items-center md:gap-10">
            <div className="hidden pt-8 md:block shrink-0">
              <img src="/images/logo.svg" alt="" style={{ height: "200px" }} />
            </div>

            <div className="shrink-0">
              <div className="pt-8 text-3xl font-bold text-white md:pt-0">Liftosaur</div>
              <div className="flex items-center gap-4 mt-5">
                <span className="text-sm text-white">Follow us:</span>
                <a
                  href="https://www.instagram.com/liftosaurapp"
                  target="_blank"
                  className="opacity-80 hover:opacity-100"
                >
                  <IconInstagramFlat size={28} color="#fff" />
                </a>
                <a href="https://www.youtube.com/@Liftosaur" target="_blank" className="opacity-80 hover:opacity-100">
                  <IconYoutube size={28} color="#fff" secondaryColor="#28204B" />
                </a>
                <a href="https://www.reddit.com/r/liftosaur" target="_blank" className="opacity-80 hover:opacity-100">
                  <IconReddit size={28} color="#fff" secondaryColor="#28204B" />
                </a>
                <a href="https://discord.gg/AAh3cvdBRs" target="_blank" className="opacity-80 hover:opacity-100">
                  <IconDiscord size={28} color="#fff" />
                </a>
              </div>
              <div className="mt-4 text-sm text-white">
                Questions?{" "}
                <a href="mailto:info@liftosaur.com" className="text-purple-300 underline">
                  info@liftosaur.com
                </a>
              </div>
            </div>

            <div className="flex-1 mt-8 md:mt-0 md:flex md:justify-end">
              <div className="footer-links-grid gap-x-10 gap-y-3">
                {footerLinks.map(([text, link]) => (
                  <a
                    className="text-sm text-gray-300 no-underline hover:text-white"
                    href={link}
                    target={link.startsWith("http") ? "_blank" : undefined}
                  >
                    {text}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 md:hidden">
            <img src="/images/logo.svg" alt="" style={{ height: "200px" }} />
          </div>
        </div>
      </div>
    </footer>
  );
}

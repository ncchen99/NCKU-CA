import Link from "next/link";
import { ArrowLongRightIcon } from "@heroicons/react/20/solid";

const QUICK_NAV = [
  { label: "關於我們", href: "/about" },
  { label: "組織章程", href: "/charter/charter" },
  { label: "幹部成員", href: "/members" },
  { label: "最新消息", href: "/news" },
  { label: "活動回顧", href: "/activities" },
];

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.092.044 1.545.103v3.236h-1.098c-1.614 0-2.24.612-2.24 2.205v2.014h3.19l-.548 3.667h-2.642v8.112a12.008 12.008 0 0 0 9.146-9.191h-3.17a8.005 8.005 0 0 1-4.796 5.74v-5.74H9.101Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069Zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-white">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand column — 2/4 */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="NCA Logo" className="h-7 w-7 shrink-0" />
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-[650] tracking-tight text-neutral-950">
                  成大社聯會
                </span>
                <span className="font-mono text-[13px] font-[700] uppercase tracking-wider text-neutral-400">
                  NCKU NCA
                </span>
              </div>
            </Link>

            <p className="mt-4 max-w-[40ch] text-[13px] leading-6 text-neutral-600">
              國立成功大學社團聯合會，致力於促進校內社團交流與合作，提供社團發展支援與資源整合服務。
            </p>

            <div className="mt-5 flex items-center gap-2">
              {[
                { Icon: FacebookIcon, href: "#", label: "Facebook" },
                { Icon: InstagramIcon, href: "#", label: "Instagram" },
                { Icon: YouTubeIcon, href: "#", label: "YouTube" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
                >
                  <Icon className="h-3.5 w-3.5 text-neutral-600" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick nav column — 1/4 */}
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-neutral-950">
              快速導覽
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {QUICK_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-neutral-600 transition-colors hover:text-neutral-950"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column — 1/4 */}
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-neutral-950">
              聯繫我們
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li>
                <a
                  href="mailto:nca@gs.ncku.edu.tw"
                  className="text-[13px] text-neutral-600 transition-colors hover:text-neutral-950"
                >
                  nca@gs.ncku.edu.tw
                </a>
              </li>
              <li>
                <span className="text-[13px] text-neutral-600">
                  成功大學 光復校區
                </span>
              </li>
              <li className="mt-1">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-1 text-[13px] font-medium text-primary transition-colors hover:text-primary-dark"
                >
                  登入系統
                  <ArrowLongRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row lg:px-8">
          <p className="font-mono text-[11px] text-neutral-400">
            &copy; {new Date().getFullYear()} 國立成功大學社團聯合會
          </p>
          <p className="font-mono text-[11px] text-neutral-400">
            Built with Next.js &middot; Tailwind CSS &middot; Firebase
          </p>
        </div>
      </div>
    </footer>
  );
}

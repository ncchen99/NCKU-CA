import Link from "next/link";


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
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
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


export function Footer() {
  return (
    <footer className="bg-white">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand column — wider */}
          <div className="sm:col-span-2 lg:col-span-6">
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

            <p className="mt-4 max-w-[56ch] text-[13px] leading-6 text-neutral-600">
              成大學生社團聯合會作為綜理學生社團事務之學生自治組織，對內代表學生社團向校方維護權益，對外則協助爭取引進外部資源
            </p>

            <div className="mt-5 flex items-center gap-2">
              {[
                { Icon: FacebookIcon, href: "https://www.facebook.com/nckuca/", label: "Facebook" },
                { Icon: InstagramIcon, href: "https://www.instagram.com/nca.ncku/", label: "Instagram" },
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

          {/* Quick nav column */}
          <div className="lg:col-span-3 lg:justify-self-end text-left">
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

          {/* Contact column */}
          <div className="lg:col-span-3 lg:justify-self-end text-left">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-neutral-950">
              聯繫我們
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li>
                <a
                  href="mailto:nca.ncku@gmail.com"
                  className="text-[13px] text-neutral-600 transition-colors hover:text-neutral-950"
                >
                  nca.ncku@gmail.com
                </a>
              </li>
              <li>
                <span className="text-[13px] text-neutral-600">
                  台南市東區大學路 1 號學生活動中心 2 樓社團聯合會辦公室
                </span>
              </li>

            </ul>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-center sm:flex-row sm:text-left lg:px-8">
          <p className="font-mono text-[12px] text-neutral-400">
            &copy; {new Date().getFullYear()} 國立成功大學社團聯合會
          </p>
          <a
            href="https://github.com/ncchen99/NCKU-CA"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[12px] text-neutral-400 transition-colors hover:text-neutral-700"
          >
            GitHub Repository
          </a>
        </div>
      </div>
    </footer>
  );
}

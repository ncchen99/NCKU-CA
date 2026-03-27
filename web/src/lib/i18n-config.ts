export const SUPPORTED_LOCALES = ["zh-TW", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const I18N_COOKIE_NAME = "nca-locale";

// Config-file fallback. Environment variables can override this.
const I18N_DEFAULT_ENABLED = false;

function parseBooleanFlag(value: string | undefined): boolean | undefined {
  if (value == null || value.trim() === "") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function parseLocaleFlag(value: string | undefined): AppLocale | undefined {
  if (value == null || value.trim() === "") return undefined;
  const normalized = normalizeLocale(value);
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : undefined;
}

const publicEnvFlag = parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_I18N);
const serverEnvFlag = parseBooleanFlag(process.env.ENABLE_I18N);
const publicDefaultLocale = parseLocaleFlag(process.env.NEXT_PUBLIC_DEFAULT_LOCALE);
const serverDefaultLocale = parseLocaleFlag(process.env.DEFAULT_LOCALE);

export const DEFAULT_LOCALE: AppLocale =
  publicDefaultLocale ?? serverDefaultLocale ?? "zh-TW";

export const I18N_ENABLED =
  publicEnvFlag ?? serverEnvFlag ?? I18N_DEFAULT_ENABLED;

export function normalizeLocale(input?: string | null): AppLocale {
  if (!input) return DEFAULT_LOCALE;

  const normalized = input.trim().toLowerCase();

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  if (normalized === "zh" || normalized === "zh-tw" || normalized === "zh_tw") {
    return "zh-TW";
  }

  return DEFAULT_LOCALE;
}

export function getDateLocale(locale: AppLocale): string {
  return locale === "en" ? "en-US" : "zh-TW";
}

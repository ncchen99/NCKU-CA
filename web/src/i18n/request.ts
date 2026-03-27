import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  DEFAULT_LOCALE,
  I18N_COOKIE_NAME,
  I18N_ENABLED,
  normalizeLocale,
} from "@/lib/i18n-config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(I18N_COOKIE_NAME)?.value;

  const locale = I18N_ENABLED
    ? normalizeLocale(cookieLocale)
    : DEFAULT_LOCALE;

  const messages =
    locale === "en"
      ? (await import("../../messages/en.json")).default
      : (await import("../../messages/zh-TW.json")).default;

  return {
    locale,
    messages,
  };
});

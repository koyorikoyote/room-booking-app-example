import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../../../locales/en.json";
import jaCommon from "../../../locales/ja.json";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
    },
    ja: {
      common: jaCommon,
    },
  },
  lng: "ja",
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

if (typeof window !== "undefined") {
  // eslint-disable-next-line no-undef
  window.i18n = i18n;
}

export default i18n;

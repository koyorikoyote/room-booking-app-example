import { i18n as I18nInstance } from "i18next";

declare global {
  interface Window {
    i18n: I18nInstance;
  }
}

export {};

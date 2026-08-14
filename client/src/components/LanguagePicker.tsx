/**
 * LanguagePicker — chip-grid language selection.
 *
 * DELIBERATELY no dropdown: iOS WKWebView eats dropdown item taps (the
 * BirthdayPicker saga, Aug 2026). Chips work everywhere.
 *
 * Two exports:
 *  - <LanguagePicker/>: the chip grid (for the Account page section)
 *  - <LanguageButton/>: compact 🌐 button + dialog (for headers, e.g. Landing
 *    where a Brazilian visitor needs to switch BEFORE signing up)
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/i18n";
import { Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LanguagePicker() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              current === l.code
                ? "border-primary bg-primary/10 font-semibold"
                : "border-border hover:bg-muted"
            }`}
          >
            <span className="text-lg leading-none">{l.flag}</span>
            {l.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{t("lang.note")}</p>
    </div>
  );
}

export function LanguageButton() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t("common.language")}
      >
        <Globe className="w-5 h-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("lang.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2 mb-1">{t("lang.sub")}</p>
          <LanguagePicker />
        </DialogContent>
      </Dialog>
    </>
  );
}

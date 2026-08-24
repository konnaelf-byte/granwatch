// Shorten over-long UI labels (buttons/chips/badges) across locales so text fits
// tight components. Alternative-text strategy per Konna 2026-08-23. Run: node scripts/shorten-i18n-labels.mjs
import fs from "fs";
const dir = "client/src/locales";
const patch = {
  af: {
    "counters.saveChanges": "Stoor",
    "counters.addCounter": "Voeg by",
    "settings.saveSettings": "Stoor",
    "care.freqTwiceDaily": "2x per dag",
    "dashboard.dueSoon": "Binnekort",
    "ring.dueSoon": "Binnekort",
    "ring.noVisits": "Geen besoeke",
  },
  nl: {
    "elder.logVisitBtn": "✓ Bezoek loggen",
    "elder.logVisit": "Bezoek loggen",
    "elder.visitedToday": "Vandaag bezocht 💚",
    "counters.saveChanges": "Opslaan",
    "counters.addCounter": "Toevoegen",
    "settings.saveSettings": "Opslaan",
    "care.markAttended": "Bijgewoond",
    "care.freqTwiceDaily": "2x per dag",
    "dashboard.dueSoon": "Binnenkort",
    "ring.dueSoon": "Binnenkort",
  },
  fr: {
    "counters.saveChanges": "Enregistrer",
    "counters.addCounter": "Ajouter",
    "counters.twoWeeks": "Tous les 15 jours",
    "counters.quarterly": "Trimestriel",
    "settings.saveSettings": "Enregistrer",
    "care.freqTwiceDaily": "2x par jour",
    "common.saving": "Sauvegarde…",
    "ring.dueSoon": "Bientôt",
    "ring.noVisits": "Aucune visite",
    "elder.bookVisit": "Réserver",
    "elder.bookDate": "Réserver {{date}}",
    "join.joinBtn": "Rejoindre",
  },
  de: {
    "counters.saveChanges": "Speichern",
    "counters.addCounter": "Hinzufügen",
    "settings.saveSettings": "Speichern",
    "care.markAttended": "Wahrgenommen",
    "care.freqTwiceDaily": "2x täglich",
    "care.adding": "Hinzufügen…",
    "care.addOne": "Hinzufügen",
    "settings.saving": "Speichern…",
    "settings.leaving": "Verlasse…",
    "elder.logging": "Speichert…",
    "elder.uploading": "Lädt hoch…",
    "plus.restoring": "Wiederherstellen…",
    "signin.useCode": "Code verwenden",
    "ring.noVisits": "Keine Besuche",
  },
  es: {
    "counters.saveChanges": "Guardar",
    "counters.addCounter": "Añadir",
    "settings.saveSettings": "Guardar",
    "care.freqTwiceDaily": "2x al día",
    "dashboard.dueSoon": "Pronto",
    "join.joinBtn": "Unirme",
  },
  pt: {
    "counters.saveChanges": "Salvar",
    "counters.addCounter": "Adicionar",
    "settings.saveSettings": "Salvar",
    "care.freqTwiceDaily": "2x ao dia",
    "ring.dueSoon": "Em breve",
    "ring.noVisits": "Sem visitas",
  },
  fil: {
    "counters.saveChanges": "I-save",
    "counters.addCounter": "Idagdag",
    "settings.saveSettings": "I-save",
    "care.freqTwiceDaily": "2x kada araw",
    "care.anyTime": "Anumang oras",
    "photo.uploadPhoto": "Mag-upload",
    "elder.bookVisit": "Mag-book",
  },
};
let total = 0;
for (const [lang, changes] of Object.entries(patch)) {
  const file = `${dir}/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [dotted, val] of Object.entries(changes)) {
    const parts = dotted.split(".");
    let obj = data;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    if (!obj || obj[parts.at(-1)] === undefined) { console.log(`MISSING ${lang} ${dotted}`); continue; }
    obj[parts.at(-1)] = val;
    total++;
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}
console.log(`Applied ${total} label shortenings.`);

#!/usr/bin/env python3
"""Add landing.footLearn + get-the-app dialog keys to all 8 locales (2026-08-20)."""
import json, io, os

K = {
  "en": {"footLearn":"All you should know","getAppTitle":"Get the GranWatch app","getAppSub":"The app adds push alerts and the home-screen widget — or just continue in your browser.","storeIos":"Download on the App Store","storeAndroid":"Get it on Google Play","storeWeb":"Continue in browser"},
  "af": {"footLearn":"Alles wat jy moet weet","getAppTitle":"Kry die GranWatch-app","getAppSub":"Die app voeg kennisgewings en die tuisskerm-widget by — of gaan eenvoudig voort in jou blaaier.","storeIos":"Laai af op die App Store","storeAndroid":"Kry dit op Google Play","storeWeb":"Gaan voort in blaaier"},
  "nl": {"footLearn":"Alles wat je moet weten","getAppTitle":"Download de GranWatch-app","getAppSub":"De app voegt meldingen en de widget op je beginscherm toe — of ga gewoon verder in je browser.","storeIos":"Download in de App Store","storeAndroid":"Haal het op Google Play","storeWeb":"Verder in de browser"},
  "fr": {"footLearn":"Tout ce qu'il faut savoir","getAppTitle":"Téléchargez l'app GranWatch","getAppSub":"L'app ajoute les notifications et le widget d'écran d'accueil — ou continuez simplement dans votre navigateur.","storeIos":"Télécharger dans l'App Store","storeAndroid":"Disponible sur Google Play","storeWeb":"Continuer dans le navigateur"},
  "de": {"footLearn":"Alles, was Sie wissen sollten","getAppTitle":"Holen Sie sich die GranWatch-App","getAppSub":"Die App bietet Push-Benachrichtigungen und das Startbildschirm-Widget — oder fahren Sie einfach im Browser fort.","storeIos":"Im App Store laden","storeAndroid":"Bei Google Play holen","storeWeb":"Im Browser fortfahren"},
  "es": {"footLearn":"Todo lo que debes saber","getAppTitle":"Descarga la app de GranWatch","getAppSub":"La app añade notificaciones y el widget de pantalla de inicio — o simplemente continúa en tu navegador.","storeIos":"Descargar en el App Store","storeAndroid":"Consíguela en Google Play","storeWeb":"Continuar en el navegador"},
  "pt": {"footLearn":"Tudo o que você precisa saber","getAppTitle":"Baixe o app GranWatch","getAppSub":"O app adiciona notificações e o widget da tela inicial — ou simplesmente continue no navegador.","storeIos":"Baixar na App Store","storeAndroid":"Disponível no Google Play","storeWeb":"Continuar no navegador"},
  "fil": {"footLearn":"Lahat ng dapat mong malaman","getAppTitle":"Kunin ang GranWatch app","getAppSub":"May push alerts at home-screen widget ang app — o magpatuloy lang sa iyong browser.","storeIos":"I-download sa App Store","storeAndroid":"Kunin sa Google Play","storeWeb":"Magpatuloy sa browser"},
}

base = os.path.join(os.path.dirname(__file__), "..", "client", "src", "locales")
for lang, keys in K.items():
    p = os.path.join(base, f"{lang}.json")
    with io.open(p, encoding="utf-8") as f:
        data = json.load(f)
    assert "landing" in data, f"{lang}: no landing section"
    data["landing"].update(keys)
    with io.open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(lang, "ok", len(data["landing"]))

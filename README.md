# Karteria — strona

Statyczna strona Karterii w stylu filmu z przelotem 3D: ciemna strona aplikacji leży na jasnej podłodze studia,
przy wejściu prostuje się z pochylenia, a sceny przy przewijaniu wjeżdżają pochylone i unoszą swoje warstwy
z miękkimi cieniami. Na końcu karta tytułowa z filmu i sam film.

Docelowy adres: https://wrobhu.github.io/karteria/ — wszystkie ścieżki są względne, więc strona działa z podkatalogu.

## Zawartość

- `index.html` — cała treść (HTML, wbudowane SVG), `style.css`, `main.js` (bez bibliotek)
- `assets/` — film `karteria-flyover-1080.webm` (VP9/Opus) i `karteria-flyover-1080.mp4` (H.264/AAC), plakat `film-poster.webp`,
  `og.png` (1200×630), ikony. Film na stronie to wersja przelotu z uczciwymi przyciskami („Zobacz film”, „Wkrótce na iPhone’a
  i Apple Watch”, bez „Pobierz”) i z cytatem w brzmieniu z `Quotes.swift`.
  Dane w filmie zgadzają się ze stroną (objętość miesięczna, kalendarz 27/12/8, medale 8 z 10, progi z `Game.swift`).
- `fonts/` — Inter, Geist, Instrument Serif jako podzbiory WOFF2 + licencje SIL OFL 1.1
- `.nojekyll` — GitHub Pages podaje pliki bez przetwarzania przez Jekyll

Strona nie wysyła żadnych zapytań do innych serwerów: bez CDN, analityki, ciasteczek i formularzy.

## Podgląd lokalny

Dowolny serwer statyczny z katalogu nadrzędnego, tak żeby strona była pod `/karteria/` jak na Pages:

```sh
cd ..                      # katalog, w którym leży folder site
mkdir -p /tmp/pages && ln -sfn "$PWD/site" /tmp/pages/karteria
python3 -m http.server 8000 --bind 127.0.0.1 --directory /tmp/pages
# otwórz http://127.0.0.1:8000/karteria/
```

Albo prościej, bez podkatalogu: `python3 -m http.server 8000 --bind 127.0.0.1` w tym folderze
i adres http://127.0.0.1:8000/ (ścieżki są względne, więc działa tak samo).

## Ruch i dostępność

- Ruch to tylko `transform` i `opacity`; przewijanie obsługuje jedno pasywne nasłuchiwanie i `requestAnimationFrame`.
- Przy `prefers-reduced-motion: reduce` strona jest płaska, film nie startuje sam.
- Bez JavaScriptu cała treść jest widoczna, film ma zwykłe kontrolki przeglądarki, menu na telefonie działa
  (to `<details>`).
- Film odtwarza się bez dźwięku tylko wtedy, gdy jest w kadrze; przyciski na filmie: pauza, dźwięk, pełny ekran.
  Gdy przeglądarka nie odtworzy żadnego formatu, wracają zwykłe kontrolki i pojawia się link do pobrania MP4.

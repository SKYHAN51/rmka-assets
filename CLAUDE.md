# RMK Autoservice — site (rmka.nl)

Sinematik, scroll'la ilerleyen tek sayfalık site. Film metaforu üzerine kurulu: sahneler (SC 01–08), timecode, klaket, jenerik.

- Kullanıcıyla **Türkçe** konuş. Sitenin metinleri **Felemenkçe** (nl-NL) kalır.
- Yapılacak iş varsa önce `PLAN.md`'yi oku.

## Çalıştırma
Build adımı yok, statik HTML/CSS/JS:
```bash
npx http-server -p 8080 -c-1 .
```

## Yapı
- `index.html`: tüm sahneler. Her sahne `data-scene` ve `data-scene-name` taşır; HUD'daki sahne göstergesi buradan beslenir.
- `assets/css/style.css`: tasarım token'ları `:root` içinde. Hareket gerektiren başlangıç durumları `.is-motion` sınıfı altında; bu sınıfı `<head>`'deki inline script ekler, GSAP yüklenmezse `main.js` kaldırır.
- `assets/js/main.js`: Lenis + GSAP ScrollTrigger/SplitText. Intro, RMK harf maskesi (canvas, `destination-out`), kıvılcımlar, HUD, sahneler.
- `assets/js/cinema-gl.js`: bağımlılıksız WebGL "kamera" (`CinemaGL.create(canvas, {src, state})`). `state` alanları: zoom, blur, aberr, flare, vel, pos, pan, reveal.
- `assets/js/sound.js`: WebAudio sesleri (`RMKSound`). Varsayılan kapalı.
- `assets/vendor/`: GSAP 3.15 ve Lenis 1.3 repoya gömülü; CDN kullanılmıyor.
- `tools/generate_media.py` + `tools/media-prompts.json`: OpenAI ile görsel/video üretimi (`OPENAI_API_KEY` env'den ya da git-ignored `.env`'den okunur).
- SEO/GEO: `<head>`'deki JSON-LD (AutoRepair + WebSite + FAQPage), `robots.txt`, `sitemap.xml`, `llms.txt`. Ayrıntılar ve site dışı yapılacaklar: `SEO.md`.
- Yayın: Vercel (`vercel.json` → `node tools/build.mjs` → `dist/`). Domain ve e-posta Strato'da. **Siteye yeni bir public dosya eklersen** onu `tools/build.mjs`'deki `PUBLIC` listesine de ekle, yoksa yayınlanmaz.
- **SSS cevaplarını değiştirirsen** `<head>`'deki FAQPage metnini de birebir aynı güncelle. İşletme bilgisi (isim, adres, saat) değişirse `index.html`, `llms.txt` ve `SEO.md`'deki NAP birlikte güncellenmeli.

## Dikkat edilecekler (öğrenilmiş dersler)
- **Pin kullanan sahneler** (hero, work, closeup) önce oluşturulur; `trackScenes()` en son çağrılır ki pozisyonlar pin boşluğunu hesaba katsın.
- **IntersectionObserver:** ScrollTrigger refresh sırasında aynı batch'te [false, true] gelebilir. Her zaman **son** entry'yi kullan.
- **SVG `<mask>` ile metin kesme** Chrome'da çalışmadı; bunun yerine canvas `destination-out` kullanılıyor.
- **SplitText ve harf ölçümleri** `document.fonts.ready` sonrası çalışır.
- **Mutlak konumlu dev yazılar** (ör. `.work__ghost`) konumlu ve `overflow: hidden` bir ebeveyn içinde olmalı. Yoksa mobilde layout viewport genişler.
- `prefers-reduced-motion` ve JS kapalıyken sayfa statik ama eksiksiz görünmeli. Her değişiklikten sonra bunu kontrol et.
- GSAP `autoRound`, px değerleri yuvarlar. Küçük aralıklı SVG dash animasyonlarında `pathLength="100"` kullan.

## Test
Playwright ile ekran görüntüsü: masaüstü 1440×900, mobil 390×844. WebGL için headless Chromium'a şu argümanları ver: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Kontrol et:
- Konsol hatası olmamalı.
- `scrollWidth === innerWidth` olmalı (yatay taşma yok).
- Sahne göstergesi doğru çalışmalı.

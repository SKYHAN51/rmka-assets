# RMK Autoservice — sinematik web sitesi

rmka.nl için film temalı, tek sayfalık yeni tasarım. Build adımı yok: statik HTML + CSS + JS.

## Yerelde çalıştırma

```bash
npx http-server -p 8080 .
# veya
python3 -m http.server 8080
```

Ardından http://localhost:8080 adresini açın.

## Yayınlama

Klasörün tamamını herhangi bir statik hosting'e yükleyin (Netlify, Vercel, Cloudflare Pages, GitHub Pages ya da mevcut sunucunun `public_html` klasörü). Tüm fontlar ve kütüphaneler `assets/` içinde; harici CDN veya Google Fonts çağrısı yok, bu da GDPR açısından avantajlı.

## Sahneler

| Sahne | Bölüm | Efekt |
| --- | --- | --- |
| Intro | Film leader 3·2·1 → "RMK Autoservice presenteert" | Perde açılır; oturum başına bir kez oynar, tıklayınca atlanır |
| SC 01 | Hero — "Uw auto speelt de hoofdrol" | Letterbox bantları, focus-pull (blur → net), harf harf başlık |
| — | Marquee | Scroll hızına göre hızlanır |
| SC 02 | Het verhaal | Kelimeler okundukça aydınlanır, logo parallax |
| SC 03 | Het werk — "Vijf takes." | Sabitlenmiş yatay film şeridi (mobilde kaydırmalı) |
| SC 04 | Close-up — "Elk detail telt." | Letterbox çerçeve tam ekrana açılır, kamera ileri gider |
| SC 05 | Werkwijze — "Het draaiboek." | Storyboard panelleri, çizimler kendini çizer |
| SC 06 | Afspraak — "Klaar voor de volgende take?" | Klaket kapanır + flaş |
| Aftiteling | Footer | Jenerik + RMK logosu dolar, "Terugspoelen" başa sarar |

Her ekranda: film greni, vinyet, vizör köşeleri, scroll'a bağlı timecode (`REC 00:01:12:08`), aktif sahne göstergesi ve masaüstünde özel imleç ile manyetik butonlar.

`prefers-reduced-motion` açıksa intro, pin ve smooth scroll devre dışı kalır. JavaScript yüklenmezse sayfa statik ve eksiksiz görünür.

## Yayından önce yapılacaklar

- [ ] **WhatsApp numarası:** `index.html` içindeki tüm `31XXXXXXXXX` yer tutucularını gerçek numarayla değiştirin (ülke kodu 31, baştaki 0 ve + olmadan).
  Logodaki numara (`06115606603`) 11 haneli; Hollanda mobil numaraları 10 hanelidir. Bu yüzden numara sitede kullanılmadı, lütfen doğrulayın.
- [ ] JSON-LD bloğuna `"telephone"` ekleyin.
- [ ] Varsa açılış saatlerini, KvK numarasını ve posta kodunu ekleyin.
- [ ] Metinleri RMK ile birlikte kontrol edin. Mevcut site ve arama sonuçlarındaki bilgilerden taslak olarak yazıldı.

## Dosyalar

```
index.html
assets/css/style.css      tüm stiller (tasarım token'ları :root içinde)
assets/js/main.js         intro, Lenis, ScrollTrigger sahneleri, HUD, imleç
assets/img/               optimize görseller (hero.webp 84 KB, emblem.webp, og-image.jpg, favicons)
assets/fonts/             Anton, Instrument Serif, JetBrains Mono, Inter (OFL)
assets/vendor/            GSAP 3.15 + ScrollTrigger + SplitText, Lenis 1.3
bmw_m3_hero.png           orijinal görseller
elite_logo_remastered_transparent.png
```

`emblem.webp`, orijinal logodan üretildi: alt kısmı karanlığa doğru eriyor, böylece logodaki telefon satırı sitede görünmüyor.

## Lisanslar

- GSAP: GreenSock Standard "no charge" lisansı, ticari kullanım dahil ücretsiz.
- Lenis: MIT.
- Fontlar: SIL Open Font License.

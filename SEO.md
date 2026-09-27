# SEO & GEO — rmka.nl

Hedef: "garage Duiven", "APK Duiven", "autogarage Duiven", "autoservice Duiven" gibi aramalarda Google'da (harita paketi dahil) ve ChatGPT / Perplexity / Google AI Overviews cevaplarında RMK Autoservice'in çıkması.

Yerel bir garaj için sıralamayı en çok belirleyenler: **Google Bedrijfsprofiel (harita), yorumlar, her yerde aynı isim-adres-telefon (NAP)** ve ancak ondan sonra web sitesi. Site tarafı hazır; aşağıdaki site dışı adımlar senin ya da RMK'nın.

## Tek doğru kayıt (her yerde birebir aynı yaz)

```
RMK Autoservice
Segment 24E, 6921 RH Duiven
06 11 56 06 03
https://rmka.nl
Ma–vr 09:00–18:00 · za 09:00–16:00 · zo gesloten
```

"RMK Auto's" adını hiçbir yerde kullanma (eski sitede vardı).

## Sitede yapılanlar (2026-09-27)

- Title / meta description: "Garage Duiven: APK, onderhoud & reparatie | RMK Autoservice"
- H1'de "RMK Autoservice — autogarage in Duiven"; hizmet metinlerinde APK ve diagnose
- Görünür açılış saatleri ve posta kodu (iletişim + jenerik)
- SC 06 "Veelgestelde vragen": 6 soru-cevap (AI aramaları bu blokları doğrudan alıntılar)
- Schema (JSON-LD): AutoRepair (adres, koordinat, saatler, hizmetler) + WebSite + FAQPage
- `robots.txt` (tüm arama ve AI botlarına açık), `sitemap.xml`, `llms.txt`
- `vercel.json`: eski sayfalardan 301 (`/over-ons/`, `/contacteer-ons/`, `/juridische-kennisgeving/`, `/privacybeleid/`, `/wp-sitemap.xml` → ana sayfa / yeni sitemap), cache başlıkları
- `tools/build.mjs`: yalnızca site dosyalarını `dist/`'e kopyalar; `PLAN.md`, `tools/`, `.env` gibi dosyalar asla yayınlanmaz

## Yayına alma: Vercel + Strato domain

Barındırma **Vercel**'de, domain ve e-posta **Strato**'da kalır. STRATO SmartWebsite Plus bir site oluşturucu; kendi dosyalarını yüklemeye izin vermiyor.

1. **Branch'i main'e al:** https://github.com/SKYHAN51/rmka-assets/compare/main...claude/nice-curie-wxn4s1 → pull request → merge.
2. **Vercel projesi:** vercel.com → *Add New → Project* → `SKYHAN51/rmka-assets`'i içe aktar → *Deploy*. Ayarlara dokunma; `vercel.json` build'i ve yönlendirmeleri kendisi ayarlar. Çıkan `….vercel.app` adresini aç ve siteyi kontrol et.
3. **Domaini ekle:** Vercel'de proje → *Settings → Domains* → `rmka.nl` ekle; `www.rmka.nl`'i de ekleyip `rmka.nl`'e yönlendir (Vercel bunu önerir). Vercel sana gereken DNS değerlerini gösterir.
4. **Strato DNS** (Strato → Domains → rmka.nl → DNS):
   - **A kaydı** (rmka.nl): Vercel'in gösterdiği IP (genelde `76.76.21.21`).
   - **AAAA kaydı**: **sil / devre dışı bırak.** Şu an eski siteye (IONOS IPv6) gidiyor; kalırsa IPv6 kullanan ziyaretçiler eski siteyi görür.
   - **www**: CNAME → Vercel'in gösterdiği değer.
   - **MX, SPF/TXT (e-posta) kayıtlarına dokunma.** Mail Strato'da çalışmaya devam eder.
   - Domain SmartWebsite'a bağlıysa Strato A kaydını değiştirmene izin vermeden önce domainin "hedefini" (Ziel / doel) değiştirmeni isteyebilir.
5. Vercel'de domain "Valid Configuration" olunca SSL otomatik gelir (DNS'in yayılması birkaç saat sürebilir).
6. **Kontrol et** (terminal):
   ```bash
   curl -sI https://rmka.nl/over-ons/          # 301 → /
   curl -sI https://www.rmka.nl/               # 30x → https://rmka.nl/
   curl -sI https://rmka.nl/PLAN.md            # 404
   curl -s  https://rmka.nl/robots.txt         # içerik görünmeli
   ```
7. https://search.google.com/test/rich-results ile ana sayfayı test et: "Local business" ve "FAQ" hatasız görünmeli.
8. **SmartWebsite Plus'ı iptal etmeden önce** Strato'ya sor: domain ve e-posta bu pakete dahilse, paketi iptal etmek domaini ve maili de kapatabilir. Önce domaini ayrı bir pakete taşımak gerekebilir.

## Site dışı: yapılacaklar (önem sırasına göre)

- [ ] **Google Bedrijfsprofiel** (business.google.com): profili sahiplen / doğrula. Ana kategori: *Autogarage* (ya da listedeki en yakın karşılığı); ek kategoriler için Google'ın listesinden APK/keuring, banden ve remmen ile ilgili olanları seç. Saatleri, telefonu, website'i (https://rmka.nl), WhatsApp'ı ve hizmetleri (APK, onderhoud, diagnose, reparatie, banden, remmen, onderstel) ekle. Atölyeden **gerçek fotoğraflar** yükle (dış cephe, tabela, içerisi, ekip) — AI görseller değil.
- [ ] **Yorum toplama:** her işten sonra müşteriye WhatsApp'tan Google yorum linki gönder (Bedrijfsprofiel → "Vraag om reviews"). Yorumlara kısa ve kişisel cevap ver. Düzenli yeni yorumlar harita sıralamasının en güçlü sinyali.
- [ ] **Google Search Console:** rmka.nl'i DNS ile doğrula (Strato DNS'e TXT kaydı), `https://rmka.nl/sitemap.xml`'i gönder, ana sayfa için "Indexering aanvragen".
- [ ] **Bing Webmaster Tools:** Search Console'dan içe aktar (ChatGPT ve Copilot aramaları Bing indeksini kullanır).
- [ ] **Apple Business Connect:** Apple Haritalar kaydı (iPhone kullanıcıları).
- [ ] **Rehber kayıtları, aynı NAP ile:** 123Auto (kaydı sahiplen; website ve telefon eksik), Goudengids / Telefoonboek, Openingstijden.com, Facebook ve Instagram biyografisi (site linki + adres).
- [ ] **Sosyal hesaplar:** @rmkautoservice (Instagram/Facebook) RMK'nın olduğu doğrulanmadı; bu yüzden schema'da yok. RMK'nın resmi hesapları açılınca/doğrulanınca `sameAs` olarak eklenmeli (varlık tanınırlığı ve AI için faydalı).

## Sitede hâlâ eksik olanlar

- [ ] KvK numarası ve BTW numarası (footer'da güven sinyali; eski sitedeki "Juridische kennisgeving" sayfası boş şablondu)
- [ ] Privacyverklaring (eski sitede vardı; yeni sitede form/çerez yok, ama kısa bir sayfa güveni artırır)
- [ ] Gerçek atölye fotoğrafları (AI görsellerin yanında ya da yerine)
- [ ] Hangi marka ve modellerle çalışıldığı, varsa garanti/koşullar, fiyat örnekleri (örn. "APK vanaf € ..") — AI cevapları fiyat ve somut rakam içeren kaynakları daha çok alıntılar

## Takip (ayda bir)

Şu aramaları Google, ChatGPT ve Perplexity'de dene; RMK çıkıyor mu, kimler çıkıyor not et:
"garage Duiven", "APK Duiven", "autogarage Duiven", "remmen vervangen Duiven", "banden wisselen Duiven", "storing uitlezen Duiven".

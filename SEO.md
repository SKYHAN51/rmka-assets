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
- `.htaccess`: eski sayfalardan 301 (`/over-ons/`, `/contacteer-ons/`, `/juridische-kennisgeving/`, `/privacybeleid/`, `/wp-sitemap.xml`), www → rmka.nl, http → https, `.env` / `.md` / `tools/` erişimine kapalı, sıkıştırma ve cache

## Yayına alırken (Strato)

1. Klasörü yüklemeden önce `.env` dosyasını sil (`.htaccess` erişimi engelliyor ama dosya sunucuda hiç olmamalı).
2. Yükledikten sonra kontrol et (terminal):
   ```bash
   curl -sI https://rmka.nl/over-ons/          # 301, Location: /#verhaal
   curl -sI http://www.rmka.nl/                # 301 → https://rmka.nl/
   curl -sI https://rmka.nl/.env               # 403 (ya da 404)
   curl -sI https://rmka.nl/PLAN.md            # 403
   curl -s  https://rmka.nl/robots.txt         # içerik görünmeli
   ```
   Site 500 hatası verirse: `.htaccess`'teki `Options -Indexes` satırını sil ve tekrar dene.
3. https://search.google.com/test/rich-results ile ana sayfayı test et: "Local business" ve "FAQ" hatasız görünmeli.

## Site dışı: yapılacaklar (önem sırasına göre)

- [ ] **Google Bedrijfsprofiel** (business.google.com): profili sahiplen / doğrula. Ana kategori: *Autogarage* (ya da listedeki en yakın karşılığı); ek kategoriler için Google'ın listesinden APK/keuring, banden ve remmen ile ilgili olanları seç. Saatleri, telefonu, website'i (https://rmka.nl), WhatsApp'ı ve hizmetleri (APK, onderhoud, diagnose, reparatie, banden, remmen, onderstel) ekle. Atölyeden **gerçek fotoğraflar** yükle (dış cephe, tabela, içerisi, ekip) — AI görseller değil.
- [ ] **Yorum toplama:** her işten sonra müşteriye WhatsApp'tan Google yorum linki gönder (Bedrijfsprofiel → "Vraag om reviews"). Yorumlara kısa ve kişisel cevap ver. Düzenli yeni yorumlar harita sıralamasının en güçlü sinyali.
- [ ] **Google Search Console:** rmka.nl'i DNS ile doğrula (Strato DNS'e TXT kaydı), `https://rmka.nl/sitemap.xml`'i gönder, ana sayfa için "Indexering aanvragen".
- [ ] **Bing Webmaster Tools:** Search Console'dan içe aktar (ChatGPT ve Copilot aramaları Bing indeksini kullanır).
- [ ] **Apple Business Connect:** Apple Haritalar kaydı (iPhone kullanıcıları).
- [ ] **Rehber kayıtları, aynı NAP ile:** 123Auto (kaydı sahiplen; website ve telefon eksik), Goudengids / Telefoonboek, Openingstijden.com, Facebook ve Instagram biyografisi (site linki + adres).
- [ ] **Sosyal hesaplar:** @rmkautoservice gerçekten RMK'nın ise bana söyle; schema'ya `sameAs` olarak ekleyeyim (varlık tanınırlığı ve AI için faydalı).

## Sitede hâlâ eksik olanlar

- [ ] KvK numarası ve BTW numarası (footer'da güven sinyali; eski sitedeki "Juridische kennisgeving" sayfası boş şablondu)
- [ ] Privacyverklaring (eski sitede vardı; yeni sitede form/çerez yok, ama kısa bir sayfa güveni artırır)
- [ ] Gerçek atölye fotoğrafları (AI görsellerin yanında ya da yerine)
- [ ] Hangi marka ve modellerle çalışıldığı, varsa garanti/koşullar, fiyat örnekleri (örn. "APK vanaf € ..") — AI cevapları fiyat ve somut rakam içeren kaynakları daha çok alıntılar

## Takip (ayda bir)

Şu aramaları Google, ChatGPT ve Perplexity'de dene; RMK çıkıyor mu, kimler çıkıyor not et:
"garage Duiven", "APK Duiven", "autogarage Duiven", "remmen vervangen Duiven", "banden wisselen Duiven", "storing uitlezen Duiven".

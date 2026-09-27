# Plan: AI medya üretimi ve siteye entegrasyon

Bu plan VS Code içindeki Claude Code ile yerelde uygulanmak üzere yazıldı. Claude Code'a şunu yazman yeterli:

> **PLAN.md'yi adım adım uygula. Her adımdan sonra bana kısaca Türkçe bilgi ver.**

Branch: `claude/nice-curie-wxn4s1`. Bu branch main'e merge edildiyse main'den devam et.

---

## 0. Hazırlık

```bash
git clone https://github.com/SKYHAN51/rmka-assets
cd rmka-assets
git checkout claude/nice-curie-wxn4s1
npx http-server -p 8080 -c-1 .      # site: http://localhost:8080
```

Gerekenler: Python 3, curl, Node 18+. Video karelerini çıkarmak için ffmpeg gerekir (`brew install ffmpeg` / `winget install ffmpeg`).

## 1. OpenAI anahtarı (repoya asla yazılmaz)

Anahtarı yalnızca terminal oturumuna ver. Dosyaya, commit'e ya da sohbete yazma.

```bash
# macOS / Linux
export OPENAI_API_KEY="sk-..."
# Windows PowerShell
$env:OPENAI_API_KEY="sk-..."
```

Alternatif: repo kökündeki `.env` dosyasına `OPENAI_API_KEY=sk-...` satırını yaz. Dosya `.gitignore`'da, commit'e girmez; script env'de anahtar yoksa buradan okur. **Siteyi klasör olarak yüklemeden (FTP, `public_html`) önce `.env`'i sil**, yoksa herkese açık olur.

İş bitince anahtarı OpenAI panelinden sil (revoke).

## 2. Görselleri ve videoyu üret

```bash
python3 tools/generate_media.py --dry-run   # ne üretileceğini gösterir
python3 tools/generate_media.py             # hepsini üretir (var olanları atlar)
python3 tools/generate_media.py take-remmen --force   # tek birini yeniden üret
```

- Promptlar ve çıktı yolları `tools/media-prompts.json` dosyasında. Ortak stil: gece, koyu atölye, mavi LED, turuncu kıvılcım bokeh'i; yazı, logo ve yüz yok.
- Çıktılar: `assets/img/gen/take-*.webp` (5 hizmet), `assets/img/gen/werkplaats-wide.webp`, `assets/video/dolly-headlight.mp4`.
- Model adları env ile değiştirilebilir: `OPENAI_IMAGE_MODEL` (varsayılan `gpt-image-1`), `OPENAI_VIDEO_MODEL` (varsayılan `sora-2`).
- **Dikkat:** Video (Sora) API çağrısı henüz gerçek API'ye karşı test edilmedi. Hata verirse OpenAI'nin güncel `/v1/videos` dokümanına bakıp `gen_video()` fonksiyonunu düzelt.
- **Durum (2026-09-27):** 6 görsel üretildi ve siteye yerleştirildi (4a, 4b). Video üretilemedi: `sora-2` / `sora-2-pro` modelleri **2026-09-24'te kapatıldı**, `/v1/videos` artık 404 dönüyor ve hesapta başka video modeli yok. **4c bu turda atlandı** (kullanıcı kararı); ileride bir video kaynağı bulunursa `assets/video/dolly-headlight.mp4` olarak eklenip 4c uygulanabilir.
- `gpt-image-1` modeli 2026-10-23'te kapanacak; sonraki üretimlerde `OPENAI_IMAGE_MODEL=gpt-image-2` kullan.
- Sonucu gözle kontrol et: markalı logo, yazı, bozuk el/parça varsa o işi `--force` ile yeniden üret.
- Üretim OpenAI hesabından kredi harcar: 6 görsel ve 1 kısa video.

**Alternatif (kodsuz):** Aynı promptlarla ChatGPT'de görselleri, Sora'da videoyu üret. Dosyaları yukarıdaki adlarla `assets/img/gen/` ve `assets/video/` klasörlerine koy.

## 3. Optimize et

- Görseller: en fazla 1600 px genişlik, WebP kalite ~80, her biri **250 KB altında** olmalı. Pillow ile yapılabilir: `pip install pillow`.
- Orijinal büyük dosyaları repoda tutma; yalnızca optimize edilmiş hallerini commit et.

## 4. Siteye yerleştir

### 4a. Film şeridi (SC 03, `index.html` → `.strip__track`)
- Her `.frame` şu anda `assets/img/hero.webp` dosyasının kırpılmış bir halini gösteriyor (`style="--x; --y; --s"`). Her kareyi kendi görseliyle değiştir:
  Onderhoud → `take-onderhoud`, Reparatie → `take-reparatie`, Banden → `take-banden`, Remmen → `take-remmen`, Onderstel → `take-onderstel`.
- Kırpma değişkenlerini kaldır ya da `--x:50%; --y:50%; --s:1` yap.
- `main.js` negatif efekti için img'yi otomatik klonluyor; ek iş gerekmiyor.

### 4b. Atölye geniş planı (`werkplaats-wide`)
- SC 02 (Het verhaal) ile marquee arasına tam genişlikte, sinematik bir görsel bandı ekle.
- Scroll'la `clip-path` ile letterbox'tan tam kareye açılsın, içte hafif paralaks olsun.
- Mevcut `.closeup` sahnesinin yapısını örnek al; ama pin kullanma, kısa bir scrub yeterli.

### 4c. Scroll'la oynayan video sekansı (`dolly-headlight.mp4`)
- Kareleri çıkar:
  ```bash
  mkdir -p assets/seq
  ffmpeg -i assets/video/dolly-headlight.mp4 -vf "fps=15,scale=1280:-2" -q:v 4 assets/seq/f_%03d.jpg
  ```
  Yaklaşık 120 kare, her biri ~60–90 KB. Mobil için ayrıca 720 px'lik set çıkarılabilir.
- Yeni sahne: SC 04 Close-up'tan **önce**, `<section class="dolly" data-scene="04" data-scene-name="Dolly">`. Sonraki sahne numaralarını (`data-scene` ve slug'lardaki "SC 0x") birer kaydır.
- JS:
  - Section'ı pinle (`end: '+=250%'`, `scrub: 0.5`).
  - `frame = Math.round(progress * (n - 1))`, kareyi bir `<canvas>`'a *cover* mantığıyla `drawImage` ile çiz.
  - İlk kareyi hemen, diğerlerini section 2 ekran yaklaşınca yükle.
  - Scroll hızı yüksekse kare atlamasın; son yüklenen en yakın kareyi göster.
- Üstüne sade tipografi koy (ör. "Van inspectie tot aflevering."). Sahnede mevcut HUD/timecode dili kullanılsın.
- `prefers-reduced-motion` açıksa: pin yok, yalnızca poster olarak tek bir kare göster.
- Video dosyasının kendisini (`mp4`) sitede kullanmıyorsan repodan çıkar.

### 4d. Kontrol listesi
- [ ] Toplam yeni medya **6 MB altında**; resimler `loading="lazy"` ve `decoding="async"`.
- [ ] Masaüstü (1440), mobil (390) ve tablette yatay taşma yok (`document.documentElement.scrollWidth === innerWidth`).
- [ ] Konsol hatası yok.
- [ ] Sahne göstergesi (sağ alt "SC 0x") doğru sırada.
- [ ] `prefers-reduced-motion` ve JavaScript kapalıyken sayfa eksiksiz görünüyor.
- [ ] README'deki sahne tablosu güncellendi.

## 5. Commit ve yayın

```bash
git add assets index.html README.md
git commit -m "Add generated media: per-take stills, workshop band, scroll-scrubbed dolly"
git push
```

Ardından main'e pull request aç ve statik hosting'e yayınla (Netlify, Vercel, Cloudflare Pages ya da mevcut sunucu).

## Hâlâ açık olanlar (medyadan bağımsız)
- [ ] Açılış saatleri, KvK numarası, posta kodu.
- [ ] Metinlerin RMK ile kontrolü.
- [ ] Logo görselindeki telefon numarası hatalı (`06115606603`, fazladan bir 6 var). Sitede gizli, ama logo başka yerde kullanılıyorsa düzeltilmeli.
- [ ] İleride: AI görseller yerine ya da yanına RMK'nın gerçek atölye fotoğrafları (güven için).

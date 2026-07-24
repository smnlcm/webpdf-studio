namespace HtmlToPdfGuiV2;

public static class SampleHtml
{
    public const string Content =
        """
        <!doctype html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>HTML to PDF V2</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #172033;
              font-family: "Segoe UI", Arial, sans-serif;
              background: #f3f6fb;
            }
            main {
              max-width: 900px;
              margin: 0 auto;
              padding: 36px;
            }
            .hero {
              padding: 34px;
              color: white;
              border-radius: 22px;
              background: linear-gradient(135deg, #2563eb, #7c3aed);
              box-shadow: 0 18px 45px rgba(37, 99, 235, .22);
            }
            .hero h1 { margin: 0 0 8px; font-size: 34px; }
            .hero p { margin: 0; opacity: .9; }
            .cards {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-top: 24px;
            }
            .card {
              padding: 20px;
              border: 1px solid #dbe3f0;
              border-radius: 16px;
              background: white;
            }
            .card strong { display: block; margin-bottom: 8px; color: #2563eb; }
            .note {
              margin-top: 24px;
              padding: 16px;
              border-left: 5px solid #f59e0b;
              background: #fffbeb;
            }
            @media print {
              body { background: white; }
              main { padding: 0; }
              .hero { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <main>
            <section class="hero">
              <h1>HTML to PDF V2</h1>
              <p>Modern Chromium motoru ile temiz ve güvenilir PDF çıktısı.</p>
            </section>
            <section class="cards">
              <article class="card">
                <strong>Modern CSS</strong>
                Grid, Flexbox, SVG ve web fontları desteklenir.
              </article>
              <article class="card">
                <strong>Türkçe</strong>
                ğüşiöç İĞÜŞÖÇ ve ₺ karakterleri doğru görünür.
              </article>
              <article class="card">
                <strong>Kontrollü çıktı</strong>
                A4, yön, kenar boşluğu ve arka plan seçenekleri.
              </article>
            </section>
            <aside class="note">
              Kendi HTML kodunu buraya yapıştırabilir veya dosya sekmesinden
              bir HTML belgesi seçebilirsin.
            </aside>
          </main>
        </body>
        </html>
        """;

    public const string Welcome =
        """
        <!doctype html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <style>
            html, body { height: 100%; }
            body {
              display: grid;
              place-items: center;
              margin: 0;
              color: #334155;
              font-family: "Segoe UI", Arial, sans-serif;
              background:
                radial-gradient(circle at top left, #dbeafe, transparent 38%),
                #f8fafc;
            }
            .welcome {
              width: min(620px, 80vw);
              padding: 42px;
              text-align: center;
              border: 1px solid #dbe3f0;
              border-radius: 24px;
              background: rgba(255,255,255,.88);
              box-shadow: 0 24px 70px rgba(15,23,42,.10);
            }
            .mark {
              display: inline-grid;
              place-items: center;
              width: 64px;
              height: 64px;
              margin-bottom: 18px;
              color: white;
              font-size: 24px;
              font-weight: 800;
              border-radius: 18px;
              background: linear-gradient(135deg, #2563eb, #7c3aed);
            }
            h1 { margin: 0 0 10px; color: #0f172a; }
            p { margin: 0; line-height: 1.6; }
          </style>
        </head>
        <body>
          <section class="welcome">
            <div class="mark">V2</div>
            <h1>HTML to PDF</h1>
            <p>Soldan bir HTML dosyası seç veya kodunu yapıştır.<br>
               Önizleme hazır olduğunda PDF oluşturabilirsin.</p>
          </section>
        </body>
        </html>
        """;
}

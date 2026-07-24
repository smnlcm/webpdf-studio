# WebPDF Studio

Modern HTML ve CSS belgelerini gerçek PDF önizlemesiyle dönüştüren masaüstü
uygulaması. **WebPDF Studio V3**, tek kod tabanıyla Windows, macOS ve Linux'u
destekler.

Desktop application that converts modern HTML and CSS documents with an exact
PDF preview. **WebPDF Studio V3** supports Windows, macOS and Linux from one
codebase.

## V3 platform desteği / V3 platform support

- Windows x64 — `WebPDF.exe`, Squirrel kurulum paketi ve ZIP
- macOS Intel — DMG ve ZIP
- macOS Apple Silicon — DMG ve ZIP
- Linux x64 — DEB ve ZIP

V3 uygulaması `cross-platform` klasöründedir. Platform paketleri GitHub Actions
üzerinde her işletim sisteminde ayrı ayrı oluşturulur.

The V3 application is located in `cross-platform`. Platform packages are built
separately for each operating system by GitHub Actions.

## İndir / Download

En güncel paketleri GitHub Releases sayfasından indirebilirsin:

Download the latest packages from GitHub Releases:

[WebPDF Studio - Latest Release](https://github.com/smnlcm/webpdf-studio/releases/latest)

Windows ZIP paketinde çalıştırılabilir dosyanın adı `WebPDF.exe` şeklindedir.

## Özellikler / Features

- Windows, macOS ve Linux için tek Chromium PDF motoru
- One Chromium PDF engine for Windows, macOS and Linux
- HTML dosyasından veya yapıştırılan HTML kodundan PDF üretme
- Generate PDFs from an HTML file or pasted HTML source
- Kaydedilecek PDF ile birebir, sayfa genişliğinde önizleme
- Exact, page-width preview of the PDF that will be saved
- Modern Light (A) ve Dark Premium (C) arayüz temaları
- Modern Light (A) and Dark Premium (C) interface themes
- Serbestçe değiştirilebilen vurgu rengi
- User-selectable accent color
- Türkçe ve English arayüz
- Turkish and English interface
- Tema, renk ve dil tercihlerinin otomatik kaydı
- Persistent theme, color and language preferences
- Göreli CSS, görsel, SVG ve font yollarını destekleyen dosya modu
- File mode with relative CSS, image, SVG and font support
- A4 ve Letter; dikey ve yatay yön; ayrı kenar boşlukları ve ölçek
- A4 and Letter; portrait and landscape; individual margins and scale
- Arka plan ile tarayıcı üst/alt bilgi seçenekleri
- Background and browser header/footer options
- PDF başlığı, boyutu ve dosya imzası doğrulaması
- PDF header, size and file-signature validation

Eski DinkToPdf ve wkhtmltopdf DLL'leri kullanılmaz. V3, PDF üretimi için
Electron Chromium'u; gerçek PDF sayfalarını göstermek için PDF.js'i kullanır.

The legacy DinkToPdf and wkhtmltopdf DLLs are not used. V3 uses Electron
Chromium to create PDFs and PDF.js to display the actual PDF pages.

## V3 geliştirme / V3 development

Gereksinimler: Node.js 22 ve npm.

Requirements: Node.js 22 and npm.

```powershell
cd .\cross-platform
npm install
npm start
```

Kontrol, test ve yerel platform paketi:

Validation, smoke test and local-platform package:

```powershell
npm run check
npm run smoke
npm run make
```

## Windows V2 (legacy)

Mevcut .NET/WinForms tabanlı Windows V2 kaynakları `src/HtmlToPdfGuiV2`
klasöründe korunmaktadır. V2 yalnızca Windows 10/11'i destekler ve Microsoft
Edge WebView2 Runtime gerektirir.

The existing .NET/WinForms Windows V2 source is preserved under
`src/HtmlToPdfGuiV2`. V2 supports Windows 10/11 only and requires Microsoft
Edge WebView2 Runtime.

## V2 gereksinimleri / V2 requirements

- Windows 10 veya Windows 11 / Windows 10 or Windows 11
- Microsoft Edge WebView2 Runtime
- Geliştirme için .NET 10 SDK / .NET 10 SDK for development

Yayın paketi self-contained olarak hazırlanır; hedef bilgisayarda ayrıca .NET
Runtime kurulması gerekmez.

The published package is self-contained, so the target computer does not need a
separate .NET Runtime installation.

## Geliştirme / Development

```powershell
dotnet restore .\HtmlToPdfGuiV2.slnx
dotnet build .\HtmlToPdfGuiV2.slnx --configuration Debug
dotnet run --project .\src\HtmlToPdfGuiV2\HtmlToPdfGuiV2.csproj
```

## Kalite testleri / Quality tests

PDF oluşturma ve önizleme:

PDF creation and preview:

```powershell
dotnet run --project .\tools\SmokeTest\HtmlToPdfGuiV2.SmokeTest.csproj -- `
  .\samples\quality-test\quality-test.html `
  .\tmp\pdfs\v2-quality-test.pdf
```

Tema ve dil geçişleri:

Theme and language switching:

```powershell
dotnet run --project .\tools\SmokeTest\HtmlToPdfGuiV2.SmokeTest.csproj -- `
  --ui-theme
```

## Yayın / Publish

```powershell
.\publish.ps1
```

Windows x64 çıktısı `artifacts\publish\win-x64` klasörüne yazılır.

The Windows x64 output is written to `artifacts\publish\win-x64`.

## Lisans / License

Bu proje [MIT Lisansı](LICENSE) ile yayımlanır. Üçüncü taraf bağımlılıklar kendi
lisans koşullarına tabidir.

This project is released under the [MIT License](LICENSE). Third-party
dependencies remain subject to their own license terms.

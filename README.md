# HTML to PDF V2

Modern HTML ve CSS belgelerini Microsoft Edge WebView2 ile PDF'e dönüştüren
Windows masaüstü uygulaması.

Windows desktop application that converts modern HTML and CSS documents to PDF
with Microsoft Edge WebView2.

## Özellikler / Features

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

Eski DinkToPdf ve wkhtmltopdf DLL'leri kullanılmaz.

The legacy DinkToPdf and wkhtmltopdf DLLs are not used.

## Gereksinimler / Requirements

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

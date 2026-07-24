using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace HtmlToPdfGuiV2.Pdf;

public sealed class WebViewPdfRenderer : IDisposable
{
    private static readonly TimeSpan NavigationTimeout = TimeSpan.FromSeconds(45);
    private static readonly TimeSpan ResourceTimeout = TimeSpan.FromSeconds(20);

    private readonly WebView2 _webView;
    private readonly SemaphoreSlim _printLock = new(1, 1);
    private CoreWebView2Environment? _environment;
    private bool _initialized;
    private bool _disposed;

    public WebViewPdfRenderer(WebView2 webView)
    {
        _webView = webView ?? throw new ArgumentNullException(nameof(webView));
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        if (_initialized)
        {
            return;
        }

        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "HtmlToPdfGuiV2",
            "WebView2");

        Directory.CreateDirectory(userDataFolder);

        _environment = await CoreWebView2Environment.CreateAsync(
            browserExecutableFolder: null,
            userDataFolder: userDataFolder);

        cancellationToken.ThrowIfCancellationRequested();
        await _webView.EnsureCoreWebView2Async(_environment);

        var core = _webView.CoreWebView2;
        core.Profile.PreferredColorScheme =
            CoreWebView2PreferredColorScheme.Light;
        core.Settings.AreDefaultScriptDialogsEnabled = false;
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreHostObjectsAllowed = false;
        core.Settings.IsStatusBarEnabled = false;

        core.NewWindowRequested += (_, args) => args.Handled = true;
        core.PermissionRequested += (_, args) => args.State = CoreWebView2PermissionState.Deny;
        core.DownloadStarting += (_, args) => args.Cancel = true;

        _initialized = true;
    }

    public async Task LoadFileAsync(string htmlPath, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(htmlPath);
        await InitializeAsync(cancellationToken);

        var fullPath = Path.GetFullPath(htmlPath);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException("HTML dosyası bulunamadı.", fullPath);
        }

        await NavigateAsync(
            () => _webView.Source = new Uri(fullPath),
            cancellationToken);

        await WaitForDocumentResourcesAsync(cancellationToken);
    }

    public async Task LoadHtmlAsync(string html, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(html);
        await InitializeAsync(cancellationToken);

        await NavigateAsync(
            () => _webView.NavigateToString(html),
            cancellationToken);

        await WaitForDocumentResourcesAsync(cancellationToken);
    }

    public async Task LoadWelcomeAsync(string html, CancellationToken cancellationToken = default)
    {
        await LoadHtmlAsync(html, cancellationToken);
    }

    public async Task LoadPdfPreviewAsync(
        string pdfPath,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(pdfPath);
        await InitializeAsync(cancellationToken);

        var fullPath = Path.GetFullPath(pdfPath);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException(
                "PDF önizleme dosyası bulunamadı.",
                fullPath);
        }

        var previewUri =
            new Uri(fullPath).AbsoluteUri +
            "#zoom=page-width&toolbar=0&navpanes=0";

        await NavigateAsync(
            () => _webView.Source = new Uri(previewUri),
            cancellationToken);
    }

    public async Task ExportPdfAsync(
        string outputPath,
        PdfExportOptions options,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(outputPath);
        ArgumentNullException.ThrowIfNull(options);
        await InitializeAsync(cancellationToken);

        var absoluteOutputPath = Path.GetFullPath(outputPath);
        Directory.CreateDirectory(Path.GetDirectoryName(absoluteOutputPath)!);

        await _printLock.WaitAsync(cancellationToken);
        try
        {
            var settings = _environment!.CreatePrintSettings();
            ApplyPrintSettings(settings, options);

            var succeeded = await _webView.CoreWebView2.PrintToPdfAsync(
                absoluteOutputPath,
                settings);

            if (!succeeded)
            {
                throw new InvalidOperationException("WebView2 PDF üretimini tamamlayamadı.");
            }
        }
        finally
        {
            _printLock.Release();
        }
    }

    private async Task NavigateAsync(Action beginNavigation, CancellationToken cancellationToken)
    {
        var completion = new TaskCompletionSource(
            TaskCreationOptions.RunContinuationsAsynchronously);

        void NavigationCompleted(
            object? sender,
            CoreWebView2NavigationCompletedEventArgs args)
        {
            _webView.NavigationCompleted -= NavigationCompleted;

            if (args.IsSuccess)
            {
                completion.TrySetResult();
            }
            else
            {
                completion.TrySetException(
                    new InvalidOperationException(
                        $"HTML yüklenemedi: {args.WebErrorStatus}"));
            }
        }

        _webView.NavigationCompleted += NavigationCompleted;

        try
        {
            beginNavigation();
            await completion.Task.WaitAsync(NavigationTimeout, cancellationToken);
        }
        catch
        {
            _webView.NavigationCompleted -= NavigationCompleted;
            throw;
        }
    }

    private async Task WaitForDocumentResourcesAsync(CancellationToken cancellationToken)
    {
        var deadline = DateTimeOffset.UtcNow + ResourceTimeout;

        while (DateTimeOffset.UtcNow < deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var state = await _webView.ExecuteScriptAsync(
                """
                (() => JSON.stringify({
                  ready: document.readyState === "complete",
                  fonts: !document.fonts || document.fonts.status === "loaded",
                  images: Array.from(document.images).every(image => image.complete)
                }))()
                """);

            if (state.Contains("\\\"ready\\\":true", StringComparison.Ordinal) &&
                state.Contains("\\\"fonts\\\":true", StringComparison.Ordinal) &&
                state.Contains("\\\"images\\\":true", StringComparison.Ordinal))
            {
                await Task.Delay(250, cancellationToken);
                return;
            }

            await Task.Delay(100, cancellationToken);
        }

        throw new TimeoutException(
            "HTML içindeki yazı tipleri veya görseller zamanında yüklenemedi.");
    }

    private static void ApplyPrintSettings(
        CoreWebView2PrintSettings settings,
        PdfExportOptions options)
    {
        const double millimetersPerInch = 25.4;

        (settings.PageWidth, settings.PageHeight) = options.PaperSize switch
        {
            PdfPaperSize.Letter => (8.5, 11.0),
            _ => (210.0 / millimetersPerInch, 297.0 / millimetersPerInch)
        };

        settings.Orientation = options.Landscape
            ? CoreWebView2PrintOrientation.Landscape
            : CoreWebView2PrintOrientation.Portrait;

        settings.MarginTop = options.MarginTopMm / millimetersPerInch;
        settings.MarginRight = options.MarginRightMm / millimetersPerInch;
        settings.MarginBottom = options.MarginBottomMm / millimetersPerInch;
        settings.MarginLeft = options.MarginLeftMm / millimetersPerInch;
        settings.ShouldPrintBackgrounds = options.PrintBackgrounds;
        settings.ShouldPrintHeaderAndFooter = options.PrintHeaderAndFooter;
        settings.ScaleFactor = Math.Clamp(options.ScaleFactor, 0.1, 2.0);
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _printLock.Dispose();
        _disposed = true;
    }
}

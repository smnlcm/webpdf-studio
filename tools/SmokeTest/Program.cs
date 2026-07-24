using HtmlToPdfGuiV2.Pdf;
using Microsoft.Web.WebView2.WinForms;

namespace HtmlToPdfGuiV2.SmokeTest;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length == 1 &&
            string.Equals(
                args[0],
                "--ui-theme",
                StringComparison.OrdinalIgnoreCase))
        {
            return RunUiThemeTest();
        }

        if (args.Length != 2)
        {
            Console.Error.WriteLine(
                "Usage: HtmlToPdfGuiV2.SmokeTest <input-html> <output-pdf> " +
                "| --ui-theme");
            return 2;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new SmokeHostForm(args[0], args[1]));
        return Environment.ExitCode;
    }

    private static int RunUiThemeTest()
    {
        ApplicationConfiguration.Initialize();
        using var form = new MainForm();

        var themeCombo = ReadField<ComboBox>(form, "_themeComboBox");
        var languageCombo = ReadField<ComboBox>(form, "_languageComboBox");
        var header = ReadField<Panel>(form, "_headerPanel");
        var sourceTabs = ReadField<TabControl>(form, "_sourceTabs");
        var originalTheme = themeCombo.SelectedIndex;
        var originalLanguage = languageCombo.SelectedIndex;

        try
        {
            themeCombo.SelectedIndex = 1;
            if (header.BackColor.GetBrightness() > 0.2f)
            {
                throw new InvalidOperationException(
                    "Dark theme did not apply to the header.");
            }

            themeCombo.SelectedIndex = 0;
            if (header.BackColor.GetBrightness() < 0.8f)
            {
                throw new InvalidOperationException(
                    "Light theme did not apply to the header.");
            }

            languageCombo.SelectedIndex = 1;
            if (sourceTabs.TabPages[0].Text != "HTML file")
            {
                throw new InvalidOperationException(
                    "English localization did not apply.");
            }

            Console.WriteLine(
                "PASS UI themes: Modern Light, Dark Premium, English");
            return 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(exception);
            return 1;
        }
        finally
        {
            themeCombo.SelectedIndex = originalTheme;
            languageCombo.SelectedIndex = originalLanguage;
        }
    }

    private static T ReadField<T>(object instance, string fieldName)
        where T : class
    {
        var field = instance.GetType().GetField(
            fieldName,
            System.Reflection.BindingFlags.Instance |
            System.Reflection.BindingFlags.NonPublic);
        return field?.GetValue(instance) as T ??
               throw new InvalidOperationException(
                   $"Field not found: {fieldName}");
    }
}

internal sealed class SmokeHostForm : Form
{
    private readonly string _inputHtml;
    private readonly string _outputPdf;
    private readonly WebView2 _webView = new();
    private readonly WebViewPdfRenderer _renderer;

    public SmokeHostForm(string inputHtml, string outputPdf)
    {
        _inputHtml = Path.GetFullPath(inputHtml);
        _outputPdf = Path.GetFullPath(outputPdf);
        _renderer = new WebViewPdfRenderer(_webView);

        Text = "HtmlToPdfGuiV2 Smoke Test";
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        Location = new Point(-32000, -32000);
        Size = new Size(1200, 900);

        _webView.Dock = DockStyle.Fill;
        Controls.Add(_webView);

        Shown += RunSmokeTestAsync;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _renderer.Dispose();
            _webView.Dispose();
        }

        base.Dispose(disposing);
    }

    private async void RunSmokeTestAsync(object? sender, EventArgs e)
    {
        try
        {
            await _renderer.LoadFileAsync(_inputHtml);
            await _renderer.ExportPdfAsync(
                _outputPdf,
                new PdfExportOptions
                {
                    PaperSize = PdfPaperSize.A4,
                    MarginTopMm = 12,
                    MarginRightMm = 12,
                    MarginBottomMm = 12,
                    MarginLeftMm = 12,
                    PrintBackgrounds = true
                });

            PdfFileValidator.EnsureValid(_outputPdf);
            Console.WriteLine(
                $"PASS file mode: {_outputPdf} " +
                $"({new FileInfo(_outputPdf).Length} bytes)");

            await _renderer.LoadPdfPreviewAsync(_outputPdf);
            Console.WriteLine("PASS PDF preview mode");

            var codeModeOutput = Path.Combine(
                Path.GetDirectoryName(_outputPdf)!,
                Path.GetFileNameWithoutExtension(_outputPdf) + "-code-mode.pdf");

            await _renderer.LoadHtmlAsync(SampleHtml.Content);
            await _renderer.ExportPdfAsync(
                codeModeOutput,
                new PdfExportOptions
                {
                    PaperSize = PdfPaperSize.A4,
                    MarginTopMm = 12,
                    MarginRightMm = 12,
                    MarginBottomMm = 12,
                    MarginLeftMm = 12,
                    PrintBackgrounds = true
                });

            PdfFileValidator.EnsureValid(codeModeOutput);
            Console.WriteLine(
                $"PASS code mode: {codeModeOutput} " +
                $"({new FileInfo(codeModeOutput).Length} bytes)");
            Environment.ExitCode = 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(exception);
            Environment.ExitCode = 1;
        }
        finally
        {
            BeginInvoke(Close);
        }
    }
}

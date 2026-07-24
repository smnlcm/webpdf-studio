using HtmlToPdfGuiV2.Pdf;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace HtmlToPdfGuiV2;

public sealed class MainForm : Form
{
    private static readonly Color Navy = Color.FromArgb(15, 23, 42);
    private static readonly Color Blue = Color.FromArgb(37, 99, 235);
    private static readonly Color LightBackground = Color.FromArgb(244, 247, 251);
    private static readonly Color MutedText = Color.FromArgb(71, 85, 105);
    private static readonly IReadOnlyDictionary<string, string> EnglishUiText =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Modern HTML ve CSS ile güvenilir PDF üretimi"] =
                "Reliable PDF creation with modern HTML and CSS",
            ["HTML dosyası"] = "HTML file",
            ["HTML kodu"] = "HTML code",
            ["Kaynak ve PDF ayarları"] = "Source and PDF settings",
            ["HTML dosyasını seç"] = "Select an HTML file",
            ["Seç..."] = "Browse...",
            ["HTML ile aynı klasördeki CSS ve görseller otomatik yüklenir."] =
                "CSS and images in the HTML folder are loaded automatically.",
            ["PDF seçenekleri"] = "PDF options",
            ["Kağıt"] = "Paper",
            ["Yön"] = "Orientation",
            ["Kenar boşlukları (mm)"] = "Margins (mm)",
            ["Üst"] = "Top",
            ["Sağ"] = "Right",
            ["Alt"] = "Bottom",
            ["Sol"] = "Left",
            ["Ölçek"] = "Scale",
            ["Arka plan renk ve görsellerini yazdır"] =
                "Print background colors and images",
            ["Tarayıcı üst/alt bilgisini ekle"] =
                "Include browser header and footer",
            ["Önizle"] = "Preview",
            ["PDF oluştur"] = "Create PDF",
            ["İptal"] = "Cancel",
            ["Renk"] = "Color",
            ["Dosya modunda göreli CSS, görsel ve font yolları korunur. " +
             "Kod modunda stilleri HTML içine eklemen önerilir."] =
                "File mode preserves relative CSS, image and font paths. " +
                "For code mode, embed styles in the HTML.",
            ["PDF önizleme"] = "PDF preview"
        };

    private readonly UserPreferences _preferences = UserPreferencesStore.Load();
    private readonly WebView2 _preview = new();
    private readonly WebViewPdfRenderer _renderer;
    private readonly ModernTabControl _sourceTabs = new();
    private readonly ComboBox _languageComboBox = new();
    private readonly ComboBox _themeComboBox = new();
    private readonly ModernButton _accentColorButton = new();
    private readonly TextBox _filePathTextBox = new();
    private readonly RichTextBox _htmlEditor = new();
    private readonly ComboBox _paperSizeComboBox = new();
    private readonly ComboBox _orientationComboBox = new();
    private readonly NumericUpDown _marginTop = CreateMillimeterInput();
    private readonly NumericUpDown _marginRight = CreateMillimeterInput();
    private readonly NumericUpDown _marginBottom = CreateMillimeterInput();
    private readonly NumericUpDown _marginLeft = CreateMillimeterInput();
    private readonly NumericUpDown _scaleInput = CreateScaleInput();
    private readonly CheckBox _backgroundCheckBox = new();
    private readonly CheckBox _headerFooterCheckBox = new();
    private readonly ModernButton _previewButton = new();
    private readonly ModernButton _exportButton = new();
    private readonly ModernButton _cancelButton = new();
    private readonly ToolStripStatusLabel _statusLabel = new();
    private readonly ToolStripProgressBar _progressBar = new();
    private readonly HashSet<Control> _mutedControls = [];

    private CancellationTokenSource? _operationCancellation;
    private Action? _repositionHeaderContent;
    private TableLayoutPanel? _rootLayout;
    private Panel? _headerPanel;
    private Label? _headerTitle;
    private Label? _headerBadge;
    private Label? _headerSubtitle;
    private FlowLayoutPanel? _appearancePanel;
    private SplitContainer? _workspaceSplit;
    private StatusStrip? _statusStrip;
    private string? _previewPdfPath;
    private UiLanguage _language = UiLanguage.Turkish;
    private UiTheme _theme = UiTheme.ModernLight;
    private Color _accentColor = Blue;
    private bool _applyingLanguage;
    private bool _applyingAppearance;
    private bool _previewDirty = true;
    private bool _busy;

    public MainForm()
    {
        _language = string.Equals(
            _preferences.Language,
            nameof(UiLanguage.English),
            StringComparison.OrdinalIgnoreCase)
                ? UiLanguage.English
                : UiLanguage.Turkish;
        _theme = string.Equals(
            _preferences.Theme,
            nameof(UiTheme.DarkPremium),
            StringComparison.OrdinalIgnoreCase)
                ? UiTheme.DarkPremium
                : UiTheme.ModernLight;
        _accentColor = ParseAccentColor(_preferences.AccentColor);

        _renderer = new WebViewPdfRenderer(_preview);

        Text = "HTML to PDF V2";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(1040, 680);
        Size = new Size(1280, 800);
        BackColor = LightBackground;
        Font = new Font("Segoe UI", 9.5f);

        BuildInterface();
        CaptureThemeRoles(this);
        BindEvents();

        _htmlEditor.Text = SampleHtml.Content;
        _htmlEditor.SelectionStart = 0;
        _htmlEditor.SelectionLength = 0;
        ApplyLanguage();
        ApplyTheme();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _operationCancellation?.Cancel();
            _operationCancellation?.Dispose();
            TryDelete(_previewPdfPath);
            _renderer.Dispose();
            _preview.Dispose();
        }

        base.Dispose(disposing);
    }

    private void BuildInterface()
    {
        _rootLayout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 3,
            BackColor = LightBackground
        };
        _rootLayout.RowStyles.Add(new RowStyle(SizeType.Absolute, 72));
        _rootLayout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        _rootLayout.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));

        _rootLayout.Controls.Add(CreateHeader(), 0, 0);
        _rootLayout.Controls.Add(CreateWorkspace(), 0, 1);
        _rootLayout.Controls.Add(CreateStatusStrip(), 0, 2);

        Controls.Add(_rootLayout);
    }

    private Control CreateHeader()
    {
        _headerPanel = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Navy,
            Padding = new Padding(24, 12, 18, 10)
        };

        _headerTitle = new Label
        {
            AutoSize = true,
            ForeColor = Color.White,
            Font = new Font("Segoe UI Semibold", 17f),
            Text = "HTML to PDF",
            Location = new Point(24, 18)
        };

        _headerBadge = new Label
        {
            AutoSize = true,
            ForeColor = Color.FromArgb(191, 219, 254),
            BackColor = Color.FromArgb(30, 41, 59),
            Font = new Font("Segoe UI Semibold", 9f),
            Padding = new Padding(9, 5, 9, 5),
            Text = "V2.2  •  Edge / Chromium",
            Location = new Point(174, 21)
        };

        _headerSubtitle = new Label
        {
            AutoSize = true,
            ForeColor = Color.FromArgb(148, 163, 184),
            Text = "Modern HTML ve CSS ile güvenilir PDF üretimi"
        };

        var themeLabel = new Label
        {
            AutoSize = true,
            Text = "Tema / Theme",
            Margin = new Padding(0, 8, 8, 0)
        };

        _themeComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
        _themeComboBox.Items.AddRange(
            _language == UiLanguage.English
                ? ["Light A", "Dark C"]
                : ["Açık A", "Koyu C"]);
        _themeComboBox.SelectedIndex =
            _theme == UiTheme.DarkPremium ? 1 : 0;
        _themeComboBox.Width = 86;
        _themeComboBox.AccessibleName = "Theme";
        _themeComboBox.Margin = new Padding(0, 3, 10, 0);

        _accentColorButton.Text = TextFor("Renk", "Color");
        _accentColorButton.AccessibleName = "Accent color";
        _accentColorButton.Width = 64;
        _accentColorButton.Height = 30;
        _accentColorButton.Margin = new Padding(0, 2, 12, 0);

        var languageLabel = new Label
        {
            AutoSize = true,
            Text = "Dil / Language",
            Margin = new Padding(0, 7, 8, 0)
        };

        _languageComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
        _languageComboBox.Items.AddRange(["Türkçe", "English"]);
        _languageComboBox.SelectedIndex =
            _language == UiLanguage.English ? 1 : 0;
        _languageComboBox.Width = 96;
        _languageComboBox.AccessibleName = "Language";
        _languageComboBox.Margin = new Padding(0, 3, 0, 0);

        _appearancePanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Right,
            Width = 478,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            BackColor = Navy,
            Padding = new Padding(0, 8, 0, 0)
        };
        _appearancePanel.Controls.Add(themeLabel);
        _appearancePanel.Controls.Add(_themeComboBox);
        _appearancePanel.Controls.Add(_accentColorButton);
        _appearancePanel.Controls.Add(languageLabel);
        _appearancePanel.Controls.Add(_languageComboBox);

        _headerPanel.Controls.Add(_headerTitle);
        _headerPanel.Controls.Add(_headerBadge);
        _headerPanel.Controls.Add(_headerSubtitle);
        _headerPanel.Controls.Add(_appearancePanel);

        _repositionHeaderContent = () =>
        {
            var rightEdge =
                _headerPanel.ClientSize.Width -
                _appearancePanel.Width -
                24;
            var left = rightEdge - _headerSubtitle.Width;
            _headerSubtitle.Visible = left >= 360;
            _headerSubtitle.Location = new Point(
                Math.Max(360, left),
                26);
        };
        _headerPanel.Resize += (_, _) => _repositionHeaderContent();

        return _headerPanel;
    }

    private Control CreateWorkspace()
    {
        _workspaceSplit = new SplitContainer
        {
            Size = new Size(1000, 600),
            Dock = DockStyle.Fill,
            FixedPanel = FixedPanel.Panel1,
            Panel1MinSize = 360,
            Panel2MinSize = 440,
            SplitterDistance = 420,
            BackColor = Color.FromArgb(203, 213, 225),
            Padding = new Padding(12)
        };

        _workspaceSplit.Panel1.BackColor = Color.White;
        _workspaceSplit.Panel2.BackColor = Color.White;
        _workspaceSplit.Panel1.Padding = new Padding(14);
        _workspaceSplit.Panel2.Padding = new Padding(0);

        _workspaceSplit.Panel1.Controls.Add(CreateControlPanel());
        _workspaceSplit.Panel2.Controls.Add(CreatePreviewPanel());

        return _workspaceSplit;
    }

    private Control CreateControlPanel()
    {
        var scroll = new Panel
        {
            Dock = DockStyle.Fill,
            AutoScroll = true,
            BackColor = Color.White
        };

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Top,
            AutoSize = true,
            ColumnCount = 1,
            RowCount = 5,
            BackColor = Color.White
        };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        var heading = new Label
        {
            AutoSize = true,
            Font = new Font("Segoe UI Semibold", 13f),
            ForeColor = Navy,
            Text = "Kaynak ve PDF ayarları",
            Margin = new Padding(0, 0, 0, 10)
        };

        ConfigureSourceTabs();

        layout.Controls.Add(heading, 0, 0);
        layout.Controls.Add(_sourceTabs, 0, 1);
        layout.Controls.Add(CreateOptionsGroup(), 0, 2);
        layout.Controls.Add(CreateActionButtons(), 0, 3);
        layout.Controls.Add(
            new Label
            {
                AutoSize = true,
                MaximumSize = new Size(360, 0),
                ForeColor = MutedText,
                Text = "Dosya modunda göreli CSS, görsel ve font yolları korunur. " +
                       "Kod modunda stilleri HTML içine eklemen önerilir.",
                Margin = new Padding(0, 12, 0, 0)
            },
            0,
            4);

        scroll.Controls.Add(layout);
        return scroll;
    }

    private void ConfigureSourceTabs()
    {
        _sourceTabs.Dock = DockStyle.Top;
        _sourceTabs.Height = 260;
        _sourceTabs.Margin = new Padding(0, 0, 0, 14);

        var filePage = new TabPage("HTML dosyası")
        {
            Padding = new Padding(12),
            BackColor = Color.White
        };

        var fileLayout = new TableLayoutPanel
        {
            Dock = DockStyle.Top,
            AutoSize = true,
            ColumnCount = 1,
            RowCount = 3
        };
        fileLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        fileLayout.Controls.Add(
            new Label
            {
                AutoSize = true,
                ForeColor = Navy,
                Text = "HTML dosyasını seç",
                Margin = new Padding(0, 0, 0, 6)
            },
            0,
            0);

        var picker = new TableLayoutPanel
        {
            Dock = DockStyle.Top,
            Height = 36,
            ColumnCount = 2
        };
        picker.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        picker.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 86));

        _filePathTextBox.Dock = DockStyle.Fill;
        _filePathTextBox.PlaceholderText = "C:\\Belgeler\\ornek.html";

        var browseButton = CreateSecondaryButton("Seç...");
        browseButton.Dock = DockStyle.Fill;
        browseButton.Margin = new Padding(8, 0, 0, 0);
        browseButton.Click += BrowseButton_Click;

        picker.Controls.Add(_filePathTextBox, 0, 0);
        picker.Controls.Add(browseButton, 1, 0);
        fileLayout.Controls.Add(picker, 0, 1);
        fileLayout.Controls.Add(
            new Label
            {
                AutoSize = true,
                ForeColor = MutedText,
                Text = "HTML ile aynı klasördeki CSS ve görseller otomatik yüklenir.",
                Margin = new Padding(0, 10, 0, 0)
            },
            0,
            2);

        filePage.Controls.Add(fileLayout);

        var codePage = new TabPage("HTML kodu")
        {
            Padding = new Padding(8),
            BackColor = Color.White
        };

        _htmlEditor.Dock = DockStyle.Fill;
        _htmlEditor.BorderStyle = BorderStyle.FixedSingle;
        _htmlEditor.Font = new Font("Consolas", 9.5f);
        _htmlEditor.AcceptsTab = true;
        _htmlEditor.WordWrap = false;
        _htmlEditor.DetectUrls = false;
        codePage.Controls.Add(_htmlEditor);

        _sourceTabs.TabPages.Add(filePage);
        _sourceTabs.TabPages.Add(codePage);
        _sourceTabs.SelectedIndex = 1;
    }

    private Control CreateOptionsGroup()
    {
        var group = new GroupBox
        {
            AutoSize = true,
            Dock = DockStyle.Top,
            ForeColor = Navy,
            Text = "PDF seçenekleri",
            Padding = new Padding(12),
            Margin = new Padding(0, 0, 0, 14)
        };

        _paperSizeComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
        _paperSizeComboBox.Items.AddRange(["A4", "Letter"]);
        _paperSizeComboBox.SelectedIndex = 0;
        _paperSizeComboBox.Width = 130;

        _orientationComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
        _orientationComboBox.Items.AddRange(["Dikey", "Yatay"]);
        _orientationComboBox.SelectedIndex = 0;
        _orientationComboBox.Width = 130;

        _backgroundCheckBox.AutoSize = true;
        _backgroundCheckBox.Checked = true;
        _backgroundCheckBox.Text = "Arka plan renk ve görsellerini yazdır";

        _headerFooterCheckBox.AutoSize = true;
        _headerFooterCheckBox.Text = "Tarayıcı üst/alt bilgisini ekle";

        var options = new FlowLayoutPanel
        {
            AutoSize = true,
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false
        };

        options.Controls.Add(CreateOptionRow("Kağıt", _paperSizeComboBox));
        options.Controls.Add(CreateOptionRow("Yön", _orientationComboBox));
        options.Controls.Add(CreateMarginsRow());
        options.Controls.Add(CreateOptionRow("Ölçek", _scaleInput));
        options.Controls.Add(_backgroundCheckBox);
        options.Controls.Add(_headerFooterCheckBox);

        group.Controls.Add(options);
        return group;
    }

    private Control CreateMarginsRow()
    {
        var panel = new FlowLayoutPanel
        {
            AutoSize = true,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            Margin = new Padding(0, 4, 0, 8)
        };

        panel.Controls.Add(CreateMiniInput("Üst", _marginTop));
        panel.Controls.Add(CreateMiniInput("Sağ", _marginRight));
        panel.Controls.Add(CreateMiniInput("Alt", _marginBottom));
        panel.Controls.Add(CreateMiniInput("Sol", _marginLeft));

        var container = new FlowLayoutPanel
        {
            AutoSize = true,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            Margin = new Padding(0)
        };
        container.Controls.Add(
            new Label
            {
                AutoSize = true,
                ForeColor = MutedText,
                Text = "Kenar boşlukları (mm)"
            });
        container.Controls.Add(panel);
        return container;
    }

    private Control CreateActionButtons()
    {
        var actions = new TableLayoutPanel
        {
            Dock = DockStyle.Top,
            Height = 42,
            ColumnCount = 3,
            Margin = new Padding(0)
        };
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 42));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 42));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 16));

        ConfigureButton(_previewButton, "Önizle", Color.White, Blue, Blue);
        ConfigureButton(_exportButton, "PDF oluştur", Blue, Color.White, Blue);
        ConfigureButton(
            _cancelButton,
            "İptal",
            Color.White,
            Color.FromArgb(185, 28, 28),
            Color.FromArgb(185, 28, 28));

        _previewButton.Margin = new Padding(0, 0, 6, 0);
        _exportButton.Margin = new Padding(6, 0, 6, 0);
        _cancelButton.Margin = new Padding(6, 0, 0, 0);
        _cancelButton.Enabled = false;

        actions.Controls.Add(_previewButton, 0, 0);
        actions.Controls.Add(_exportButton, 1, 0);
        actions.Controls.Add(_cancelButton, 2, 0);

        return actions;
    }

    private Control CreatePreviewPanel()
    {
        var panel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            BackColor = Color.White
        };
        panel.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        panel.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

        var previewHeader = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.White,
            Padding = new Padding(16, 10, 16, 8)
        };
        previewHeader.Controls.Add(
            new Label
            {
                AutoSize = true,
                Font = new Font("Segoe UI Semibold", 11f),
                ForeColor = Navy,
                Text = "PDF önizleme"
            });

        _preview.Dock = DockStyle.Fill;
        _preview.DefaultBackgroundColor = Color.White;
        _preview.Margin = new Padding(1);

        panel.Controls.Add(previewHeader, 0, 0);
        panel.Controls.Add(_preview, 0, 1);
        return panel;
    }

    private Control CreateStatusStrip()
    {
        _statusStrip = new StatusStrip
        {
            Dock = DockStyle.Fill,
            SizingGrip = false,
            BackColor = Color.White
        };

        _statusLabel.Spring = true;
        _statusLabel.TextAlign = ContentAlignment.MiddleLeft;
        _statusLabel.Text = "Hazır";

        _progressBar.Visible = false;
        _progressBar.Style = ProgressBarStyle.Marquee;
        _progressBar.MarqueeAnimationSpeed = 25;
        _progressBar.Width = 150;

        _statusStrip.Items.Add(_statusLabel);
        _statusStrip.Items.Add(_progressBar);
        return _statusStrip;
    }

    private void BindEvents()
    {
        Shown += MainForm_Shown;
        FormClosing += (_, _) => _operationCancellation?.Cancel();

        _languageComboBox.SelectedIndexChanged += (_, _) =>
        {
            _language = _languageComboBox.SelectedIndex == 1
                ? UiLanguage.English
                : UiLanguage.Turkish;
            ApplyLanguage();
            SavePreferences();
        };

        _themeComboBox.SelectedIndexChanged += (_, _) =>
        {
            if (_applyingAppearance)
            {
                return;
            }

            _theme = _themeComboBox.SelectedIndex == 1
                ? UiTheme.DarkPremium
                : UiTheme.ModernLight;
            ApplyTheme();
            SavePreferences();
        };
        _accentColorButton.Click += AccentColorButton_Click;

        _sourceTabs.SelectedIndexChanged += (_, _) => MarkPreviewDirty();
        _filePathTextBox.TextChanged += (_, _) => MarkPreviewDirty();
        _htmlEditor.TextChanged += (_, _) => MarkPreviewDirty();
        _paperSizeComboBox.SelectedIndexChanged += (_, _) => MarkPreviewDirty();
        _orientationComboBox.SelectedIndexChanged += (_, _) => MarkPreviewDirty();
        _marginTop.ValueChanged += (_, _) => MarkPreviewDirty();
        _marginRight.ValueChanged += (_, _) => MarkPreviewDirty();
        _marginBottom.ValueChanged += (_, _) => MarkPreviewDirty();
        _marginLeft.ValueChanged += (_, _) => MarkPreviewDirty();
        _scaleInput.ValueChanged += (_, _) => MarkPreviewDirty();
        _backgroundCheckBox.CheckedChanged += (_, _) => MarkPreviewDirty();
        _headerFooterCheckBox.CheckedChanged += (_, _) => MarkPreviewDirty();

        _previewButton.Click += async (_, _) => await PreviewAsync();
        _exportButton.Click += async (_, _) => await ExportAsync();
        _cancelButton.Click += (_, _) => _operationCancellation?.Cancel();
    }

    private async void MainForm_Shown(object? sender, EventArgs e)
    {
        await ExecuteOperationAsync(
            async token =>
            {
                await _renderer.LoadWelcomeAsync(SampleHtml.Welcome, token);
                _htmlEditor.Select(0, 0);
                _htmlEditor.ScrollToCaret();
                _statusLabel.Text = TextFor(
                    "Hazır - örnek HTML kodu yüklendi",
                    "Ready - sample HTML loaded");
            },
            TextFor("WebView2 hazırlanıyor...", "Preparing WebView2..."));
    }

    private void BrowseButton_Click(object? sender, EventArgs e)
    {
        using var dialog = new OpenFileDialog
        {
            Filter = TextFor(
                "HTML dosyaları (*.html;*.htm)|*.html;*.htm|Tüm dosyalar (*.*)|*.*",
                "HTML files (*.html;*.htm)|*.html;*.htm|All files (*.*)|*.*"),
            Title = TextFor("HTML dosyasını seç", "Select an HTML file")
        };

        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            _filePathTextBox.Text = dialog.FileName;
            _sourceTabs.SelectedIndex = 0;
        }
    }

    private async Task PreviewAsync()
    {
        await ExecuteOperationAsync(
            async token =>
            {
                await EnsurePdfPreviewAsync(token);
                _statusLabel.Text = TextFor(
                    "PDF önizlemesi hazır",
                    "PDF preview is ready");
            },
            TextFor(
                "PDF önizlemesi hazırlanıyor...",
                "Preparing PDF preview..."));
    }

    private async Task ExportAsync()
    {
        using var dialog = new SaveFileDialog
        {
            Filter = TextFor(
                "PDF dosyaları (*.pdf)|*.pdf",
                "PDF files (*.pdf)|*.pdf"),
            Title = TextFor("PDF dosyasını kaydet", "Save the PDF file"),
            AddExtension = true,
            DefaultExt = "pdf",
            FileName = GetDefaultPdfFileName(),
            OverwritePrompt = true
        };

        if (_sourceTabs.SelectedIndex == 0 &&
            File.Exists(_filePathTextBox.Text))
        {
            dialog.InitialDirectory = Path.GetDirectoryName(_filePathTextBox.Text);
        }

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            return;
        }

        await ExecuteOperationAsync(
            async token =>
            {
                var previewPdf = await EnsurePdfPreviewAsync(token);
                CopyToDestination(previewPdf, dialog.FileName);
                PdfFileValidator.EnsureValid(dialog.FileName);

                _statusLabel.Text = TextFor(
                    $"PDF oluşturuldu: {dialog.FileName}",
                    $"PDF created: {dialog.FileName}");

                MessageBox.Show(
                    this,
                    TextFor(
                        $"PDF başarıyla oluşturuldu.\n\n{dialog.FileName}",
                        $"PDF created successfully.\n\n{dialog.FileName}"),
                    "HTML to PDF V2",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            },
            TextFor("PDF oluşturuluyor...", "Creating PDF..."));
    }

    private async Task<string> EnsurePdfPreviewAsync(
        CancellationToken cancellationToken)
    {
        if (!_previewDirty &&
            !string.IsNullOrWhiteSpace(_previewPdfPath) &&
            File.Exists(_previewPdfPath))
        {
            return _previewPdfPath;
        }

        await LoadSourceCoreAsync(cancellationToken);

        var tempDirectory = Path.Combine(
            Path.GetTempPath(),
            "HtmlToPdfGuiV2",
            "preview");
        Directory.CreateDirectory(tempDirectory);

        var nextPreviewPdf = Path.Combine(
            tempDirectory,
            $"{Guid.NewGuid():N}.pdf");

        try
        {
            await _renderer.ExportPdfAsync(
                nextPreviewPdf,
                ReadExportOptions(),
                cancellationToken);
            PdfFileValidator.EnsureValid(nextPreviewPdf);

            await _renderer.LoadPdfPreviewAsync(
                nextPreviewPdf,
                cancellationToken);

            var previousPreviewPdf = _previewPdfPath;
            _previewPdfPath = nextPreviewPdf;
            _previewDirty = false;
            TryDelete(previousPreviewPdf);

            return nextPreviewPdf;
        }
        catch
        {
            TryDelete(nextPreviewPdf);
            throw;
        }
    }

    private async Task LoadSourceCoreAsync(CancellationToken cancellationToken)
    {
        if (_sourceTabs.SelectedIndex == 0)
        {
            var path = _filePathTextBox.Text.Trim();
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            {
                throw new FileNotFoundException(
                    TextFor(
                        "Lütfen geçerli bir HTML dosyası seçin.",
                        "Please select a valid HTML file."),
                    path);
            }

            await _renderer.LoadFileAsync(path, cancellationToken);
        }
        else
        {
            var html = _htmlEditor.Text;
            if (string.IsNullOrWhiteSpace(html))
            {
                throw new InvalidOperationException(
                    TextFor(
                        "Lütfen dönüştürülecek HTML kodunu girin.",
                        "Please enter the HTML code to convert."));
            }

            await _renderer.LoadHtmlAsync(html, cancellationToken);
        }
    }

    private PdfExportOptions ReadExportOptions()
    {
        return new PdfExportOptions
        {
            PaperSize = _paperSizeComboBox.SelectedIndex == 1
                ? PdfPaperSize.Letter
                : PdfPaperSize.A4,
            Landscape = _orientationComboBox.SelectedIndex == 1,
            MarginTopMm = decimal.ToDouble(_marginTop.Value),
            MarginRightMm = decimal.ToDouble(_marginRight.Value),
            MarginBottomMm = decimal.ToDouble(_marginBottom.Value),
            MarginLeftMm = decimal.ToDouble(_marginLeft.Value),
            PrintBackgrounds = _backgroundCheckBox.Checked,
            PrintHeaderAndFooter = _headerFooterCheckBox.Checked,
            ScaleFactor = decimal.ToDouble(_scaleInput.Value)
        };
    }

    private async Task ExecuteOperationAsync(
        Func<CancellationToken, Task> operation,
        string busyText)
    {
        if (_busy)
        {
            return;
        }

        _operationCancellation?.Dispose();
        _operationCancellation = new CancellationTokenSource();
        var cancellationToken = _operationCancellation.Token;

        SetBusy(true, busyText);

        try
        {
            await operation(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            _statusLabel.Text = TextFor(
                "İşlem iptal edildi",
                "Operation cancelled");
        }
        catch (WebView2RuntimeNotFoundException)
        {
            _statusLabel.Text = TextFor(
                "WebView2 Runtime bulunamadı",
                "WebView2 Runtime was not found");
            MessageBox.Show(
                this,
                TextFor(
                    "Microsoft Edge WebView2 Runtime bulunamadı. " +
                    "Lütfen WebView2 Runtime kurup uygulamayı yeniden açın.",
                    "Microsoft Edge WebView2 Runtime was not found. " +
                    "Install WebView2 Runtime and restart the application."),
                TextFor("WebView2 gerekli", "WebView2 is required"),
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
        catch (Exception exception)
        {
            _statusLabel.Text = TextFor(
                "Hata oluştu",
                "An error occurred");
            MessageBox.Show(
                this,
                GetFriendlyErrorMessage(exception),
                "HTML to PDF V2",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
        finally
        {
            SetBusy(
                false,
                _statusLabel.Text ??
                TextFor("Hazır", "Ready"));
            _operationCancellation?.Dispose();
            _operationCancellation = null;
        }
    }

    private void SetBusy(bool busy, string status)
    {
        _busy = busy;
        _statusLabel.Text = status;
        _progressBar.Visible = busy;
        _previewButton.Enabled = !busy;
        _exportButton.Enabled = !busy;
        _cancelButton.Enabled = busy;
        _languageComboBox.Enabled = !busy;
        _themeComboBox.Enabled = !busy;
        _accentColorButton.Enabled = !busy;
        UseWaitCursor = busy;
    }

    private void MarkPreviewDirty()
    {
        if (_applyingLanguage)
        {
            return;
        }

        _previewDirty = true;

        if (!_busy && !string.IsNullOrWhiteSpace(_previewPdfPath))
        {
            _statusLabel.Text = TextFor(
                "Ayarlar değişti - önizlemeyi yenileyin",
                "Settings changed - refresh the preview");
        }
    }

    private string GetDefaultPdfFileName()
    {
        if (_sourceTabs.SelectedIndex == 0 &&
            File.Exists(_filePathTextBox.Text))
        {
            return Path.GetFileNameWithoutExtension(_filePathTextBox.Text) + ".pdf";
        }

        return "Belge-V2.pdf";
    }

    private static void CopyToDestination(string sourcePath, string destinationPath)
    {
        var fullDestination = Path.GetFullPath(destinationPath);
        var destinationDirectory = Path.GetDirectoryName(fullDestination)!;
        Directory.CreateDirectory(destinationDirectory);

        var stagingPath = Path.Combine(
            destinationDirectory,
            $".{Path.GetFileName(fullDestination)}.{Guid.NewGuid():N}.tmp");

        try
        {
            File.Copy(sourcePath, stagingPath, overwrite: true);
            File.Move(stagingPath, fullDestination, overwrite: true);
        }
        finally
        {
            TryDelete(stagingPath);
        }
    }

    private static void TryDelete(string? path)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // Geçici dosya temizliği ana işlemin sonucunu değiştirmemeli.
        }
    }

    private void AccentColorButton_Click(object? sender, EventArgs eventArgs)
    {
        using var dialog = new ColorDialog
        {
            Color = _accentColor,
            FullOpen = true,
            AnyColor = true
        };

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            return;
        }

        _accentColor = Color.FromArgb(
            dialog.Color.R,
            dialog.Color.G,
            dialog.Color.B);
        ApplyTheme();
        SavePreferences();
    }

    private void ApplyTheme()
    {
        var palette = _theme == UiTheme.DarkPremium
            ? ThemePalette.Dark(_accentColor)
            : ThemePalette.Light(_accentColor);

        ApplyThemeToControl(this, palette, insideHeader: false);

        BackColor = palette.AppBackground;
        if (_rootLayout is not null)
        {
            _rootLayout.BackColor = palette.AppBackground;
        }

        if (_workspaceSplit is not null)
        {
            _workspaceSplit.BackColor = palette.Border;
            _workspaceSplit.Panel1.BackColor = palette.Surface;
            _workspaceSplit.Panel2.BackColor = palette.Surface;
        }

        if (_headerPanel is not null)
        {
            _headerPanel.BackColor = palette.HeaderBackground;
        }

        if (_appearancePanel is not null)
        {
            _appearancePanel.BackColor = palette.HeaderBackground;
        }

        if (_headerTitle is not null)
        {
            _headerTitle.ForeColor = palette.HeaderText;
        }

        if (_headerSubtitle is not null)
        {
            _headerSubtitle.ForeColor = palette.HeaderMuted;
        }

        if (_headerBadge is not null)
        {
            _headerBadge.ForeColor = palette.Accent;
            _headerBadge.BackColor = Mix(
                palette.Accent,
                palette.HeaderBackground,
                0.86);
        }

        _sourceTabs.SurfaceColor = palette.Surface;
        _sourceTabs.TextColor = palette.MutedText;
        _sourceTabs.AccentColor = palette.Accent;
        _sourceTabs.Invalidate();

        StyleModernButton(
            _exportButton,
            palette.Accent,
            GetContrastingTextColor(palette.Accent),
            palette.Accent);
        StyleModernButton(
            _previewButton,
            palette.Surface,
            palette.Accent,
            palette.Accent);
        StyleModernButton(
            _cancelButton,
            palette.Surface,
            palette.Danger,
            palette.Danger);
        StyleModernButton(
            _accentColorButton,
            palette.Accent,
            GetContrastingTextColor(palette.Accent),
            palette.Accent);

        if (_statusStrip is not null)
        {
            _statusStrip.BackColor = palette.StatusBackground;
            _statusStrip.ForeColor = palette.MutedText;
        }

        _statusLabel.ForeColor = palette.MutedText;
        _preview.DefaultBackgroundColor = palette.PreviewBackground;
        Invalidate(true);
    }

    private void ApplyThemeToControl(
        Control control,
        ThemePalette palette,
        bool insideHeader)
    {
        var headerScope = insideHeader || ReferenceEquals(control, _headerPanel);

        switch (control)
        {
            case Form:
                control.BackColor = palette.AppBackground;
                control.ForeColor = palette.Text;
                break;

            case SplitContainer split:
                split.BackColor = palette.Border;
                split.Panel1.BackColor = palette.Surface;
                split.Panel2.BackColor = palette.Surface;
                break;

            case ModernTabControl tabs:
                tabs.BackColor = palette.Surface;
                tabs.ForeColor = palette.Text;
                break;

            case TabPage page:
                page.UseVisualStyleBackColor = false;
                page.BackColor = palette.Surface;
                page.ForeColor = palette.Text;
                break;

            case RichTextBox editor:
                editor.BackColor = palette.InputBackground;
                editor.ForeColor = palette.Text;
                editor.BorderStyle = BorderStyle.FixedSingle;
                break;

            case TextBoxBase textBox:
                textBox.BackColor = palette.InputBackground;
                textBox.ForeColor = palette.Text;
                break;

            case ComboBox comboBox:
                comboBox.BackColor = palette.InputBackground;
                comboBox.ForeColor = palette.Text;
                break;

            case NumericUpDown numeric:
                numeric.BackColor = palette.InputBackground;
                numeric.ForeColor = palette.Text;
                break;

            case GroupBox group:
                group.BackColor = palette.Surface;
                group.ForeColor = palette.Text;
                break;

            case CheckBox checkBox:
                checkBox.BackColor = headerScope
                    ? palette.HeaderBackground
                    : palette.Surface;
                checkBox.ForeColor = headerScope
                    ? palette.HeaderText
                    : palette.Text;
                break;

            case Label label:
                label.ForeColor = headerScope
                    ? palette.HeaderText
                    : _mutedControls.Contains(label)
                        ? palette.MutedText
                        : palette.Text;
                break;

            case ModernButton:
                break;

            case Button button:
                button.BackColor = palette.SurfaceAlt;
                button.ForeColor = palette.Text;
                button.FlatStyle = FlatStyle.Flat;
                button.FlatAppearance.BorderColor = palette.Border;
                break;

            case StatusStrip:
                break;

            case Panel:
                control.BackColor = headerScope
                    ? palette.HeaderBackground
                    : palette.Surface;
                control.ForeColor = headerScope
                    ? palette.HeaderText
                    : palette.Text;
                break;
        }

        foreach (Control child in control.Controls)
        {
            ApplyThemeToControl(child, palette, headerScope);
        }
    }

    private void CaptureThemeRoles(Control control)
    {
        if (control.ForeColor.ToArgb() == MutedText.ToArgb())
        {
            _mutedControls.Add(control);
        }

        foreach (Control child in control.Controls)
        {
            CaptureThemeRoles(child);
        }
    }

    private void SavePreferences()
    {
        _preferences.Theme = _theme.ToString();
        _preferences.AccentColor =
            $"#{_accentColor.R:X2}{_accentColor.G:X2}{_accentColor.B:X2}";
        _preferences.Language = _language.ToString();
        UserPreferencesStore.Save(_preferences);
    }

    private static Color ParseAccentColor(string? value)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                var parsed = ColorTranslator.FromHtml(value);
                return Color.FromArgb(parsed.R, parsed.G, parsed.B);
            }
        }
        catch
        {
            // Geçersiz ayarda varsayılan mavi kullanılır.
        }

        return Blue;
    }

    private static void StyleModernButton(
        ModernButton button,
        Color background,
        Color foreground,
        Color border)
    {
        button.BackColor = background;
        button.ForeColor = foreground;
        button.BorderColor = border;
        button.CornerRadius = 8;
        button.Invalidate();
    }

    private static Color GetContrastingTextColor(Color background)
    {
        var luminance =
            (0.299 * background.R) +
            (0.587 * background.G) +
            (0.114 * background.B);
        return luminance > 155 ? Color.FromArgb(15, 23, 42) : Color.White;
    }

    private static Color Mix(Color foreground, Color background, double amount)
    {
        amount = Math.Clamp(amount, 0, 1);
        return Color.FromArgb(
            (int)((foreground.R * (1 - amount)) + (background.R * amount)),
            (int)((foreground.G * (1 - amount)) + (background.G * amount)),
            (int)((foreground.B * (1 - amount)) + (background.B * amount)));
    }

    private void ApplyLanguage()
    {
        _applyingLanguage = true;
        try
        {
            ApplyLanguageToControl(this);

            var paperIndex = Math.Max(0, _paperSizeComboBox.SelectedIndex);
            _paperSizeComboBox.Items.Clear();
            _paperSizeComboBox.Items.AddRange(["A4", "Letter"]);
            _paperSizeComboBox.SelectedIndex = Math.Min(
                paperIndex,
                _paperSizeComboBox.Items.Count - 1);

            var orientationIndex = Math.Max(
                0,
                _orientationComboBox.SelectedIndex);
            _orientationComboBox.Items.Clear();
            _orientationComboBox.Items.AddRange(
                _language == UiLanguage.English
                    ? ["Portrait", "Landscape"]
                    : ["Dikey", "Yatay"]);
            _orientationComboBox.SelectedIndex = Math.Min(
                orientationIndex,
                _orientationComboBox.Items.Count - 1);

            _applyingAppearance = true;
            try
            {
                var themeIndex = Math.Max(
                    0,
                    _themeComboBox.SelectedIndex);
                _themeComboBox.Items.Clear();
                _themeComboBox.Items.AddRange(
                    _language == UiLanguage.English
                        ? ["Light A", "Dark C"]
                        : ["Açık A", "Koyu C"]);
                _themeComboBox.SelectedIndex = Math.Min(
                    themeIndex,
                    _themeComboBox.Items.Count - 1);
            }
            finally
            {
                _applyingAppearance = false;
            }
        }
        finally
        {
            _applyingLanguage = false;
        }

        if (!_busy)
        {
            _statusLabel.Text = TextFor("Hazır", "Ready");
        }

        _repositionHeaderContent?.Invoke();
    }

    private void ApplyLanguageToControl(Control control)
    {
        if (control.Tag is LocalizedText localized)
        {
            control.Text = _language == UiLanguage.English
                ? localized.English
                : localized.Turkish;
        }
        else if (EnglishUiText.TryGetValue(control.Text, out var english))
        {
            var translation = new LocalizedText(control.Text, english);
            control.Tag = translation;
            control.Text = _language == UiLanguage.English
                ? translation.English
                : translation.Turkish;
        }

        foreach (Control child in control.Controls)
        {
            ApplyLanguageToControl(child);
        }
    }

    private string GetFriendlyErrorMessage(Exception exception)
    {
        if (_language == UiLanguage.Turkish)
        {
            return exception.Message;
        }

        if (exception is TimeoutException)
        {
            return "The HTML document did not finish loading in time.";
        }

        if (exception is FileNotFoundException)
        {
            return "The selected HTML file could not be found.";
        }

        if (exception.Message.StartsWith(
                "HTML yüklenemedi:",
                StringComparison.Ordinal))
        {
            return exception.Message.Replace(
                "HTML yüklenemedi:",
                "HTML could not be loaded:",
                StringComparison.Ordinal);
        }

        return exception.Message switch
        {
            "WebView2 PDF üretimini tamamlayamadı." =>
                "WebView2 could not complete PDF creation.",
            "PDF dosyası oluşturulamadı." =>
                "The PDF file could not be created.",
            _ => exception.Message
        };
    }

    private string TextFor(string turkish, string english)
    {
        return _language == UiLanguage.English
            ? english
            : turkish;
    }

    private static Control CreateOptionRow(string labelText, Control control)
    {
        var row = new TableLayoutPanel
        {
            AutoSize = true,
            ColumnCount = 2,
            Margin = new Padding(0, 2, 0, 6)
        };
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 118));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));

        row.Controls.Add(
            new Label
            {
                AutoSize = true,
                ForeColor = MutedText,
                Text = labelText,
                Anchor = AnchorStyles.Left,
                Margin = new Padding(0, 7, 0, 0)
            },
            0,
            0);
        row.Controls.Add(control, 1, 0);
        return row;
    }

    private static Control CreateMiniInput(string labelText, NumericUpDown input)
    {
        var panel = new FlowLayoutPanel
        {
            AutoSize = true,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            Margin = new Padding(0, 0, 8, 0)
        };

        panel.Controls.Add(
            new Label
            {
                AutoSize = true,
                ForeColor = MutedText,
                Text = labelText
            });
        panel.Controls.Add(input);
        return panel;
    }

    private static NumericUpDown CreateMillimeterInput()
    {
        return new NumericUpDown
        {
            DecimalPlaces = 1,
            Minimum = 0,
            Maximum = 50,
            Increment = 1,
            Value = 12,
            Width = 68
        };
    }

    private static NumericUpDown CreateScaleInput()
    {
        return new NumericUpDown
        {
            DecimalPlaces = 2,
            Minimum = 0.10m,
            Maximum = 2.00m,
            Increment = 0.05m,
            Value = 1.00m,
            Width = 82
        };
    }

    private static Button CreateSecondaryButton(string text)
    {
        var button = new ModernButton();
        ConfigureButton(button, text, Color.White, Navy, Color.FromArgb(203, 213, 225));
        return button;
    }

    private static void ConfigureButton(
        Button button,
        string text,
        Color background,
        Color foreground,
        Color border)
    {
        button.Dock = DockStyle.Fill;
        button.Text = text;
        button.Height = 38;
        button.BackColor = background;
        button.ForeColor = foreground;
        button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderColor = border;
        button.FlatAppearance.BorderSize = 1;
        button.Cursor = Cursors.Hand;

        if (button is ModernButton modernButton)
        {
            modernButton.BorderColor = border;
            modernButton.CornerRadius = 8;
            modernButton.FlatAppearance.BorderSize = 0;
        }
    }

    private enum UiLanguage
    {
        Turkish,
        English
    }

    private enum UiTheme
    {
        ModernLight,
        DarkPremium
    }

    private sealed record LocalizedText(string Turkish, string English);

    private sealed record ThemePalette(
        Color AppBackground,
        Color Surface,
        Color SurfaceAlt,
        Color InputBackground,
        Color Text,
        Color MutedText,
        Color Border,
        Color HeaderBackground,
        Color HeaderText,
        Color HeaderMuted,
        Color PreviewBackground,
        Color StatusBackground,
        Color Accent,
        Color Danger)
    {
        public static ThemePalette Light(Color accent)
        {
            return new ThemePalette(
                Color.FromArgb(244, 247, 251),
                Color.White,
                Color.FromArgb(248, 250, 252),
                Color.White,
                Color.FromArgb(15, 23, 42),
                Color.FromArgb(100, 116, 139),
                Color.FromArgb(216, 225, 238),
                Color.White,
                Color.FromArgb(15, 23, 42),
                Color.FromArgb(100, 116, 139),
                Color.FromArgb(231, 236, 244),
                Color.White,
                accent,
                Color.FromArgb(220, 38, 38));
        }

        public static ThemePalette Dark(Color accent)
        {
            return new ThemePalette(
                Color.FromArgb(8, 12, 20),
                Color.FromArgb(17, 24, 39),
                Color.FromArgb(24, 34, 51),
                Color.FromArgb(13, 21, 34),
                Color.FromArgb(231, 237, 247),
                Color.FromArgb(148, 163, 184),
                Color.FromArgb(43, 53, 70),
                Color.FromArgb(10, 15, 25),
                Color.FromArgb(241, 245, 249),
                Color.FromArgb(148, 163, 184),
                Color.FromArgb(28, 37, 52),
                Color.FromArgb(10, 15, 25),
                accent,
                Color.FromArgb(248, 113, 113));
        }
    }
}

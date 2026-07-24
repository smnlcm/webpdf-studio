namespace HtmlToPdfGuiV2.Pdf;

public enum PdfPaperSize
{
    A4,
    Letter
}

public sealed record PdfExportOptions
{
    public PdfPaperSize PaperSize { get; init; } = PdfPaperSize.A4;

    public bool Landscape { get; init; }

    public double MarginTopMm { get; init; } = 12;

    public double MarginRightMm { get; init; } = 12;

    public double MarginBottomMm { get; init; } = 12;

    public double MarginLeftMm { get; init; } = 12;

    public bool PrintBackgrounds { get; init; } = true;

    public bool PrintHeaderAndFooter { get; init; }

    public double ScaleFactor { get; init; } = 1;
}

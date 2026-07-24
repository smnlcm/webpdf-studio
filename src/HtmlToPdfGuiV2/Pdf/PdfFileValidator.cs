using System.Text;

namespace HtmlToPdfGuiV2.Pdf;

public static class PdfFileValidator
{
    private const int MinimumPdfLength = 512;

    public static void EnsureValid(string path)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);

        var file = new FileInfo(path);
        if (!file.Exists)
        {
            throw new InvalidDataException("PDF dosyası oluşturulamadı.");
        }

        if (file.Length < MinimumPdfLength)
        {
            throw new InvalidDataException("Oluşturulan PDF dosyası beklenenden küçük.");
        }

        Span<byte> header = stackalloc byte[5];
        using var stream = File.OpenRead(path);
        stream.ReadExactly(header);

        if (!header.SequenceEqual(Encoding.ASCII.GetBytes("%PDF-")))
        {
            throw new InvalidDataException("Oluşturulan dosya geçerli bir PDF değil.");
        }
    }
}

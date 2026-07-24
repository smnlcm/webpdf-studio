using System.Text.Json;

namespace HtmlToPdfGuiV2;

internal sealed class UserPreferences
{
    public string Theme { get; set; } = "ModernLight";

    public string AccentColor { get; set; } = "#2563EB";

    public string Language { get; set; } = "Turkish";
}

internal static class UserPreferencesStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    private static string SettingsPath =>
        Path.Combine(
            Environment.GetFolderPath(
                Environment.SpecialFolder.LocalApplicationData),
            "HtmlToPdfGuiV2",
            "settings.json");

    public static UserPreferences Load()
    {
        try
        {
            if (!File.Exists(SettingsPath))
            {
                return new UserPreferences();
            }

            var json = File.ReadAllText(SettingsPath);
            return JsonSerializer.Deserialize<UserPreferences>(
                       json,
                       JsonOptions) ??
                   new UserPreferences();
        }
        catch
        {
            return new UserPreferences();
        }
    }

    public static void Save(UserPreferences preferences)
    {
        ArgumentNullException.ThrowIfNull(preferences);

        try
        {
            var directory = Path.GetDirectoryName(SettingsPath)!;
            Directory.CreateDirectory(directory);

            var stagingPath = SettingsPath + ".tmp";
            File.WriteAllText(
                stagingPath,
                JsonSerializer.Serialize(preferences, JsonOptions));
            File.Move(stagingPath, SettingsPath, overwrite: true);
        }
        catch
        {
            // Arayüz tercihleri kaydedilemese de ana işlevler çalışmaya devam etmeli.
        }
    }
}

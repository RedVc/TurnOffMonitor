using System.Text.Json;
using TurnOffMonitor.API.Models;

namespace TurnOffMonitor.API.Config;

public class ConfigService
{
    private readonly string _configPath = "monitor-config.json";

    public MonitorConfig Load()
    {
        if (!File.Exists(_configPath))
            return new MonitorConfig();

        var json = File.ReadAllText(_configPath);
        return JsonSerializer.Deserialize<MonitorConfig>(json) ?? new MonitorConfig();
    }

    public void Save(MonitorConfig config)
    {
        var json = JsonSerializer.Serialize(config, new JsonSerializerOptions
        {
            WriteIndented = true
        });
        File.WriteAllText(_configPath, json);
    }
}
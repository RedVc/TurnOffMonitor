using TurnOffMonitor.API.Config;
using TurnOffMonitor.API.Services;

namespace TurnOffMonitor.API.Services;

public class MonitorService : BackgroundService
{
    private readonly HardwareService _hardwareService;
    private readonly ConfigService _configService;
    private readonly ILogger<MonitorService> _logger;
    private bool _isMonitoring = false;

    public MonitorService(HardwareService hardwareService, ConfigService configService, ILogger<MonitorService> logger)
    {
        _hardwareService = hardwareService;
        _configService = configService;
        _logger = logger;
    }

    public void StartMonitoring() => _isMonitoring = true;
    public void StopMonitoring() => _isMonitoring = false;
    public bool IsMonitoring => _isMonitoring;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (_isMonitoring)
            {
                try
                {
                    var config = _configService.Load();
                    var temps = _hardwareService.GetTemperatures(config);

                    _logger.LogInformation(
                        "CPU: {cpu}°C | GPU: {gpu}°C | Umbrales -> CPU: {cpuT}°C GPU: {gpuT}°C",
                        temps.CpuTemperature, temps.GpuTemperature,
                        config.CpuThreshold, config.GpuThreshold
                    );

                    if (temps.CpuTemperature > 0 && temps.GpuTemperature > 0 &&
                        temps.CpuTemperature <= config.CpuThreshold &&
                        temps.GpuTemperature <= config.GpuThreshold)
                    {
                        _logger.LogInformation("Temperaturas bajo el umbral. Apagando PC...");
                        ShutdownPC();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error leyendo temperaturas");
                }
            }

            await Task.Delay(3000, stoppingToken);
        }
    }

    private void ShutdownPC()
    {
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
        {
            FileName = "shutdown",
            Arguments = "/s /t 10",
            CreateNoWindow = true,
            UseShellExecute = false
        });
    }
}
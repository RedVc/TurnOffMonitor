using TurnOffMonitor.API.Config;
using TurnOffMonitor.API.Models;
using TurnOffMonitor.API.Services;

namespace TurnOffMonitor.API.Endpoints;

public static class MonitorEndpoints
{
    public static void MapMonitorEndpoints(this WebApplication app)
    {
        app.MapGet("/api/temperatures", (HardwareService hardwareService) =>
        {
            var temps = hardwareService.GetTemperatures();
            return Results.Ok(temps);
        });

        app.MapGet("/api/config", (ConfigService configService) =>
        {
            var config = configService.Load();
            return Results.Ok(config);
        });

        app.MapPost("/api/config", (MonitorConfig config, ConfigService configService) =>
        {
            configService.Save(config);
            return Results.Ok(new { message = "Configuración guardada correctamente" });
        });

        app.MapPost("/api/monitor/start", (MonitorService monitorService) =>
        {
            monitorService.StartMonitoring();
            return Results.Ok(new { message = "Monitoreo iniciado", isMonitoring = true });
        });

        app.MapPost("/api/monitor/stop", (MonitorService monitorService) =>
        {
            monitorService.StopMonitoring();
            return Results.Ok(new { message = "Monitoreo detenido", isMonitoring = false });
        });

        app.MapGet("/api/monitor/status", (MonitorService monitorService) =>
        {
            return Results.Ok(new { isMonitoring = monitorService.IsMonitoring });
        });
    }
}
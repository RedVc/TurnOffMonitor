using System.Runtime.InteropServices;
using Serilog;
using TurnOffMonitor.API.Config;
using TurnOffMonitor.API.Endpoints;
using TurnOffMonitor.API.Services;
using Microsoft.AspNetCore.SpaServices.Extensions;

[DllImport("kernel32.dll")]
static extern IntPtr GetConsoleWindow();

[DllImport("user32.dll")]
static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

var consoleWindow = GetConsoleWindow();
if (consoleWindow != IntPtr.Zero)
    ShowWindow(consoleWindow, 0);

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File(
        path: "logs/turnoffmonitor-.txt",
        rollingInterval: RollingInterval.Day,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level:u3}] {Message:lj}{NewLine}{Exception}"
    )
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Services.AddOpenApi();

builder.Services.AddSingleton<ConfigService>();
builder.Services.AddSingleton<HardwareService>();
builder.Services.AddSingleton<MonitorService>();
builder.Services.AddHostedService(provider => provider.GetRequiredService<MonitorService>());

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "https://localhost:5173",
            "http://localhost:5000",
            "https://localhost:7151"
        )
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

builder.Services.AddSpaStaticFiles(config =>
{
    config.RootPath = "wwwroot";
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("ReactApp");

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapMonitorEndpoints();

app.UseSpa(spa =>
{
    spa.Options.SourcePath = "wwwroot";
});

app.Run();
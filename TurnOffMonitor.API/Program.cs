using Serilog;
using TurnOffMonitor.API.Config;
using TurnOffMonitor.API.Endpoints;
using TurnOffMonitor.API.Services;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File(
        path: "logs/turnoffmonitor-.txt",
        rollingInterval: RollingInterval.Day,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level:u3}] {Message:lj}{NewLine}{Exception}"
    )
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

if (!System.Security.Principal.WindowsIdentity.GetCurrent().Owner!
    .IsWellKnown(System.Security.Principal.WellKnownSidType.BuiltinAdministratorsSid))
{
    Log.Warning("La app no está corriendo como administrador. Algunos sensores pueden no funcionar.");
}

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
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("ReactApp");

app.MapMonitorEndpoints();

app.Run();
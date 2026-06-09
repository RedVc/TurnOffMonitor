namespace TurnOffMonitor.API.Models;

public class MonitorConfig
{
    public float CpuThreshold { get; set; } = 50;
    public float GpuThreshold { get; set; } = 50;
}
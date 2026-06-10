namespace TurnOffMonitor.API.Models;

public class MonitorConfig
{
    public float CpuThreshold { get; set; } = 50;
    public float GpuThreshold { get; set; } = 50;
    public string CpuBrand { get; set; } = "AMD";
    public string CpuSensorType { get; set; } = "general";
    public string CpuSensorName { get; set; } = "";
    public string GpuSensorName { get; set; } = "";
}
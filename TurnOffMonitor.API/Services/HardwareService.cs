using LibreHardwareMonitor.Hardware;
using TurnOffMonitor.API.Models;

namespace TurnOffMonitor.API.Services;

public class HardwareService
{
    private readonly Computer _computer;

    public HardwareService()
    {
        _computer = new Computer
        {
            IsCpuEnabled = true,
            IsGpuEnabled = true
        };
        _computer.Open();

        // Dar tiempo a LibreHardwareMonitor para inicializar los sensores
        Thread.Sleep(2000);

        foreach (var hardware in _computer.Hardware)
            hardware.Update();
    }

    public TemperatureReading GetTemperatures(MonitorConfig config)
    {
        var reading = new TemperatureReading();

        foreach (var hardware in _computer.Hardware)
        {
            hardware.Update();

            if (hardware.HardwareType == HardwareType.Cpu)
                reading.CpuTemperature = GetCpuTemp(hardware, config);

            if (hardware.HardwareType == HardwareType.GpuNvidia ||
                hardware.HardwareType == HardwareType.GpuAmd ||
                hardware.HardwareType == HardwareType.GpuIntel)
            {
                foreach (var sensor in hardware.Sensors)
                {
                    if (sensor.SensorType != SensorType.Temperature ||
                        sensor.Name != "GPU Core" ||
                        sensor.Value == null) continue;

                    if (string.IsNullOrEmpty(config.GpuSensorName))
                    {
                        if (hardware.HardwareType == HardwareType.GpuNvidia)
                            reading.GpuTemperature = sensor.Value.Value;
                    }
                    else if (hardware.Name == config.GpuSensorName)
                    {
                        reading.GpuTemperature = sensor.Value.Value;
                    }
                }
            }
        }

        return reading;
    }

    private float GetCpuTemp(IHardware hardware, MonitorConfig config)
    {
        var sensors = hardware.Sensors
            .Where(s => s.SensorType == SensorType.Temperature && s.Value != null && s.Value > 0)
            .ToList();

        if (!sensors.Any()) return 0;

        if (config.CpuSensorType == "specific" && !string.IsNullOrEmpty(config.CpuSensorName))
        {
            var specific = sensors.FirstOrDefault(s => s.Name == config.CpuSensorName);
            return specific?.Value ?? 0;
        }

        var generalName = config.CpuBrand == "Intel" ? "CPU Package" : "Core (Tctl/Tdie)";
        var general = sensors.FirstOrDefault(s => s.Name == generalName);
        return general?.Value ?? sensors.First().Value ?? 0;
    }

    public string GetCpuName()
    {
        foreach (var hardware in _computer.Hardware)
        {
            if (hardware.HardwareType == HardwareType.Cpu)
                return hardware.Name;
        }
        return "CPU Desconocido";
    }

    public string GetCpuBrand()
    {
        var name = GetCpuName().ToUpper();
        return name.Contains("INTEL") ? "Intel" : "AMD";
    }

    public List<string> GetCpuSensorNames()
    {
        foreach (var hardware in _computer.Hardware)
        {
            if (hardware.HardwareType == HardwareType.Cpu)
            {
                hardware.Update();
                return hardware.Sensors
                    .Where(s => s.SensorType == SensorType.Temperature && s.Value != null && s.Value > 0)
                    .Select(s => s.Name)
                    .ToList();
            }
        }
        return new List<string>();
    }

    public List<SensorReading> GetCpuSensorReadings()
    {
        foreach (var hardware in _computer.Hardware)
        {
            if (hardware.HardwareType == HardwareType.Cpu)
            {
                hardware.Update();

                return hardware.Sensors
                    .Where(s => s.SensorType == SensorType.Temperature && s.Value != null && s.Value > 0)
                    .Select(s => new SensorReading { Name = s.Name, Temperature = s.Value ?? 0 })
                    .ToList();
            }
        }
        return new List<SensorReading>();
    }

    public List<SensorReading> GetGpuSensorReadings()
    {
        var result = new List<SensorReading>();

        foreach (var hardware in _computer.Hardware)
        {
            if (hardware.HardwareType == HardwareType.GpuNvidia ||
                hardware.HardwareType == HardwareType.GpuAmd ||
                hardware.HardwareType == HardwareType.GpuIntel)
            {
                hardware.Update();
                var coreSensor = hardware.Sensors
                    .FirstOrDefault(s => s.SensorType == SensorType.Temperature &&
                                         s.Name == "GPU Core" &&
                                         s.Value != null);

                if (coreSensor != null)
                    result.Add(new SensorReading
                    {
                        Name = hardware.Name,
                        Temperature = coreSensor.Value ?? 0
                    });
            }
        }

        return result;
    }
}
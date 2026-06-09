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
    }

    public TemperatureReading GetTemperatures()
    {
        var reading = new TemperatureReading();

        foreach (var hardware in _computer.Hardware)
        {
            hardware.Update();

            foreach (var sensor in hardware.Sensors)
            {
                if (sensor.SensorType != SensorType.Temperature || sensor.Value == null || sensor.Value == 0)
                    continue;

                if (hardware.HardwareType == HardwareType.Cpu && reading.CpuTemperature == 0)
                    reading.CpuTemperature = sensor.Value.Value;

                if (hardware.HardwareType == HardwareType.GpuNvidia && sensor.Name == "GPU Core")
                    reading.GpuTemperature = sensor.Value.Value;
            }
        }

        return reading;
    }
}
import { useState, useEffect } from "react";
import { Thermometer, Power, PowerOff, Cpu, Monitor } from "lucide-react";

const API = "https://localhost:7151";

interface Temperatures {
  cpuTemperature: number;
  gpuTemperature: number;
}

interface Config {
  cpuThreshold: number;
  gpuThreshold: number;
  cpuBrand: string;
  cpuSensorType: string;
  cpuSensorName: string;
}

interface HardwareInfo {
  cpuName: string;
  cpuBrand: string;
}

interface SensorReading {
  name: string;
  temperature: number;
}

function getColor(temp: number, threshold: number) {
  return temp >= threshold ? "text-red-400" : temp >= threshold * 0.85 ? "text-yellow-400" : "text-green-400";
}

function getBar(temp: number, threshold: number) {
  return temp >= threshold ? "bg-red-500" : temp >= threshold * 0.85 ? "bg-yellow-500" : "bg-green-500";
}

export default function App() {
  const [temps, setTemps] = useState<Temperatures>({ cpuTemperature: 0, gpuTemperature: 0 });
  const [config, setConfig] = useState<Config>({ cpuThreshold: 50, gpuThreshold: 50, cpuBrand: "AMD", cpuSensorType: "general", cpuSensorName: "" });
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo>({ cpuName: "Detectando...", cpuBrand: "AMD" });
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [cpuInput, setCpuInput] = useState("50");
  const [gpuInput, setGpuInput] = useState("50");
  const [cpuSensorType, setCpuSensorType] = useState("general");
  const [cpuSensorName, setCpuSensorName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/hardware/info`)
      .then(r => r.json())
      .then((info: HardwareInfo) => setHardwareInfo(info))
      .catch(() => {});

    fetch(`${API}/api/config`)
      .then(r => r.json())
      .then((c: Config) => {
        setConfig(c);
        setCpuInput(c.cpuThreshold.toString());
        setGpuInput(c.gpuThreshold.toString());
        setCpuSensorType(c.cpuSensorType);
        setCpuSensorName(c.cpuSensorName);
      })
      .catch(() => {});

    fetch(`${API}/api/monitor/status`)
      .then(r => r.json())
      .then(d => setIsMonitoring(d.isMonitoring))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = () => {
      fetch(`${API}/api/temperatures`)
        .then(r => r.json())
        .then(setTemps)
        .catch(() => {});

      fetch(`${API}/api/hardware/cpu-sensor-readings`)
        .then(r => r.json())
        .then((readings: SensorReading[]) => setSensorReadings(readings))
        .catch(() => {});
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const saveConfig = async () => {
    const newConfig = {
      cpuThreshold: parseFloat(cpuInput),
      gpuThreshold: parseFloat(gpuInput),
      cpuBrand: hardwareInfo.cpuBrand,
      cpuSensorType,
      cpuSensorName: cpuSensorType === "specific" ? cpuSensorName : ""
    };
    await fetch(`${API}/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig)
    });
    setConfig(newConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleMonitor = async () => {
    const endpoint = isMonitoring ? "stop" : "start";
    await fetch(`${API}/api/monitor/${endpoint}`, { method: "POST" });
    setIsMonitoring(!isMonitoring);
  };

  const isSelected = (type: string, name: string) =>
    cpuSensorType === type && (type === "general" || cpuSensorName === name);

  const canChangeSensor = sensorReadings.length > 1;

  const sensorItems = [
    { type: "general", name: "", label: "General", temperature: sensorReadings[0]?.temperature ?? 0 },
    ...sensorReadings.slice(1).map(s => ({ type: "specific", name: s.name, label: s.name, temperature: s.temperature }))
  ];

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Thermometer className="text-blue-400" size={28} />
            <h1 className="text-2xl font-bold tracking-tight">TurnOff Monitor</h1>
            <span className={`ml-auto text-xs px-3 py-1 rounded-full font-medium ${isMonitoring ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-400"}`}>
              {isMonitoring ? "Monitoreando" : "Inactivo"}
            </span>
          </div>
          <div className="flex items-center gap-2 pl-9">
            <Cpu size={13} className="text-zinc-500" />
            <span className="text-xs text-zinc-500">{hardwareInfo.cpuName}</span>
          </div>
        </div>

        {/* CPU + Sensores */}
        <div className="bg-zinc-800 rounded-2xl p-6 flex gap-6">
          {/* Temp CPU */}
          <div className="flex flex-col gap-4 min-w-[160px]">
            <div className="flex items-center gap-2 text-zinc-400">
              <Cpu size={16} />
              <span className="text-sm font-medium uppercase tracking-widest">CPU</span>
            </div>
            <div className={`text-5xl font-bold ${getColor(temps.cpuTemperature, config.cpuThreshold)}`}>
              {temps.cpuTemperature.toFixed(1)}°C
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getBar(temps.cpuTemperature, config.cpuThreshold)}`}
                style={{ width: `${Math.min((temps.cpuTemperature / 100) * 100, 100)}%` }}
              />
            </div>
            <div className="text-zinc-500 text-xs">Umbral: {config.cpuThreshold}°C</div>
          </div>

          {/* Divisor */}
          <div className="w-px bg-zinc-700 self-stretch" />

          {/* Lista de sensores */}
          <div className="flex flex-col gap-2 flex-1">
            <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Sensor</span>
            {sensorItems.map(item => (
              <button
                key={item.type + item.name}
                onClick={() => {
                  if (!canChangeSensor) return;
                  setCpuSensorType(item.type);
                  setCpuSensorName(item.name);
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
                  isSelected(item.type, item.name)
                    ? "bg-blue-600/20 border border-blue-500/40"
                    : canChangeSensor
                      ? "bg-zinc-700/50 border border-transparent hover:bg-zinc-700 cursor-pointer"
                      : "bg-zinc-700/30 border border-transparent cursor-default"
                }`}
              >
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                  isSelected(item.type, item.name)
                    ? "border-blue-400 bg-blue-400"
                    : "border-zinc-500"
                }`} />
                <span className="text-sm text-white flex-1">{item.label}</span>
                {item.temperature > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-zinc-600 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${getBar(item.temperature, config.cpuThreshold)}`}
                        style={{ width: `${Math.min((item.temperature / 100) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium w-12 text-right ${getColor(item.temperature, config.cpuThreshold)}`}>
                      {item.temperature.toFixed(1)}°C
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* GPU */}
        <div className="bg-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <Monitor size={16} />
            <span className="text-sm font-medium uppercase tracking-widest">GPU</span>
          </div>
          <div className={`text-5xl font-bold ${getColor(temps.gpuTemperature, config.gpuThreshold)}`}>
            {temps.gpuTemperature.toFixed(1)}°C
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getBar(temps.gpuTemperature, config.gpuThreshold)}`}
              style={{ width: `${Math.min((temps.gpuTemperature / 100) * 100, 100)}%` }}
            />
          </div>
          <div className="text-zinc-500 text-xs">Umbral: {config.gpuThreshold}°C</div>
        </div>

        {/* Umbrales */}
        <div className="bg-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
          <p className="text-sm text-zinc-400 font-medium uppercase tracking-widest">Umbrales de apagado</p>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-zinc-500">CPU (°C)</label>
              <input
                type="number"
                value={cpuInput}
                onChange={e => setCpuInput(e.target.value)}
                className="bg-zinc-700 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-zinc-500">GPU (°C)</label>
              <input
                type="number"
                value={gpuInput}
                onChange={e => setGpuInput(e.target.value)}
                className="bg-zinc-700 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={saveConfig}
            className="bg-blue-600 hover:bg-blue-500 transition-colors rounded-lg py-2 text-sm font-medium"
          >
            {saved ? "✓ Guardado" : "Guardar configuración"}
          </button>
        </div>

        {/* Botón monitoreo */}
        <button
          onClick={toggleMonitor}
          className={`flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-sm transition-colors ${
            isMonitoring
              ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
              : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
          }`}
        >
          {isMonitoring ? <><PowerOff size={18} /> Detener monitoreo</> : <><Power size={18} /> Iniciar monitoreo</>}
        </button>

      </div>
    </div>
  );
}
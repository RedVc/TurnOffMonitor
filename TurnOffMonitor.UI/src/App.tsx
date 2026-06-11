import { useState, useEffect } from "react";
import { Power, PowerOff, Cpu, Monitor } from "lucide-react";
import iconImg from "./assets/icon.png";

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
  gpuSensorName: string;
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
  return temp >= threshold ? "text-pink-400" : temp >= threshold * 0.85 ? "text-yellow-300" : "text-cyan-400";
}

function getBar(temp: number, threshold: number) {
  return temp >= threshold ? "bg-pink-500" : temp >= threshold * 0.85 ? "bg-yellow-400" : "bg-cyan-400";
}

function SensorPanel({ readings, selectedName, canChange, threshold, onSelect }: {
  readings: SensorReading[];
  selectedName: string;
  canChange: boolean;
  threshold: number;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {readings.map(item => (
        <button
          key={item.name}
          onClick={() => { if (canChange) onSelect(item.name); }}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
            selectedName === item.name || (!selectedName && item === readings[0])
              ? "bg-purple-900/40 border border-purple-500/60"
              : canChange
                ? "bg-purple-900/20 border border-purple-800/30 hover:bg-purple-900/40 cursor-pointer"
                : "bg-purple-900/10 border border-transparent cursor-default"
          }`}
        >
          <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
            selectedName === item.name || (!selectedName && item === readings[0])
              ? "border-cyan-400 bg-cyan-400"
              : "border-purple-500"
          }`} />
          <span className="text-sm text-purple-100 flex-1 truncate">{item.name}</span>
          {item.temperature > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-12 bg-purple-900 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${getBar(item.temperature, threshold)}`}
                  style={{ width: `${Math.min((item.temperature / 100) * 100, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium w-12 text-right ${getColor(item.temperature, threshold)}`}>
                {item.temperature.toFixed(1)}°C
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [temps, setTemps] = useState<Temperatures>({ cpuTemperature: 0, gpuTemperature: 0 });
  const [config, setConfig] = useState<Config>({ cpuThreshold: 50, gpuThreshold: 50, cpuBrand: "AMD", cpuSensorType: "general", cpuSensorName: "", gpuSensorName: "" });
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo>({ cpuName: "Detectando...", cpuBrand: "AMD" });
  const [cpuSensorReadings, setCpuSensorReadings] = useState<SensorReading[]>([]);
  const [gpuSensorReadings, setGpuSensorReadings] = useState<SensorReading[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [cpuInput, setCpuInput] = useState("50");
  const [gpuInput, setGpuInput] = useState("50");
  const [cpuSensorType, setCpuSensorType] = useState("general");
  const [cpuSensorName, setCpuSensorName] = useState("");
  const [gpuSensorName, setGpuSensorName] = useState("");
  const [saved, setSaved] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBackend = () => {
      fetch(`${API}/api/monitor/status`)
        .then(r => r.json())
        .then(() => setBackendOnline(true))
        .catch(() => setBackendOnline(false));
    };
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (backendOnline !== true) return;
    fetch(`${API}/api/hardware/info`).then(r => r.json()).then((info: HardwareInfo) => setHardwareInfo(info)).catch(() => {});
    fetch(`${API}/api/config`).then(r => r.json()).then((c: Config) => {
      setConfig(c);
      setCpuInput(c.cpuThreshold.toString());
      setGpuInput(c.gpuThreshold.toString());
      setCpuSensorType(c.cpuSensorType);
      setCpuSensorName(c.cpuSensorName);
      setGpuSensorName(c.gpuSensorName);
    }).catch(() => {});
    fetch(`${API}/api/monitor/status`).then(r => r.json()).then(d => setIsMonitoring(d.isMonitoring)).catch(() => {});
  }, [backendOnline]);

  useEffect(() => {
    if (backendOnline !== true) return;
    const fetchData = () => {
      fetch(`${API}/api/temperatures`).then(r => r.json()).then(setTemps).catch(() => {});
      fetch(`${API}/api/hardware/cpu-sensor-readings`).then(r => r.json()).then((readings: SensorReading[]) => setCpuSensorReadings(readings)).catch(() => {});
      fetch(`${API}/api/hardware/gpu-sensor-readings`).then(r => r.json()).then((readings: SensorReading[]) => setGpuSensorReadings(readings)).catch(() => {});
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [backendOnline]);

  const saveConfig = async () => {
    const newConfig = {
      cpuThreshold: parseFloat(cpuInput),
      gpuThreshold: parseFloat(gpuInput),
      cpuBrand: hardwareInfo.cpuBrand,
      cpuSensorType,
      cpuSensorName: cpuSensorType === "specific" ? cpuSensorName : "",
      gpuSensorName
    };
    await fetch(`${API}/api/config`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newConfig) });
    setConfig(newConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleMonitor = async () => {
    const endpoint = isMonitoring ? "stop" : "start";
    await fetch(`${API}/api/monitor/${endpoint}`, { method: "POST" });
    setIsMonitoring(!isMonitoring);
  };

  const isCpuSelected = (name: string) =>
    name === "General" ? cpuSensorType === "general" : cpuSensorType === "specific" && cpuSensorName === name;

  const cpuSensorItems: SensorReading[] = [
    { name: "General", temperature: cpuSensorReadings[0]?.temperature ?? 0 },
    ...cpuSensorReadings.slice(1)
  ];

  if (backendOnline === null) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center gap-4" style={{ background: "linear-gradient(180deg, #0d0221 0%, #1a0533 60%, #3d1066 100%)" }}>
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-purple-300 text-sm tracking-widest uppercase">Conectando...</p>
      </div>
    );
  }

  if (backendOnline === false) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center gap-6" style={{ background: "linear-gradient(180deg, #0d0221 0%, #1a0533 60%, #3d1066 100%)" }}>
        <div className="rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4" style={{ background: "rgba(26,5,51,0.9)", border: "1px solid rgba(180,0,255,0.4)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,45,120,0.2)" }}>
            <PowerOff size={24} className="text-pink-400" />
          </div>
          <h2 className="text-lg font-semibold text-cyan-300 tracking-widest uppercase">Backend offline</h2>
          <p className="text-purple-300 text-sm text-center">El servicio de monitoreo no está corriendo. Inicia el backend e intenta de nuevo.</p>
          <button
            onClick={() => { setBackendOnline(null); fetch(`${API}/api/monitor/status`).then(() => setBackendOnline(true)).catch(() => setBackendOnline(false)); }}
            className="w-full py-2 text-sm font-medium tracking-widest uppercase transition-colors rounded-lg"
            style={{ background: "linear-gradient(90deg, #b400ff, #ff2d78)", color: "white" }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center p-8"
      style={{ background: "linear-gradient(180deg, #0d0221 0%, #1a0533 60%, #3d1066 100%)" }}>
      <div className="w-full max-w-2xl flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <img src={iconImg} alt="TurnOff Monitor" className="w-16 h-16 rounded-full" />
            <h1 className="text-2xl font-bold tracking-widest " style={{ color: "#00ffe7", textShadow: "0 0 20px rgba(0,255,231,0.5)" }}>
              TurnOff Monitor
            </h1>
            <span className={`ml-auto text-xs px-3 py-1 rounded-full font-medium tracking-widest uppercase ${
              isMonitoring
                ? "text-cyan-300"
                : "text-purple-400"
            }`} style={{
              background: isMonitoring ? "rgba(0,255,231,0.1)" : "rgba(180,0,255,0.1)",
              border: isMonitoring ? "1px solid rgba(0,255,231,0.3)" : "1px solid rgba(180,0,255,0.3)"
            }}>
              {isMonitoring ? "Monitoreando" : "Inactivo"}
            </span>
          </div>
          <div className="flex items-center gap-2 pl-9">
            <Cpu size={13} className="text-purple-400" />
            <span className="text-xs text-purple-400 tracking-widest">{hardwareInfo.cpuName}</span>
          </div>
        </div>

        {/* CPU */}
        <div className="rounded-2xl p-6 flex gap-6" style={{ background: "rgba(26,5,51,0.8)", border: "1px solid rgba(180,0,255,0.3)" }}>
          <div className="flex flex-col gap-4 min-w-[160px]">
            <div className="flex items-center gap-2 text-purple-400">
              <Cpu size={16} />
              <span className="text-sm font-medium uppercase tracking-widest">CPU</span>
            </div>
            <div className={`text-5xl font-bold ${getColor(temps.cpuTemperature, config.cpuThreshold)}`}
              style={{ textShadow: temps.cpuTemperature >= config.cpuThreshold ? "0 0 20px rgba(255,45,120,0.6)" : "0 0 20px rgba(0,255,231,0.4)" }}>
              {temps.cpuTemperature.toFixed(1)}°C
            </div>
            <div className="w-full rounded-full h-2" style={{ background: "rgba(180,0,255,0.2)" }}>
              <div className={`h-2 rounded-full transition-all duration-500 ${getBar(temps.cpuTemperature, config.cpuThreshold)}`}
                style={{ width: `${Math.min((temps.cpuTemperature / 100) * 100, 100)}%` }} />
            </div>
            <div className="text-purple-400 text-xs tracking-widest">Umbral: {config.cpuThreshold}°C</div>
          </div>
          <div className="w-px self-stretch" style={{ background: "rgba(180,0,255,0.3)" }} />
          <div className="flex flex-col gap-2 flex-1">
            <span className="text-xs text-purple-400 uppercase tracking-widest mb-1">Sensor</span>
            {cpuSensorItems.map(item => (
              <button key={item.name}
                onClick={() => {
                  if (cpuSensorReadings.length <= 1) return;
                  if (item.name === "General") { setCpuSensorType("general"); setCpuSensorName(""); }
                  else { setCpuSensorType("specific"); setCpuSensorName(item.name); }
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left"
                style={{
                  background: isCpuSelected(item.name) ? "rgba(180,0,255,0.2)" : "rgba(180,0,255,0.05)",
                  border: isCpuSelected(item.name) ? "1px solid rgba(0,255,231,0.5)" : "1px solid rgba(180,0,255,0.2)",
                  cursor: cpuSensorReadings.length > 1 ? "pointer" : "default"
                }}>
                <div className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                  style={{ borderColor: isCpuSelected(item.name) ? "#00ffe7" : "#b400ff", background: isCpuSelected(item.name) ? "#00ffe7" : "transparent" }} />
                <span className="text-sm text-purple-100 flex-1">{item.name}</span>
                {item.temperature > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-12 rounded-full h-1.5" style={{ background: "rgba(180,0,255,0.3)" }}>
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${getBar(item.temperature, config.cpuThreshold)}`}
                        style={{ width: `${Math.min((item.temperature / 100) * 100, 100)}%` }} />
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
        <div className="rounded-2xl p-6 flex gap-6" style={{ background: "rgba(26,5,51,0.8)", border: "1px solid rgba(255,45,120,0.3)" }}>
          <div className="flex flex-col gap-4 min-w-[160px]">
            <div className="flex items-center gap-2 text-pink-400">
              <Monitor size={16} />
              <span className="text-sm font-medium uppercase tracking-widest">GPU</span>
            </div>
            <div className={`text-5xl font-bold ${getColor(temps.gpuTemperature, config.gpuThreshold)}`}
              style={{ textShadow: temps.gpuTemperature >= config.gpuThreshold ? "0 0 20px rgba(255,45,120,0.6)" : "0 0 20px rgba(0,255,231,0.4)" }}>
              {temps.gpuTemperature.toFixed(1)}°C
            </div>
            <div className="w-full rounded-full h-2" style={{ background: "rgba(255,45,120,0.2)" }}>
              <div className={`h-2 rounded-full transition-all duration-500 ${getBar(temps.gpuTemperature, config.gpuThreshold)}`}
                style={{ width: `${Math.min((temps.gpuTemperature / 100) * 100, 100)}%` }} />
            </div>
            <div className="text-pink-400 text-xs tracking-widest">Umbral: {config.gpuThreshold}°C</div>
          </div>
          <div className="w-px self-stretch" style={{ background: "rgba(255,45,120,0.3)" }} />
          <div className="flex flex-col gap-2 flex-1">
            <span className="text-xs text-pink-400 uppercase tracking-widest mb-1">Tarjeta gráfica</span>
            <SensorPanel
              readings={gpuSensorReadings}
              selectedName={gpuSensorName}
              canChange={gpuSensorReadings.length > 1}
              threshold={config.gpuThreshold}
              onSelect={setGpuSensorName}
            />
          </div>
        </div>

        {/* Umbrales */}
        <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: "rgba(26,5,51,0.8)", border: "1px solid rgba(180,0,255,0.3)" }}>
          <p className="text-sm text-purple-300 font-medium uppercase tracking-widest">Umbrales de apagado</p>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-purple-400 tracking-widest">CPU (°C)</label>
              <input type="number" value={cpuInput} onChange={e => setCpuInput(e.target.value)}
                className="rounded-lg px-4 py-2 text-white text-sm outline-none"
                style={{ background: "rgba(180,0,255,0.15)", border: "1px solid rgba(180,0,255,0.4)" }} />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-pink-400 tracking-widest">GPU (°C)</label>
              <input type="number" value={gpuInput} onChange={e => setGpuInput(e.target.value)}
                className="rounded-lg px-4 py-2 text-white text-sm outline-none"
                style={{ background: "rgba(255,45,120,0.15)", border: "1px solid rgba(255,45,120,0.4)" }} />
            </div>
          </div>
          <button onClick={saveConfig}
            className="py-2 text-sm font-medium tracking-widest uppercase rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(90deg, #b400ff, #ff2d78)", color: "white" }}>
            {saved ? "✓ Guardado" : "Guardar configuración"}
          </button>
        </div>

        {/* Botón monitoreo */}
        <button onClick={toggleMonitor}
          className="flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-sm transition-opacity hover:opacity-90 uppercase tracking-widest"
          style={{
            background: isMonitoring ? "rgba(255,45,120,0.15)" : "rgba(0,255,231,0.1)",
            border: isMonitoring ? "1px solid rgba(255,45,120,0.4)" : "1px solid rgba(0,255,231,0.4)",
            color: isMonitoring ? "#ff6ec7" : "#00ffe7"
          }}>
          {isMonitoring ? <><PowerOff size={18} /> Detener monitoreo</> : <><Power size={18} /> Iniciar monitoreo</>}
        </button>

      </div>
    </div>
  );
}
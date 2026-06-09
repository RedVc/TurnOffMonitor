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
}

function TempCard({ label, icon, temp, threshold }: {
  label: string;
  icon: React.ReactNode;
  temp: number;
  threshold: number;
}) {
  const pct = Math.min((temp / 100) * 100, 100);
  const color = temp >= threshold ? "text-red-400" : temp >= threshold * 0.85 ? "text-yellow-400" : "text-green-400";
  const barColor = temp >= threshold ? "bg-red-500" : temp >= threshold * 0.85 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="bg-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-zinc-400">
        {icon}
        <span className="text-sm font-medium uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-5xl font-bold ${color}`}>
        {temp.toFixed(1)}°C
      </div>
      <div className="w-full bg-zinc-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-zinc-500 text-xs">Umbral: {threshold}°C</div>
    </div>
  );
}

export default function App() {
  const [temps, setTemps] = useState<Temperatures>({ cpuTemperature: 0, gpuTemperature: 0 });
  const [config, setConfig] = useState<Config>({ cpuThreshold: 50, gpuThreshold: 50 });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [cpuInput, setCpuInput] = useState("50");
  const [gpuInput, setGpuInput] = useState("50");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/config`)
      .then(r => r.json())
      .then((c: Config) => {
        setConfig(c);
        setCpuInput(c.cpuThreshold.toString());
        setGpuInput(c.gpuThreshold.toString());
      })
      .catch(() => {});

    fetch(`${API}/api/monitor/status`)
      .then(r => r.json())
      .then(d => setIsMonitoring(d.isMonitoring))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API}/api/temperatures`)
        .then(r => r.json())
        .then(setTemps)
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const saveConfig = async () => {
    const newConfig = {
      cpuThreshold: parseFloat(cpuInput),
      gpuThreshold: parseFloat(gpuInput)
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

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl flex flex-col gap-6">

        <div className="flex items-center gap-3">
          <Thermometer className="text-blue-400" size={28} />
          <h1 className="text-2xl font-bold tracking-tight">TurnOff Monitor</h1>
          <span className={`ml-auto text-xs px-3 py-1 rounded-full font-medium ${isMonitoring ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-400"}`}>
            {isMonitoring ? "Monitoreando" : "Inactivo"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TempCard
            label="CPU"
            icon={<Cpu size={16} />}
            temp={temps.cpuTemperature}
            threshold={config.cpuThreshold}
          />
          <TempCard
            label="GPU"
            icon={<Monitor size={16} />}
            temp={temps.gpuTemperature}
            threshold={config.gpuThreshold}
          />
        </div>

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
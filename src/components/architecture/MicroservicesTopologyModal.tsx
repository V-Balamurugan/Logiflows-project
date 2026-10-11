import React, { useState } from 'react';
import { 
  X, 
  Server, 
  Database, 
  Cpu, 
  Network, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ShieldCheck,
  RefreshCw,
  GitBranch
} from 'lucide-react';
import { storage } from '../../services/storage';
import { MicroserviceNode } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MicroservicesTopologyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [nodes, setNodes] = useState<MicroserviceNode[]>(() => storage.getMicroservices());

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    storage.toggleMicroserviceStatus(id);
    setNodes(storage.getMicroservices());
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'DATABASE':
        return <Database className="w-5 h-5 text-cyan-400" />;
      case 'CACHE':
        return <Cpu className="w-5 h-5 text-rose-400" />;
      case 'ML_INFERENCE':
        return <Activity className="w-5 h-5 text-purple-400" />;
      case 'GEOSPATIAL':
        return <Network className="w-5 h-5 text-emerald-400" />;
      case 'EVENT_BUS':
        return <GitBranch className="w-5 h-5 text-amber-400" />;
      default:
        return <Server className="w-5 h-5 text-indigo-400" />;
    }
  };

  const totalRps = nodes.reduce((acc, curr) => acc + curr.requestsPerSec, 0);
  const avgLatency = Math.round(nodes.reduce((acc, curr) => acc + curr.latencyMs, 0) / nodes.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Scalable Microservices & Cloud-Native Topology Mesh
              </h3>
              <p className="text-xs text-slate-400">
                Go Authoritative Backend · PostgreSQL 16 PostGIS · Redis 7 Telemetry · FastAPI ML
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executive Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-3 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
              Cluster Throughput
            </span>
            <span className="font-mono text-sm font-bold text-slate-200">
              {totalRps.toLocaleString()} req/s
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
              Internal P99 Latency
            </span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              {avgLatency} ms
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
              Microservices Replicas
            </span>
            <span className="font-mono text-sm font-bold text-indigo-300">
              19 active pods
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
              Database Cluster
            </span>
            <span className="font-mono text-sm font-bold text-cyan-400">
              Primary + 2 Read Replicas
            </span>
          </div>
        </div>

        {/* Microservices Nodes Grid */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Mesh Nodes & Service Boundaries
            </span>
            <span className="text-xs text-slate-500">
              Click node action to simulate container health failover
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nodes.map((node) => {
              const isHealthy = node.status === 'HEALTHY';
              return (
                <div
                  key={node.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isHealthy
                      ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      : 'bg-rose-950/20 border-rose-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        {getIconForType(node.serviceType)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100 font-mono">
                          {node.name}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {node.technology}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isHealthy
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {node.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Latency</span>
                      <span className={node.latencyMs > 50 ? 'text-rose-400' : 'text-slate-200'}>
                        {node.latencyMs}ms
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">RPS</span>
                      <span className="text-slate-200">{node.requestsPerSec}/s</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Uptime</span>
                      <span className="text-emerald-400">{node.uptimePct}%</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-800/40 text-[11px]">
                    <span className="text-slate-500 font-mono">
                      Instances: {node.instancesCount} | Ver: {node.version}
                    </span>
                    <button
                      onClick={() => handleToggle(node.id)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                    >
                      {isHealthy ? 'Simulate Degradation' : 'Restore Healthy Pod'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Architectural Notes */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Multi-Tenant Scalability & Isolation Guarantee</span>
            </div>
            <p className="leading-relaxed">
              Every logistics tenant maintains logically partitioned schemas in PostgreSQL 16 PostGIS with Row-Level Security (RLS) policies. Telemetry from vehicles is ingested through stateless Redis Pub/Sub workers, offloading write pressure from relational storage. The Python FastAPI RandomForest service operates asynchronously, ensuring operational parcel booking never blocks if predictive intelligence is unavailable.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <span className="text-xs text-slate-400 font-mono">
            KUBERNETES INGRESS: CADDY REVERSE PROXY / PORT 3000
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Fuel, 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Search, 
  Filter, 
  Sliders, 
  Truck, 
  User, 
  Star, 
  Leaf, 
  CheckCircle2, 
  ShieldCheck, 
  Eye, 
  X, 
  Printer, 
  BarChart3, 
  ArrowUpRight,
  BatteryCharging
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell 
} from 'recharts';
import { 
  driverPerformanceService, 
  CourierPerformanceData, 
  LeaderboardSortOption, 
  TimeframeFilter 
} from '../../services/driverPerformanceService';
import { storage } from '../../services/storage';

export const DriverPerformanceLeaderboard: React.FC = () => {
  const currentTenantId = storage.getActiveTenantId();

  const [sortOption, setSortOption] = useState<LeaderboardSortOption>('COMPOSITE');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('THIS_MONTH');
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'ELECTRIC_ONLY' | 'COMBUSTION_ONLY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<CourierPerformanceData | null>(null);
  const [showChart, setShowChart] = useState(true);

  // Calculate leaderboard data
  const { drivers, fleetAverages } = useMemo(() => {
    return driverPerformanceService.calculateLeaderboard(
      currentTenantId,
      sortOption,
      timeframe,
      vehicleFilter
    );
  }, [currentTenantId, sortOption, timeframe, vehicleFilter]);

  // Filtered by search
  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    const q = searchQuery.toLowerCase();
    return drivers.filter(d => 
      d.courierName.toLowerCase().includes(q) ||
      d.assignedVehicleNumber.toLowerCase().includes(q) ||
      d.branchName.toLowerCase().includes(q)
    );
  }, [drivers, searchQuery]);

  // Chart data for top 6 drivers
  const chartData = useMemo(() => {
    return drivers.slice(0, 6).map(d => ({
      name: d.courierName.split(' ')[0],
      fullName: d.courierName,
      ecoScore: d.averageEcoScore,
      onTimePct: d.onTimeDeliveryPct,
      composite: d.compositeScore,
      vehicle: d.assignedVehicleNumber
    }));
  }, [drivers]);

  // Top 3 for podium
  const topThree = drivers.slice(0, 3);
  const podiumOrder = [
    topThree[1], // 2nd place (left)
    topThree[0], // 1st place (center)
    topThree[2], // 3rd place (right)
  ].filter(Boolean);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-0.5">
            DRIVER TELEMETRY INTELLIGENCE · ECO-EFFICIENCY & PUNCTUALITY LEADERBOARD
          </span>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Driver Performance & Fuel Efficiency Leaderboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Honoring fleet couriers combining optimal kilowatt/liter efficiency with outstanding SLA on-time arrival records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowChart(!showChart)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700/60"
          >
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>{showChart ? 'Hide Telemetry Chart' : 'Show Telemetry Chart'}</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Export Fleet Report</span>
          </button>
        </div>
      </div>

      {/* Fleet Benchmarks Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Fleet Average Eco-Score */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Fleet Fuel Eco-Score</span>
            <Fuel className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-100">
              {fleetAverages.averageEcoScore}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100 Index</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${fleetAverages.averageEcoScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Weighted across {drivers.length} active couriers
          </p>
        </div>

        {/* KPI 2: On-Time Arrival Average */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Fleet On-Time Arrival</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-blue-400">
              {fleetAverages.averageOnTimePct}%
            </span>
            <span className="text-xs text-slate-400 font-semibold">SLA Punctuality</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${fleetAverages.averageOnTimePct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {fleetAverages.totalDeliveries.toLocaleString()} completed deliveries
          </p>
        </div>

        {/* KPI 3: Carbon Offset Saved */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">CO₂ Emissions Saved</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-emerald-400">
              {fleetAverages.totalCo2SavedKg}
            </span>
            <span className="text-xs text-slate-400 font-mono">kg CO₂</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Eco-driving & EV transit vs diesel baseline
          </p>
        </div>

        {/* KPI 4: Top Performer */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Fleet Champion (#1)</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5 truncate">
            <span className="text-lg font-bold text-slate-100 truncate">
              {fleetAverages.topPerformer?.courierName || 'Unassigned'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">{fleetAverages.topPerformer?.compositeScore}%</span>
            <span>·</span>
            <span>Eco {fleetAverages.topPerformer?.averageEcoScore}</span>
            <span>·</span>
            <span>OTD {fleetAverages.topPerformer?.onTimeDeliveryPct}%</span>
          </div>
        </div>
      </div>

      {/* Podium Spotlight: Top 3 Drivers */}
      {podiumOrder.length >= 3 && (
        <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800 space-y-5">
          <div className="text-center max-w-md mx-auto">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
              PODIUM OF HONOR
            </span>
            <h3 className="text-base font-bold text-slate-100">
              Apex Fleet Top-3 High Efficiency Couriers
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
            {podiumOrder.map((driver) => {
              const isFirst = driver.rank === 1;
              const isSecond = driver.rank === 2;
              const isThird = driver.rank === 3;

              const borderGlow = isFirst 
                ? 'border-amber-400/50 shadow-lg shadow-amber-500/10 bg-slate-900/95 ring-1 ring-amber-400/30' 
                : isSecond
                ? 'border-slate-400/40 bg-slate-900/80'
                : 'border-amber-700/40 bg-slate-900/80';

              const rankBadgeColor = isFirst
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                : isSecond
                ? 'bg-slate-300 text-slate-900'
                : 'bg-amber-700 text-amber-100';

              return (
                <div
                  key={driver.courierId}
                  onClick={() => setSelectedDriver(driver)}
                  className={`relative p-5 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer ${borderGlow} ${
                    isFirst ? 'md:-translate-y-3' : ''
                  }`}
                >
                  {/* Rank Badge Crown */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`w-8 h-8 rounded-full font-mono font-black text-sm flex items-center justify-center ${rankBadgeColor}`}>
                      #{driver.rank}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {isFirst ? '🏆 CHAMPION' : isSecond ? '🥈 RUNNER-UP' : '🥉 3RD PLACE'}
                    </span>
                  </div>

                  {/* Driver Name & Unit */}
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-100">
                      {driver.courierName}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {driver.assignedVehicleNumber} · {driver.assignedVehicleType.replace(/_/g, ' ')}
                    </p>
                  </div>

                  {/* Dual Primary Metrics */}
                  <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Fuel Eco-Score</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-mono text-lg font-bold text-emerald-400">
                          {driver.averageEcoScore}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">/100</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {driver.efficiencyVsBaselinePct}% vs base
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">On-Time Rate</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-mono text-lg font-bold text-blue-400">
                          {driver.onTimeDeliveryPct}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {driver.onTimeDeliveries} on-time
                      </span>
                    </div>
                  </div>

                  {/* Composite Rating Progress */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Composite Score:</span>
                      <span className="font-mono font-bold text-amber-400">{driver.compositeScore} / 100</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          isFirst ? 'bg-amber-400' : isSecond ? 'bg-slate-300' : 'bg-amber-600'
                        }`}
                        style={{ width: `${driver.compositeScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Click CTA */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
                    <span>Inspect Driver Logs</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Comparison Chart: Fuel Eco-Score vs On-Time Delivery % */}
      {showChart && (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Leaderboard Telemetry: Fuel Eco-Score vs On-Time Delivery %</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparison of top fleet operators combining throttle efficiency with strict delivery SLA adherence.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-300">Fuel Eco-Score</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-slate-300">On-Time Delivery %</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false}
                />
                <YAxis 
                  domain={[70, 100]} 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '0.75rem', 
                    fontSize: '12px' 
                  }}
                  formatter={(val: any, name: any) => {
                    if (name === 'ecoScore') return [`${val} / 100`, 'Fuel Eco-Score'];
                    if (name === 'onTimePct') return [`${val}%`, 'On-Time Arrival %'];
                    return [val, name];
                  }}
                  labelFormatter={(name) => {
                    const match = chartData.find(c => c.name === name);
                    return match ? `${match.fullName} (${match.vehicle})` : name;
                  }}
                />
                <Bar dataKey="ecoScore" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="onTimePct" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Control Bar: Sorting, Timeframe, Search */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Segmented Sort Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg overflow-x-auto text-xs">
            {[
              { id: 'COMPOSITE', label: 'Overall Composite' },
              { id: 'FUEL_EFFICIENCY', label: 'Fuel Eco-Score' },
              { id: 'ON_TIME_PCT', label: 'On-Time Delivery %' },
              { id: 'TOTAL_DELIVERIES', label: 'Total Volume' },
              { id: 'CO2_SAVINGS', label: 'CO₂ Offset' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSortOption(tab.id as LeaderboardSortOption)}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  sortOption === tab.id
                    ? 'bg-slate-800 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg text-xs">
            {[
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'ALL_TIME', label: 'All-Time' }
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id as TimeframeFilter)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  timeframe === tf.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Powertrain:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg text-[11px]">
              {[
                { id: 'ALL', label: 'All Fleets' },
                { id: 'ELECTRIC_ONLY', label: 'Electric Only' },
                { id: 'COMBUSTION_ONLY', label: 'Diesel / Gas' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setVehicleFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    vehicleFilter === f.id
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search driver, unit, hub..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-16 text-center">Rank</th>
                <th className="p-3.5">Courier & Branch</th>
                <th className="p-3.5">Assigned Fleet Unit</th>
                <th className="p-3.5">Fuel Eco-Score</th>
                <th className="p-3.5">On-Time Arrival</th>
                <th className="p-3.5">Deliveries</th>
                <th className="p-3.5">CO₂ Offset</th>
                <th className="p-3.5">Rating</th>
                <th className="p-3.5 text-right">Composite</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredDrivers.map((driver) => {
                const isChampion = driver.rank === 1;
                const isRunnerUp = driver.rank === 2;
                const isThird = driver.rank === 3;

                return (
                  <tr 
                    key={driver.courierId} 
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedDriver(driver)}
                  >
                    {/* Rank & Delta */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                          isChampion 
                            ? 'bg-amber-400 text-slate-950 font-black' 
                            : isRunnerUp 
                            ? 'bg-slate-300 text-slate-950 font-bold' 
                            : isThird 
                            ? 'bg-amber-700 text-amber-100 font-bold' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          #{driver.rank}
                        </span>
                        {driver.rankDelta > 0 ? (
                          <span title={`Up ${driver.rankDelta} positions`}>
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </span>
                        ) : driver.rankDelta < 0 ? (
                          <span title={`Down ${Math.abs(driver.rankDelta)} positions`}>
                            <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          </span>
                        ) : (
                          <Minus className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Courier Name & Hub */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {driver.avatarInitials}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-100 block">
                            {driver.courierName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-sans block">
                            {driver.branchName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-slate-200">
                        {driver.fuelType === 'ELECTRIC' ? (
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="font-bold">{driver.assignedVehicleNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans block">
                        {driver.assignedVehicleType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Fuel Eco-Score */}
                    <td className="p-3.5">
                      <div className="space-y-1 w-32">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="font-mono font-bold text-emerald-400">
                            {driver.averageEcoScore} / 100
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {driver.efficiencyVsBaselinePct <= 0 ? `${driver.efficiencyVsBaselinePct}%` : `+${driver.efficiencyVsBaselinePct}%`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${driver.averageEcoScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* On-Time Arrival % */}
                    <td className="p-3.5">
                      <div className="space-y-1 w-28">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="font-mono font-bold text-blue-400">
                            {driver.onTimeDeliveryPct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${driver.onTimeDeliveryPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Deliveries Count */}
                    <td className="p-3.5 font-mono text-slate-300">
                      {driver.totalDeliveries.toLocaleString()}
                    </td>

                    {/* CO2 Offset */}
                    <td className="p-3.5 font-mono text-emerald-400 font-medium">
                      {driver.co2SavedKg} kg
                    </td>

                    {/* Rating */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1 text-slate-200 font-mono font-semibold">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>{driver.rating.toFixed(2)}</span>
                      </div>
                    </td>

                    {/* Composite Score */}
                    <td className="p-3.5 text-right font-mono">
                      <span className="text-base font-bold text-slate-100">
                        {driver.compositeScore}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDriver(driver);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Drilldown Performance Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono font-black text-lg flex items-center justify-center">
                  {selectedDriver.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-100">
                      {selectedDriver.courierName}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Rank #{selectedDriver.rank}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedDriver.branchName} · Unit {selectedDriver.assignedVehicleNumber} ({selectedDriver.assignedVehicleType.replace(/_/g, ' ')})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDriver(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Composite Rating</span>
                <span className="font-mono text-xl font-bold text-slate-100">{selectedDriver.compositeScore}</span>
                <span className="text-[10px] text-amber-400 block">Overall Rank #{selectedDriver.rank}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Fuel Eco-Score</span>
                <span className="font-mono text-xl font-bold text-emerald-400">{selectedDriver.averageEcoScore}</span>
                <span className="text-[10px] text-emerald-400 block">{selectedDriver.efficiencyVsBaselinePct}% vs target</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block">On-Time Arrival</span>
                <span className="font-mono text-xl font-bold text-blue-400">{selectedDriver.onTimeDeliveryPct}%</span>
                <span className="text-[10px] text-slate-400 block">{selectedDriver.onTimeDeliveries} on-time</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block">CO₂ Saved</span>
                <span className="font-mono text-xl font-bold text-emerald-400">{selectedDriver.co2SavedKg} kg</span>
                <span className="text-[10px] text-slate-400 block">Carbon reduction</span>
              </div>
            </div>

            {/* Driving Safety & Eco Telemetry Gauges */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-200 block">
                Telemetry Driving Profile & Safety Scores
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Smooth Braking:</span>
                    <span className="font-mono text-slate-200 font-bold">{selectedDriver.smoothBrakingScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedDriver.smoothBrakingScore}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Speed Compliance:</span>
                    <span className="font-mono text-slate-200 font-bold">{selectedDriver.speedComplianceScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedDriver.speedComplianceScore}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Idle Reduction:</span>
                    <span className="font-mono text-slate-200 font-bold">{selectedDriver.idleReductionScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedDriver.idleReductionScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Badges Earned */}
            {selectedDriver.badges.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-200 block">
                  Honors & Telemetry Achievements
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedDriver.badges.map(b => (
                    <div key={b.id} className={`p-3 rounded-xl border flex items-start gap-2.5 ${b.colorClass}`}>
                      <Award className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold block">{b.label}</span>
                        <span className="text-[11px] opacity-80 leading-relaxed block">{b.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Route Logs */}
            {selectedDriver.recentRoutes.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-200 block">
                  Recent Route Logs & Telemetry History
                </span>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Route Code</th>
                        <th className="p-2.5">Distance</th>
                        <th className="p-2.5">Consumption</th>
                        <th className="p-2.5">Eco-Score</th>
                        <th className="p-2.5">Stops</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {selectedDriver.recentRoutes.map(route => (
                        <tr key={route.id} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-mono text-slate-300">{route.displayDate}</td>
                          <td className="p-2.5 font-mono text-indigo-300 font-semibold">{route.routeCode}</td>
                          <td className="p-2.5 font-mono text-slate-200">{route.distanceKm} km</td>
                          <td className="p-2.5 font-mono text-slate-200">{route.fuelConsumed} {route.fuelUnit}</td>
                          <td className="p-2.5 font-mono text-emerald-400 font-bold">{route.ecoScore}/100</td>
                          <td className="p-2.5 font-mono text-slate-400">{route.stopsCount} stops</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

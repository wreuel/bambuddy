import type { PrinterStatus } from '../../api/client';

interface Temperatures {
  bed?: number;
  bed_target?: number;
  nozzle?: number;
  nozzle_target?: number;
  nozzle_2?: number;
  nozzle_2_target?: number;
  chamber?: number;
}

interface TemperatureColumnProps {
  printerId?: number;
  status: PrinterStatus | null | undefined;
  nozzleCount: number;
}

export function TemperatureColumn({ status, nozzleCount }: TemperatureColumnProps) {
  const temps = (status?.temperatures ?? {}) as Temperatures;
  const isDualNozzle = nozzleCount > 1;

  return (
    <div className="flex flex-col justify-evenly min-w-[150px] pr-5 border-r border-bambu-dark-tertiary">
      {/* Nozzle 1 (Left) */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/hotend.svg" alt="" className="w-5 icon-theme" />
        </div>
        {isDualNozzle && (
          <span className="text-[11px] font-semibold text-bambu-green bg-bambu-green/20 px-1.5 py-0.5 rounded min-w-[18px] text-center flex-shrink-0">
            L
          </span>
        )}
        <span className="text-lg font-medium text-white">{Math.round(temps.nozzle ?? 0)}</span>
        <span className="text-sm text-bambu-gray">/{Math.round(temps.nozzle_target ?? 0)} °C</span>
      </div>

      {/* Nozzle 2 (Right) - only for dual nozzle */}
      {isDualNozzle && (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <img src="/icons/hotend.svg" alt="" className="w-5 icon-theme" />
          </div>
          <span className="text-[11px] font-semibold text-bambu-green bg-bambu-green/20 px-1.5 py-0.5 rounded min-w-[18px] text-center flex-shrink-0">
            R
          </span>
          <span className="text-lg font-medium text-white">{Math.round(temps.nozzle_2 ?? 0)}</span>
          <span className="text-sm text-bambu-gray">/{Math.round(temps.nozzle_2_target ?? 0)} °C</span>
        </div>
      )}

      {/* Bed */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/heatbed.svg" alt="" className="w-5 icon-theme" />
        </div>
        {/* Spacer to align with L/R badge (min-w-[18px]) */}
        {isDualNozzle && <span className="min-w-[18px] flex-shrink-0" />}
        <span className="text-lg font-medium text-white">{Math.round(temps.bed ?? 0)}</span>
        <span className="text-sm text-bambu-gray">/{Math.round(temps.bed_target ?? 0)} °C</span>
      </div>

      {/* Chamber */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/chamber.svg" alt="" className="w-5 icon-theme" />
        </div>
        {/* Spacer to align with L/R badge */}
        {isDualNozzle && <span className="min-w-[18px] flex-shrink-0" />}
        <span className="text-lg font-medium text-white">{Math.round(temps.chamber ?? 0)}</span>
        <span className="text-sm text-bambu-gray">/{0} °C</span>
      </div>

      {/* Air Condition - button */}
      <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/ventilation.svg" alt="" className="w-5 icon-theme" />
        </div>
        <span className="text-sm text-bambu-gray">Air Condition</span>
      </button>

      {/* Lamp - button */}
      <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/ventilation.svg" alt="" className="w-4 icon-theme" />
        </div>
        <span className="text-sm text-bambu-gray">Lamp</span>
        <div className="w-3.5 h-3.5 rounded-full bg-bambu-green" />
      </button>
    </div>
  );
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { PrinterStatus, AMSUnit } from '../../api/client';
import { Loader2 } from 'lucide-react';

interface AMSSectionDualProps {
  printerId: number;
  status: PrinterStatus | null | undefined;
  nozzleCount: number;
}

function hexToRgb(hex: string | null): string {
  if (!hex) return 'rgb(128, 128, 128)';
  const cleanHex = hex.replace('#', '').substring(0, 6);
  const r = parseInt(cleanHex.substring(0, 2), 16) || 128;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 128;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 128;
  return `rgb(${r}, ${g}, ${b})`;
}

function isLightColor(hex: string | null): boolean {
  if (!hex) return false;
  const cleanHex = hex.replace('#', '').substring(0, 6);
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

interface AMSPanelContentProps {
  units: AMSUnit[];
  side: 'left' | 'right';
  isPrinting: boolean;
  selectedAmsIndex: number;
  onSelectAms: (index: number) => void;
  selectedTray: number | null;
  onSelectTray: (trayId: number | null) => void;
}

function AMSPanelContent({
  units,
  side,
  isPrinting,
  selectedAmsIndex,
  onSelectAms,
  selectedTray,
  onSelectTray,
}: AMSPanelContentProps) {
  const selectedUnit = units[selectedAmsIndex];
  const slotPrefix = side === 'left' ? 'A' : 'B';

  return (
    <div className="flex-1 min-w-0 overflow-visible">
      <div className="text-center text-[11px] font-semibold text-bambu-gray uppercase mb-2">
        {side === 'left' ? 'Left Nozzle' : 'Right Nozzle'}
      </div>

      {/* AMS Tab Selectors - only show connected units */}
      <div className="flex gap-1.5 mb-2.5 p-1.5 bg-bambu-dark/50 rounded-lg w-fit">
        {units.map((unit, index) => (
          <button
            key={unit.id}
            onClick={() => onSelectAms(index)}
            className={`flex items-center p-1.5 rounded border-2 transition-colors bg-bambu-dark ${
              selectedAmsIndex === index
                ? 'border-bambu-green'
                : 'border-transparent hover:border-bambu-gray'
            }`}
          >
            <div className="flex gap-0.5">
              {unit.tray.map((tray) => (
                <div
                  key={tray.id}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: tray.tray_color ? hexToRgb(tray.tray_color) : '#808080',
                  }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* AMS Content */}
      {selectedUnit && (
        <div className="bg-bambu-dark-secondary rounded-[10px] p-2.5 pb-0 overflow-visible">
          {/* AMS Header - Humidity & Temp */}
          <div className="flex items-center gap-2.5 text-xs text-bambu-gray mb-2">
            {selectedUnit.humidity !== null && (
              <span className="flex items-center gap-1">
                <img src="/icons/water.svg" alt="" className="w-3.5 icon-theme" />
                {selectedUnit.humidity} %
              </span>
            )}
            {selectedUnit.temp !== null && (
              <span className="flex items-center gap-1">
                <img src="/icons/temperature.svg" alt="" className="w-3.5 icon-theme" />
                {selectedUnit.temp}°C
              </span>
            )}
            <span className="text-yellow-500 text-sm">☀</span>
          </div>

          {/* Slot Labels */}
          <div className="flex justify-center gap-1.5 mb-1.5">
            {selectedUnit.tray.map((tray, index) => (
              <div
                key={tray.id}
                className="w-12 flex items-center justify-center gap-0.5 text-[10px] text-bambu-gray px-1.5 py-[3px] bg-bambu-dark rounded-full border border-bambu-dark-tertiary"
              >
                {slotPrefix}{index + 1}
                <img src="/icons/reload.svg" alt="" className="w-2.5 h-2.5 icon-theme" />
              </div>
            ))}
          </div>

          {/* AMS Slots with integrated wiring */}
          <div className="flex justify-center gap-1.5 mb-0">
            {selectedUnit.tray.map((tray) => {
              const globalTrayId = selectedUnit.id * 4 + tray.id;
              const isSelected = selectedTray === globalTrayId;
              const isEmpty = !tray.tray_type || tray.tray_type === '' || tray.tray_type === 'NONE';
              const isLight = isLightColor(tray.tray_color);

              return (
                <div key={tray.id} className="flex flex-col items-center">
                  <button
                    onClick={() => !isEmpty && onSelectTray(isSelected ? null : globalTrayId)}
                    disabled={isEmpty || isPrinting}
                    className={`w-12 h-[70px] rounded-md border-2 overflow-hidden transition-all bg-bambu-dark ${
                      isSelected
                        ? 'border-[#d4a84b]'
                        : 'border-bambu-dark-tertiary hover:border-bambu-gray'
                    } ${isEmpty ? 'opacity-50' : ''} disabled:cursor-not-allowed`}
                  >
                    <div
                      className="w-full h-full flex flex-col items-center justify-end pb-[5px]"
                      style={{
                        backgroundColor: isEmpty ? undefined : hexToRgb(tray.tray_color),
                      }}
                    >
                      <span
                        className={`text-[11px] font-semibold mb-1 ${
                          isLight ? 'text-gray-800' : 'text-white'
                        } ${isLight ? '' : 'drop-shadow-sm'}`}
                      >
                        {isEmpty ? '--' : tray.tray_type}
                      </span>
                      {!isEmpty && (
                        <img
                          src="/icons/eye.svg"
                          alt=""
                          className={`w-3.5 h-3.5 ${isLight ? '' : 'invert'}`}
                          style={{ opacity: 0.8 }}
                        />
                      )}
                    </div>
                  </button>
                  {/* Vertical wire from slot center down */}
                  <div className="w-[2px] h-[14px] bg-[#909090]" />
                </div>
              );
            })}
          </div>

          {/* Wiring visualization - horizontal bar and hub */}
          <div className="flex justify-center">
            <div className="relative h-[50px]" style={{ width: '210px' }}>
              {/* Horizontal bar connecting all slots (spans from first to last slot center) */}
              <div className="absolute left-[24px] right-[24px] top-0 border-t-2 border-[#909090]" />

            {/* Center hub box on the horizontal bar */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[-6px] w-[28px] h-[14px] bg-[#c0c0c0] border border-[#909090] rounded-sm" />

            {/* Vertical wire from hub going down */}
            <div className="absolute left-1/2 -translate-x-[1px] top-[8px] h-[14px] border-l-2 border-[#909090]" />

            {/* Horizontal wire from hub toward the center of the panel (extends beyond panel edge) */}
            {side === 'left' && (
              <div className="absolute left-1/2 top-[21px] w-[calc(50%+30px)] border-t-2 border-[#909090]" />
            )}
            {side === 'right' && (
              <div className="absolute right-1/2 top-[21px] w-[calc(50%+30px)] border-t-2 border-[#909090]" />
            )}
            </div>
          </div>
        </div>
      )}

      {/* No AMS message */}
      {units.length === 0 && (
        <div className="bg-bambu-dark-secondary rounded-[10px] p-6 text-center text-bambu-gray text-sm">
          No AMS connected to {side} nozzle
        </div>
      )}
    </div>
  );
}

export function AMSSectionDual({ printerId, status, nozzleCount }: AMSSectionDualProps) {
  const isConnected = status?.connected ?? false;
  const isPrinting = status?.state === 'RUNNING';
  const isDualNozzle = nozzleCount > 1;
  const amsUnits: AMSUnit[] = status?.ams ?? [];

  // For dual nozzle, split AMS units between left and right
  // In real implementation, this would be based on actual nozzle assignment
  const leftUnits = isDualNozzle ? amsUnits.filter((_, i) => i % 2 === 0) : amsUnits;
  const rightUnits = isDualNozzle ? amsUnits.filter((_, i) => i % 2 === 1) : [];

  const [leftAmsIndex, setLeftAmsIndex] = useState(0);
  const [rightAmsIndex, setRightAmsIndex] = useState(0);
  const [selectedTray, setSelectedTray] = useState<number | null>(null);

  const loadMutation = useMutation({
    mutationFn: (trayId: number) => api.amsLoadFilament(printerId, trayId),
  });

  const unloadMutation = useMutation({
    mutationFn: () => api.amsUnloadFilament(printerId),
  });

  const handleLoad = () => {
    if (selectedTray !== null) {
      loadMutation.mutate(selectedTray);
    }
  };

  const handleUnload = () => {
    unloadMutation.mutate();
  };

  const isLoading = loadMutation.isPending || unloadMutation.isPending;

  return (
    <div className="bg-bambu-dark-tertiary rounded-[10px] p-3 relative overflow-visible">
      {/* Center wiring and Extruder - absolutely centered between the two AMS panels */}
      {isDualNozzle && (
        <>
          {/* Center wiring: two vertical lines going down to extruder inlets */}
          {/* Positioned to connect with horizontal wires from AMS panels */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[62px] pointer-events-none" style={{ width: '24px', height: '30px' }}>
            {/* Left vertical line - connects to left AMS horizontal wire, goes to left extruder inlet */}
            <div className="absolute left-0 top-0 h-full border-l-2 border-[#909090]" />
            {/* Right vertical line - connects to right AMS horizontal wire, goes to right extruder inlet */}
            <div className="absolute right-0 top-0 h-full border-l-2 border-[#909090]" />
          </div>
          {/* Extruder */}
          <img
            src="/icons/extruder-left-right.png"
            alt="Extruder"
            className="absolute h-[50px] left-1/2 -translate-x-1/2 bottom-[12px]"
          />
        </>
      )}

      {/* Dual Panel Layout */}
      <div className="flex gap-5 overflow-visible">
        {/* Left Nozzle Panel */}
        <AMSPanelContent
          units={leftUnits}
          side="left"
          isPrinting={isPrinting}
          selectedAmsIndex={leftAmsIndex}
          onSelectAms={setLeftAmsIndex}
          selectedTray={selectedTray}
          onSelectTray={setSelectedTray}
        />

        {/* Right Nozzle Panel - only for dual nozzle */}
        {isDualNozzle && (
          <AMSPanelContent
            units={rightUnits}
            side="right"
            isPrinting={isPrinting}
            selectedAmsIndex={rightAmsIndex}
            onSelectAms={setRightAmsIndex}
            selectedTray={selectedTray}
            onSelectTray={setSelectedTray}
          />
        )}
      </div>

      {/* Action Buttons Row with Extruder */}
      <div className="flex items-start pt-2">
        {/* Left buttons */}
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-lg bg-bambu-dark-secondary hover:bg-bambu-dark border border-bambu-dark-tertiary flex items-center justify-center">
            <img src="/icons/ams-settings.svg" alt="Settings" className="w-5 icon-theme" />
          </button>
          <button className="px-[18px] py-2.5 rounded-lg bg-bambu-dark-secondary hover:bg-bambu-dark border border-bambu-dark-tertiary text-sm text-bambu-gray flex items-center gap-1.5">
            Auto-refill
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUnload}
            disabled={!isConnected || isPrinting || isLoading}
            className="px-7 py-2.5 rounded-lg bg-bambu-dark hover:bg-bambu-dark-secondary text-sm text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {unloadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Unload'
            )}
          </button>
          <button
            onClick={handleLoad}
            disabled={!isConnected || isPrinting || selectedTray === null || isLoading}
            className="px-7 py-2.5 rounded-lg bg-bambu-dark hover:bg-bambu-dark-secondary text-sm text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Load'
            )}
          </button>
        </div>
      </div>

      {/* Error messages */}
      {(loadMutation.error || unloadMutation.error) && (
        <p className="mt-2 text-sm text-red-500 text-center">
          {(loadMutation.error || unloadMutation.error)?.message}
        </p>
      )}
    </div>
  );
}

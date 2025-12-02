import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PrinterStatus } from '../../api/client';
import { api, isConfirmationRequired } from '../../api/client';
import { Pause, Square, Loader2 } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';

interface PrintStatusProps {
  printerId: number;
  status: PrinterStatus | null | undefined;
}

function formatFinishTime(seconds: number | null | undefined): string {
  if (!seconds) return 'N/A';
  const now = new Date();
  const finish = new Date(now.getTime() + seconds * 1000);
  return finish.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function PrintStatus({ printerId, status }: PrintStatusProps) {
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState<{
    action: string;
    token: string;
    warning: string;
  } | null>(null);

  const isConnected = status?.connected ?? false;
  const isPrinting = status?.state === 'RUNNING';
  const isPaused = status?.state === 'PAUSE';
  const progress = status?.progress ?? 0;

  const pauseMutation = useMutation({
    mutationFn: () => api.pausePrint(printerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printerStatuses'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.resumePrint(printerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printerStatuses'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: (token?: string) => api.stopPrint(printerId, token),
    onSuccess: (result) => {
      if (isConfirmationRequired(result)) {
        setConfirmModal({
          action: 'stop',
          token: result.token,
          warning: result.warning,
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['printerStatuses'] });
      }
    },
  });

  const handlePauseResume = () => {
    if (isPrinting) {
      pauseMutation.mutate();
    } else if (isPaused) {
      resumeMutation.mutate();
    }
  };

  const handleStop = () => {
    stopMutation.mutate(undefined);
  };

  const handleConfirmStop = () => {
    if (confirmModal) {
      stopMutation.mutate(confirmModal.token);
      setConfirmModal(null);
    }
  };

  const isLoading = pauseMutation.isPending || resumeMutation.isPending || stopMutation.isPending;
  const canControl = isConnected && (isPrinting || isPaused);

  return (
    <>
      <div className="text-xs text-bambu-gray mb-3">Printing Progress</div>
      <div className="flex gap-4 items-center">
        {/* Thumbnail */}
        <div className="w-20 h-20 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {status?.subtask_name ? (
            <img
              src={`/api/v1/archives/thumbnail/${encodeURIComponent(status.subtask_name)}`}
              alt=""
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-xs text-bambu-gray">Bambu<br/>Lab</span>';
              }}
            />
          ) : (
            <span className="text-xs text-bambu-gray text-center">Bambu<br/>Lab</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-white truncate mb-0.5">
            {status?.subtask_name || 'N/A'}
          </div>
          <div className={`text-sm mb-2 ${
            status?.state === 'RUNNING' || status?.state === 'PAUSE'
              ? 'text-bambu-green'
              : 'text-bambu-gray'
          }`}>
            {status?.state || 'N/A'}
          </div>
          {/* Progress Bar */}
          <div className="h-1 bg-bambu-dark-tertiary rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-300 ${
                status?.state === 'PAUSE' ? 'bg-yellow-500' : 'bg-bambu-green'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-bambu-gray mb-1">
            Layer: {status?.layer_num ?? 'N/A'} / {status?.total_layers ?? 'N/A'} &nbsp;&nbsp; {Math.round(progress)}%
          </div>
          <div className="text-xs text-bambu-gray">
            Estimated finish time: {formatFinishTime(status?.remaining_time)}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={handlePauseResume}
            disabled={!canControl || isLoading}
            className="w-8 h-8 rounded-md border border-bambu-dark-tertiary bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary flex items-center justify-center text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
            title={isPrinting ? 'Pause' : 'Resume'}
          >
            {pauseMutation.isPending || resumeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleStop}
            disabled={!canControl || isLoading}
            className="w-8 h-8 rounded-md border border-bambu-dark-tertiary bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary flex items-center justify-center text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
            title="Stop"
          >
            {stopMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <button
            disabled={!canControl || isLoading}
            className="w-8 h-8 rounded-md border border-bambu-dark-tertiary bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary flex items-center justify-center text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
            title="Skip Objects"
          >
            <img src="/icons/skip-objects.svg" alt="Skip Objects" className="w-4 h-4 icon-theme" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {(pauseMutation.error || resumeMutation.error || stopMutation.error) && (
        <p className="mt-2 text-xs text-red-500">
          {(pauseMutation.error || resumeMutation.error || stopMutation.error)?.message}
        </p>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          title="Confirm Stop"
          message={confirmModal.warning}
          confirmText="Stop Print"
          variant="danger"
          onConfirm={handleConfirmStop}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  );
}

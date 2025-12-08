import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cloud,
  LogIn,
  LogOut,
  Loader2,
  Settings2,
  Printer as PrinterIcon,
  Droplet,
  X,
  Key,
  RefreshCw,
  Gauge,
  Pencil,
  Trash2,
  Save,
  AlertTriangle,
  Search,
  Plus,
  Copy,
  Clock,
  Layers,
  Filter,
  ChevronDown,
  ArrowUp,
  HelpCircle,
  Upload,
  FileJson,
  Sparkles,
  Check,
  AlertCircle,
  Code,
  Sliders,
  List,
} from 'lucide-react';
import { api } from '../api/client';
import type { SlicerSetting, SlicerSettingsResponse, SlicerSettingDetail, SlicerSettingCreate, Printer } from '../api/client';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import { KProfilesView } from '../components/KProfilesView';

type ProfileTab = 'cloud' | 'kprofiles';
type LoginStep = 'email' | 'code' | 'token';
type PresetType = 'all' | 'filament' | 'printer' | 'process';

// Extract metadata from preset name or inherits field
function extractMetadata(name: string, inherits?: string): {
  printer: string | null;
  nozzle: string | null;
  layerHeight: string | null;
  filamentType: string | null;
} {
  const searchIn = `${name} ${inherits || ''}`;

  // Extract printer (e.g., "X1C", "P1S", "A1", "H2D")
  const printerMatch = searchIn.match(/@?\s*(?:BBL\s+)?(?:Bambu\s+Lab\s+)?([XPAH][1-9][A-Z]?(?:\s*(?:Carbon|mini))?|H2D)/i);
  const printer = printerMatch ? printerMatch[1].trim() : null;

  // Extract nozzle size (e.g., "0.4 nozzle", "0.6mm")
  const nozzleMatch = searchIn.match(/(\d+\.?\d*)\s*(?:mm\s*)?nozzle|nozzle\s*(\d+\.?\d*)/i);
  const nozzle = nozzleMatch ? (nozzleMatch[1] || nozzleMatch[2]) + 'mm' : null;

  // Extract layer height (e.g., "0.20mm", "0.08mm Extra Fine")
  const layerMatch = searchIn.match(/(\d+\.?\d*)mm\s*(?:Standard|Fine|Extra Fine|Draft|Quality)?/i);
  const layerHeight = layerMatch ? layerMatch[1] + 'mm' : null;

  // Extract filament type (e.g., "PLA", "PETG", "ABS", "TPU")
  const filamentMatch = searchIn.match(/\b(PLA|PETG|ABS|ASA|TPU|PC|PA|PVA|HIPS|PP|PET(?:-?CF)?|PA(?:-?CF)?|PLA(?:-?CF)?)\b/i);
  const filamentType = filamentMatch ? filamentMatch[1].toUpperCase() : null;

  return { printer, nozzle, layerHeight, filamentType };
}

// Check if preset is user-created (editable)
function isUserPreset(settingId: string): boolean {
  return /^(P[FPM]US|PF\d|PP\d)/.test(settingId);
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// LOGIN FORM
// ============================================================================

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { showToast } = useToast();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [region, setRegion] = useState('global');

  const loginMutation = useMutation({
    mutationFn: () => api.cloudLogin(email, password, region),
    onSuccess: (result) => {
      if (result.success) {
        showToast('Logged in successfully');
        onSuccess();
      } else if (result.needs_verification) {
        showToast('Verification code sent to your email');
        setStep('code');
      } else {
        showToast(result.message, 'error');
      }
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.cloudVerify(email, code),
    onSuccess: (result) => {
      if (result.success) {
        showToast('Logged in successfully');
        onSuccess();
      } else {
        showToast(result.message, 'error');
      }
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const tokenMutation = useMutation({
    mutationFn: () => api.cloudSetToken(token),
    onSuccess: () => {
      showToast('Token set successfully');
      onSuccess();
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'email') loginMutation.mutate();
    else if (step === 'code') verifyMutation.mutate();
    else if (step === 'token') tokenMutation.mutate();
  };

  const isPending = loginMutation.isPending || verifyMutation.isPending || tokenMutation.isPending;

  return (
    <Card className="max-w-md mx-auto">
      <CardContent>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-bambu-green/20 mb-3">
            <Cloud className="w-6 h-6 text-bambu-green" />
          </div>
          <h2 className="text-xl font-semibold text-white">Connect to Bambu Cloud</h2>
          <p className="text-sm text-bambu-gray mt-1">Sync your slicer presets across devices</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 'email' && (
            <>
              <div>
                <label className="block text-sm text-bambu-gray mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white placeholder-bambu-gray-dark focus:border-bambu-green focus:outline-none"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-bambu-gray mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white placeholder-bambu-gray-dark focus:border-bambu-green focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-bambu-gray mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
                >
                  <option value="global">Global</option>
                  <option value="china">China</option>
                </select>
              </div>
            </>
          )}

          {step === 'code' && (
            <div>
              <label className="block text-sm text-bambu-gray mb-1">Verification Code</label>
              <p className="text-xs text-bambu-gray mb-2">Check your email ({email}) for a 6-digit code</p>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-3 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white text-center text-2xl tracking-widest font-mono focus:border-bambu-green focus:outline-none"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
          )}

          {step === 'token' && (
            <div>
              <label className="block text-sm text-bambu-gray mb-1">Access Token</label>
              <p className="text-xs text-bambu-gray mb-2">Paste your Bambu Lab access token (from Bambu Studio)</p>
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white text-xs font-mono placeholder-bambu-gray-dark focus:border-bambu-green focus:outline-none resize-none"
                placeholder="eyJ..."
                rows={4}
                required
              />
            </div>
          )}

          <div className="flex gap-2">
            {step === 'code' && (
              <Button type="button" variant="secondary" onClick={() => setStep('email')} className="flex-1">
                Back
              </Button>
            )}
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {step === 'email' ? 'Login' : step === 'code' ? 'Verify' : 'Set Token'}
            </Button>
          </div>

          {step === 'email' && (
            <div className="pt-4 border-t border-bambu-dark-tertiary">
              <button
                type="button"
                onClick={() => setStep('token')}
                className="text-sm text-bambu-gray hover:text-white flex items-center gap-2 transition-colors"
              >
                <Key className="w-4 h-4" />
                Use access token instead
              </button>
            </div>
          )}

          {step === 'token' && (
            <div className="pt-4 border-t border-bambu-dark-tertiary">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-sm text-bambu-gray hover:text-white flex items-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Login with email instead
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FILTER DROPDOWN
// ============================================================================

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; count?: number }[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-sm text-white hover:border-bambu-gray-dark transition-colors"
      >
        <span className="text-bambu-gray">{label}:</span>
        <span>{selectedOption?.label || 'All'}</span>
        <ChevronDown className={`w-4 h-4 text-bambu-gray transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-bambu-dark-secondary border border-bambu-dark-tertiary rounded-lg shadow-xl z-20 py-1 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); }}
                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-bambu-dark-tertiary transition-colors ${
                  value === option.value ? 'text-bambu-green' : 'text-white'
                }`}
              >
                <span>{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-bambu-gray text-xs">{option.count}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// SCROLL TO TOP BUTTON
// ============================================================================

function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 p-3 bg-bambu-green hover:bg-bambu-green-light text-white rounded-full shadow-lg shadow-bambu-green/25 transition-all z-40"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}

// ============================================================================
// PRESET CARD
// ============================================================================

function PresetCard({
  setting,
  onClick,
  onDuplicate,
}: {
  setting: SlicerSetting;
  onClick: () => void;
  onDuplicate: () => void;
}) {
  const metadata = extractMetadata(setting.name);
  const isEditable = isUserPreset(setting.setting_id);

  const typeConfig = {
    filament: { icon: Droplet, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    printer: { icon: PrinterIcon, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    process: { icon: Settings2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  };

  const config = typeConfig[setting.type as keyof typeof typeConfig] || typeConfig.process;
  const TypeIcon = config.icon;

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="w-full text-left p-4 bg-bambu-dark rounded-lg border border-bambu-dark-tertiary hover:border-bambu-gray-dark shadow-md shadow-black/20 hover:shadow-lg hover:shadow-black/30 transition-all"
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <TypeIcon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium truncate">{setting.name}</h3>
              {isEditable && (
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-bambu-green" title="Editable" />
              )}
            </div>

            {/* Metadata tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {metadata.printer && (
                <span className="px-1.5 py-0.5 text-xs bg-bambu-dark-tertiary text-bambu-gray-light rounded">
                  {metadata.printer}
                </span>
              )}
              {metadata.nozzle && (
                <span className="px-1.5 py-0.5 text-xs bg-bambu-dark-tertiary text-bambu-gray-light rounded">
                  {metadata.nozzle}
                </span>
              )}
              {metadata.layerHeight && setting.type === 'process' && (
                <span className="px-1.5 py-0.5 text-xs bg-bambu-dark-tertiary text-bambu-gray-light rounded">
                  {metadata.layerHeight}
                </span>
              )}
              {metadata.filamentType && setting.type === 'filament' && (
                <span className="px-1.5 py-0.5 text-xs bg-bambu-dark-tertiary text-bambu-gray-light rounded">
                  {metadata.filamentType}
                </span>
              )}
            </div>

            {setting.updated_time && (
              <div className="flex items-center gap-1 mt-2 text-xs text-bambu-gray">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(setting.updated_time)}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Quick action on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-bambu-dark-secondary border border-bambu-dark-tertiary opacity-0 group-hover:opacity-100 text-bambu-gray hover:text-white hover:bg-bambu-dark-tertiary transition-all"
        title="Duplicate"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ============================================================================
// PRESET DETAIL MODAL
// ============================================================================

function PresetDetailModal({
  setting,
  onClose,
  onDeleted,
  onDuplicate,
}: {
  setting: SlicerSetting;
  onClose: () => void;
  onDeleted: () => void;
  onDuplicate: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: detail, isLoading } = useQuery<SlicerSettingDetail>({
    queryKey: ['cloudSettingDetail', setting.setting_id],
    queryFn: () => api.getCloudSettingDetail(setting.setting_id),
  });

  useEffect(() => {
    if (detail && editedSettings === '') {
      setEditedSettings(JSON.stringify(detail.setting || {}, null, 2));
    }
  }, [detail, editedSettings]);

  const updateMutation = useMutation({
    mutationFn: () => {
      let parsedSettings: Record<string, unknown> | undefined;
      try {
        parsedSettings = JSON.parse(editedSettings);
      } catch {
        throw new Error('Invalid JSON in settings');
      }
      return api.updateCloudSetting(setting.setting_id, { setting: parsedSettings });
    },
    onSuccess: () => {
      showToast('Preset updated successfully');
      queryClient.removeQueries({ queryKey: ['cloudSettingDetail', setting.setting_id] });
      queryClient.invalidateQueries({ queryKey: ['cloudSettings'] });
      onClose();
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCloudSetting(setting.setting_id),
    onSuccess: () => {
      showToast('Preset deleted');
      queryClient.invalidateQueries({ queryKey: ['cloudSettings'] });
      onDeleted();
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const isEditable = isUserPreset(setting.setting_id);
  const metadata = extractMetadata(setting.name, detail?.setting?.inherits as string);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-bambu-dark-tertiary">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-white truncate">{setting.name}</h2>
                {isEditable && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-bambu-green/20 text-bambu-green rounded-full">
                    Editable
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-bambu-gray">
                <span className="capitalize">{setting.type} preset</span>
                {metadata.printer && <><span>•</span><span>{metadata.printer}</span></>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-bambu-gray hover:text-white hover:bg-bambu-dark-tertiary rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-bambu-green animate-spin" />
              </div>
            ) : detail ? (
              isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-bambu-gray mb-2">Settings (JSON)</label>
                    <textarea
                      value={editedSettings}
                      onChange={(e) => setEditedSettings(e.target.value)}
                      className="w-full h-[400px] px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white text-xs font-mono focus:border-bambu-green focus:outline-none resize-none"
                      spellCheck={false}
                    />
                  </div>
                  {detail.base_id && (
                    <p className="text-xs text-bambu-gray">
                      Base preset: <span className="text-white font-mono">{detail.base_id}</span>
                    </p>
                  )}
                </div>
              ) : (
                <pre className="text-xs text-bambu-gray font-mono whitespace-pre-wrap bg-bambu-dark p-4 rounded-lg border border-bambu-dark-tertiary overflow-x-auto">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              )
            ) : (
              <div className="text-center py-16 text-bambu-gray">Failed to load preset details</div>
            )}
          </div>

          {/* Footer */}
          {showDeleteConfirm ? (
            <div className="p-4 border-t border-bambu-dark-tertiary bg-red-500/5">
              <div className="flex items-center gap-2 mb-3 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Delete this preset?</span>
              </div>
              <p className="text-sm text-bambu-gray mb-4">
                This will permanently delete "{setting.name}" from Bambu Cloud. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleteMutation.isPending} className="flex-1">
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="flex-1">
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-bambu-dark-tertiary">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => { setIsEditing(false); if (detail) setEditedSettings(JSON.stringify(detail.setting || {}, null, 2)); }}
                    disabled={updateMutation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="flex-1">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={onClose} className="flex-1">Close</Button>
                  <Button variant="secondary" onClick={onDuplicate}>
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </Button>
                  {isEditable && (
                    <>
                      <Button variant="secondary" onClick={() => setIsEditing(true)} disabled={isLoading || !detail}>
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// CREATE PRESET MODAL
// ============================================================================

function CreatePresetModal({
  onClose,
  initialData,
  allPresets,
}: {
  onClose: () => void;
  initialData?: { type: string; name: string; base_id: string; setting: Record<string, unknown> };
  allPresets: SlicerSettingsResponse;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [presetType, setPresetType] = useState<'filament' | 'print' | 'printer'>(
    (initialData?.type as 'filament' | 'print' | 'printer') || 'filament'
  );
  const [name, setName] = useState(initialData?.name ? `${initialData.name} (Copy)` : '');
  const [baseId, setBaseId] = useState(initialData?.base_id || '');
  const [settings, setSettings] = useState(
    initialData?.setting ? JSON.stringify(initialData.setting, null, 2) : '{\n  "inherits": ""\n}'
  );

  // Get presets filtered by selected type
  const availableBasePresets = useMemo(() => {
    const typeMap: Record<string, SlicerSetting[]> = {
      filament: allPresets.filament,
      print: allPresets.process,
      printer: allPresets.printer,
    };
    return (typeMap[presetType] || []).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPresets, presetType]);

  const createMutation = useMutation({
    mutationFn: () => {
      let parsedSettings: Record<string, unknown>;
      try {
        parsedSettings = JSON.parse(settings);
      } catch {
        throw new Error('Invalid JSON in settings');
      }

      const settingsIdKey = presetType === 'filament' ? 'filament_settings_id'
        : presetType === 'print' ? 'print_settings_id' : 'printer_settings_id';
      parsedSettings[settingsIdKey] = `"${name}"`;

      const data: SlicerSettingCreate = { type: presetType, name, base_id: baseId, setting: parsedSettings };
      return api.createCloudSetting(data);
    },
    onSuccess: () => {
      showToast('Preset created successfully');
      queryClient.invalidateQueries({ queryKey: ['cloudSettings'] });
      onClose();
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-bambu-dark-tertiary">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {initialData ? 'Duplicate Preset' : 'Create New Preset'}
              </h2>
              <p className="text-sm text-bambu-gray mt-1">Add a new preset to your Bambu Cloud</p>
            </div>
            <button onClick={onClose} className="p-2 text-bambu-gray hover:text-white hover:bg-bambu-dark-tertiary rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-bambu-gray mb-1">Type</label>
                <select
                  value={presetType}
                  onChange={(e) => setPresetType(e.target.value as 'filament' | 'print' | 'printer')}
                  className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
                >
                  <option value="filament">Filament</option>
                  <option value="print">Process</option>
                  <option value="printer">Printer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-bambu-gray mb-1 flex items-center gap-1.5">
                  Base Preset
                  <span className="relative group/tooltip">
                    <HelpCircle className="w-3.5 h-3.5 text-bambu-gray-dark hover:text-bambu-gray cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-bambu-dark-secondary border border-bambu-dark-tertiary rounded-lg text-xs text-bambu-gray-light whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity shadow-lg z-10">
                      The parent preset this new preset<br />
                      will inherit settings from.
                    </span>
                  </span>
                </label>
                <select
                  value={baseId}
                  onChange={(e) => setBaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white text-sm focus:border-bambu-green focus:outline-none"
                >
                  <option value="">Select a base preset...</option>
                  {availableBasePresets.map((preset) => (
                    <option key={preset.setting_id} value={preset.setting_id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-bambu-gray mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white focus:border-bambu-green focus:outline-none"
                placeholder="My Custom Preset"
              />
            </div>

            <div>
              <label className="block text-sm text-bambu-gray mb-1">Settings (JSON)</label>
              <textarea
                value={settings}
                onChange={(e) => setSettings(e.target.value)}
                className="w-full h-48 px-3 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white text-xs font-mono focus:border-bambu-green focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-bambu-dark-tertiary flex gap-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name.trim() || !baseId} className="flex-1">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {initialData ? 'Duplicate' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// CLOUD PROFILES VIEW
// ============================================================================

function CloudProfilesView({
  settings,
  lastSyncTime,
  onRefresh,
  isRefreshing,
  printers,
}: {
  settings: SlicerSettingsResponse;
  lastSyncTime?: Date;
  onRefresh: () => void;
  isRefreshing: boolean;
  printers: Printer[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<PresetType>('all');
  const [filterPrinter, setFilterPrinter] = useState('all');
  const [filterNozzle, setFilterNozzle] = useState('all');
  const [filterFilament, setFilterFilament] = useState('all');
  const [filterLayerHeight, setFilterLayerHeight] = useState('all');
  const [selectedSetting, setSelectedSetting] = useState<SlicerSetting | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState<{ type: string; name: string; base_id: string; setting: Record<string, unknown> } | null>(null);

  const queryClient = useQueryClient();

  // Combine all presets with metadata
  const allPresetsWithMeta = useMemo(() => {
    const combined = [
      ...settings.filament.map(s => ({ ...s, type: 'filament' as const })),
      ...settings.printer.map(s => ({ ...s, type: 'printer' as const })),
      ...settings.process.map(s => ({ ...s, type: 'process' as const })),
    ];
    return combined.map(s => ({ ...s, meta: extractMetadata(s.name) }));
  }, [settings]);

  // Extract unique filter values (use configured printers from API)
  const filterOptions = useMemo(() => {
    const nozzles = new Set<string>();
    const filaments = new Set<string>();
    const layerHeights = new Set<string>();

    allPresetsWithMeta.forEach(p => {
      if (p.meta.nozzle) nozzles.add(p.meta.nozzle);
      if (p.meta.filamentType) filaments.add(p.meta.filamentType);
      if (p.meta.layerHeight) layerHeights.add(p.meta.layerHeight);
    });

    return {
      printers: printers.map(p => ({ id: p.id.toString(), name: p.name })),
      nozzles: Array.from(nozzles).sort((a, b) => parseFloat(a) - parseFloat(b)),
      filaments: Array.from(filaments).sort(),
      layerHeights: Array.from(layerHeights).sort((a, b) => parseFloat(a) - parseFloat(b)),
    };
  }, [allPresetsWithMeta, printers]);

  // Get selected printer's model for filtering
  const selectedPrinterModel = useMemo(() => {
    if (filterPrinter === 'all') return null;
    const printer = printers.find(p => p.id.toString() === filterPrinter);
    return printer?.model || null;
  }, [filterPrinter, printers]);

  // Apply filters
  const filteredPresets = useMemo(() => {
    return allPresetsWithMeta
      .filter(s => filterType === 'all' || s.type === filterType)
      .filter(s => {
        if (filterPrinter === 'all' || !selectedPrinterModel) return true;
        // Match preset's printer model to configured printer's model
        const presetPrinter = s.meta.printer?.toLowerCase() || '';
        const configuredModel = selectedPrinterModel.toLowerCase();
        return presetPrinter.includes(configuredModel) || configuredModel.includes(presetPrinter);
      })
      .filter(s => filterNozzle === 'all' || s.meta.nozzle === filterNozzle)
      .filter(s => filterFilament === 'all' || s.meta.filamentType === filterFilament)
      .filter(s => filterLayerHeight === 'all' || s.meta.layerHeight === filterLayerHeight)
      .filter(s => searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPresetsWithMeta, filterType, filterPrinter, selectedPrinterModel, filterNozzle, filterFilament, filterLayerHeight, searchQuery]);

  // Group by type
  const groupedPresets = useMemo(() => {
    if (filterType !== 'all') {
      return { [filterType]: filteredPresets };
    }
    return {
      filament: filteredPresets.filter(p => p.type === 'filament'),
      printer: filteredPresets.filter(p => p.type === 'printer'),
      process: filteredPresets.filter(p => p.type === 'process'),
    };
  }, [filteredPresets, filterType]);

  const handleDuplicate = async (setting: SlicerSetting) => {
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ['cloudSettingDetail', setting.setting_id],
        queryFn: () => api.getCloudSettingDetail(setting.setting_id),
      });

      const apiType = setting.type === 'process' ? 'print' : setting.type;
      setDuplicateData({
        type: apiType,
        name: setting.name,
        base_id: detail.base_id || 'GFSA00',
        setting: detail.setting || {},
      });
      setSelectedSetting(null);
    } catch (error) {
      console.error('Failed to fetch preset details for duplication:', error);
    }
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterPrinter('all');
    setFilterNozzle('all');
    setFilterFilament('all');
    setFilterLayerHeight('all');
    setSearchQuery('');
  };

  const hasActiveFilters = filterType !== 'all' || filterPrinter !== 'all' || filterNozzle !== 'all' ||
    filterFilament !== 'all' || filterLayerHeight !== 'all' || searchQuery !== '';

  const typeLabels = {
    filament: { label: 'Filament', icon: Droplet, color: 'text-amber-400' },
    printer: { label: 'Printer', icon: PrinterIcon, color: 'text-purple-400' },
    process: { label: 'Process', icon: Settings2, color: 'text-blue-400' },
  };

  const totalCount = settings.filament.length + settings.printer.length + settings.process.length;

  return (
    <>
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bambu-gray" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search presets..."
              className="w-full pl-10 pr-4 py-2 bg-bambu-dark border border-bambu-dark-tertiary rounded-lg text-white placeholder-bambu-gray-dark focus:border-bambu-green focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" />
              New Preset
            </Button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-bambu-gray" />

          <FilterDropdown
            label="Type"
            value={filterType}
            options={[
              { value: 'all', label: 'All', count: totalCount },
              { value: 'filament', label: 'Filament', count: settings.filament.length },
              { value: 'printer', label: 'Printer', count: settings.printer.length },
              { value: 'process', label: 'Process', count: settings.process.length },
            ]}
            onChange={(v) => setFilterType(v as PresetType)}
          />

          {filterOptions.printers.length > 0 && (
            <FilterDropdown
              label="Printer"
              value={filterPrinter}
              options={[
                { value: 'all', label: 'All' },
                ...filterOptions.printers.map(p => ({ value: p.id, label: p.name })),
              ]}
              onChange={setFilterPrinter}
            />
          )}

          {filterOptions.nozzles.length > 0 && (
            <FilterDropdown
              label="Nozzle"
              value={filterNozzle}
              options={[
                { value: 'all', label: 'All' },
                ...filterOptions.nozzles.map(n => ({ value: n, label: n })),
              ]}
              onChange={setFilterNozzle}
            />
          )}

          {filterOptions.filaments.length > 0 && (filterType === 'all' || filterType === 'filament') && (
            <FilterDropdown
              label="Filament"
              value={filterFilament}
              options={[
                { value: 'all', label: 'All' },
                ...filterOptions.filaments.map(f => ({ value: f, label: f })),
              ]}
              onChange={setFilterFilament}
            />
          )}

          {filterOptions.layerHeights.length > 0 && (filterType === 'all' || filterType === 'process') && (
            <FilterDropdown
              label="Layer"
              value={filterLayerHeight}
              options={[
                { value: 'all', label: 'All' },
                ...filterOptions.layerHeights.map(l => ({ value: l, label: l })),
              ]}
              onChange={setFilterLayerHeight}
            />
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-bambu-gray hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Sync Status */}
      {lastSyncTime && (
        <div className="flex items-center gap-2 text-xs text-bambu-gray mb-4">
          <Clock className="w-3 h-3" />
          Last synced: {formatRelativeTime(lastSyncTime.toISOString())}
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-bambu-gray mb-4">
        Showing {filteredPresets.length} of {totalCount} presets
      </p>

      {/* Presets Grid */}
      {filteredPresets.length === 0 ? (
        <div className="text-center py-16">
          <Layers className="w-12 h-12 text-bambu-gray-dark mx-auto mb-4" />
          <p className="text-bambu-gray">No presets found</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-2 text-sm text-bambu-green hover:text-bambu-green-light">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedPresets).map(([type, presets]) => {
            if (presets.length === 0) return null;
            const { label, icon: Icon, color } = typeLabels[type as keyof typeof typeLabels];

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <h3 className="text-lg font-semibold text-white">{label}</h3>
                  <span className="text-sm text-bambu-gray">({presets.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {presets.map((preset) => (
                    <PresetCard
                      key={preset.setting_id}
                      setting={preset}
                      onClick={() => setSelectedSetting(preset)}
                      onDuplicate={() => handleDuplicate(preset)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedSetting && (
        <PresetDetailModal
          setting={selectedSetting}
          onClose={() => setSelectedSetting(null)}
          onDeleted={() => setSelectedSetting(null)}
          onDuplicate={() => handleDuplicate(selectedSetting)}
        />
      )}

      {(showCreateModal || duplicateData) && (
        <CreatePresetModal
          onClose={() => { setShowCreateModal(false); setDuplicateData(null); }}
          initialData={duplicateData || undefined}
          allPresets={settings}
        />
      )}
    </>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function ProfilesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ProfileTab>('cloud');
  const [lastSyncTime, setLastSyncTime] = useState<Date>();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['cloudStatus'],
    queryFn: api.getCloudStatus,
  });

  const { data: printers = [] } = useQuery({
    queryKey: ['printers'],
    queryFn: api.getPrinters,
  });

  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings, dataUpdatedAt } = useQuery({
    queryKey: ['cloudSettings'],
    queryFn: () => api.getCloudSettings(),
    enabled: !!status?.is_authenticated,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastSyncTime(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  const logoutMutation = useMutation({
    mutationFn: api.cloudLogout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudStatus'] });
      queryClient.removeQueries({ queryKey: ['cloudSettings'] });
      showToast('Logged out');
    },
  });

  const handleLoginSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['cloudStatus'] });
  };

  if (statusLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-bambu-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Profiles</h1>
        <p className="text-bambu-gray">Manage your slicer presets and pressure advance calibrations</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-bambu-dark-tertiary mb-6">
        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'cloud'
              ? 'text-bambu-green border-bambu-green'
              : 'text-bambu-gray hover:text-white border-transparent'
          }`}
        >
          <Cloud className="w-4 h-4" />
          Cloud Profiles
        </button>
        <button
          onClick={() => setActiveTab('kprofiles')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'kprofiles'
              ? 'text-bambu-green border-bambu-green'
              : 'text-bambu-gray hover:text-white border-transparent'
          }`}
        >
          <Gauge className="w-4 h-4" />
          K-Profiles
        </button>
      </div>

      {/* Cloud Profiles Tab */}
      {activeTab === 'cloud' && (
        <>
          {/* Connection Status Bar */}
          {status?.is_authenticated && (
            <div className="flex items-center justify-between p-3 mb-6 bg-bambu-dark rounded-lg border border-bambu-dark-tertiary">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-bambu-green animate-pulse" />
                <span className="text-sm text-bambu-gray">
                  Connected as <span className="text-white">{status.email}</span>
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          )}

          {!status?.is_authenticated ? (
            <LoginForm onSuccess={handleLoginSuccess} />
          ) : settingsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-bambu-green animate-spin" />
            </div>
          ) : settings ? (
            <CloudProfilesView
              settings={settings}
              lastSyncTime={lastSyncTime}
              onRefresh={() => refetchSettings()}
              isRefreshing={settingsLoading}
              printers={printers}
            />
          ) : (
            <div className="text-center py-16">
              <p className="text-bambu-gray mb-4">Failed to load profiles</p>
              <Button onClick={() => refetchSettings()}>Retry</Button>
            </div>
          )}
        </>
      )}

      {/* K-Profiles Tab */}
      {activeTab === 'kprofiles' && <KProfilesView />}

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}

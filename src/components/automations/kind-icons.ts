/**
 * Pictogramme de chaque déclencheur, condition et action : une forme par
 * signification, issue du jeu d'icônes unique de GeniusFiles.
 */
import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarClock,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  GfCleaner,
  GfCompress,
  GfExtract,
  GfOrganize,
  GfUsbDrive,
  HardDrive,
  PencilLine,
  Repeat,
  Save,
  Timer,
  Trash2,
  Type,
  type AppIcon,
} from "@/components/icons";
import type { ActionKind, ConditionKind, TriggerKind } from "@/lib/automations/types";

export const TRIGGER_ICON: Record<TriggerKind, AppIcon> = {
  scheduled_time: Timer,
  daily: Clock,
  weekly: Repeat,
  app_open: AppWindow,
  file_added: FolderPlus,
  folder_changed: FolderOpen,
  storage_low: HardDrive,
  device_connected: GfUsbDrive,
};

export const CONDITION_ICON: Record<ConditionKind, AppIcon> = {
  file_type: FileText,
  size_min: ArrowUp,
  size_max: ArrowDown,
  name_contains: Type,
  location: Folder,
  created_after: CalendarClock,
  modified_after: PencilLine,
  storage_available: HardDrive,
};

export const ACTION_ICON: Record<ActionKind, AppIcon> = {
  copy: Copy,
  move: FolderInput,
  rename: PencilLine,
  trash: Trash2,
  compress: GfCompress,
  extract: GfExtract,
  backup: Save,
  mkdir: FolderPlus,
  organize: GfOrganize,
  cleaner_scan: GfCleaner,
  notify: Bell,
  open_module: ExternalLink,
};

import clsx from 'clsx';
import {
  Search,
  Trash2,
  Send,
  Wifi,
  Clock,
  FileCode,
  FolderPlus,
  FilePlus,
  UploadCloud,
  ChevronRight,
  Save,
  Edit,
  FileText,
  ShieldCheck,
  UserCheck,
  ShieldAlert,
  UserX,
  Download,
  RotateCw,
  CheckCircle2,
  Zap,
  Layers,
  Globe,
  Hash,
  AlertTriangle,
  Lock,
  Key,
  Radio,
  ArrowDownCircle,
  ArrowRight,
  Terminal,
  Server,
  FolderOpen,
  Users,
  User,
  Archive,
  Calendar,
  Database,
  Network,
  Settings,
  Shield,
  LogOut,
  ArrowLeft,
  PanelLeft,
  Menu,
  X,
  ChevronDown,
  Play,
  RotateCcw,
  Square,
  XOctagon,
  PlusCircle,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
  Cpu,
  HardDrive,
  Activity,
  LayoutDashboard,
} from 'lucide-react';

// Explicit mapping of named Lucide fallback components
const LUCIDE_FALLBACKS = {
  Search,
  Trash2,
  Send,
  Wifi,
  Clock,
  FileCode,
  FolderPlus,
  FilePlus,
  UploadCloud,
  ChevronRight,
  Save,
  Edit,
  FileText,
  ShieldCheck,
  UserCheck,
  ShieldAlert,
  UserX,
  Download,
  RotateCw,
  CheckCircle2,
  Zap,
  Layers,
  Globe,
  Hash,
  AlertTriangle,
  Lock,
  Key,
  Radio,
  ArrowDownCircle,
  ArrowRight,
  Terminal,
  Server,
  FolderOpen,
  Users,
  User,
  Archive,
  Calendar,
  Database,
  Network,
  Settings,
  Shield,
  LogOut,
  ArrowLeft,
  PanelLeft,
  Menu,
  X,
  ChevronDown,
  Play,
  RotateCcw,
  Square,
  XOctagon,
  PlusCircle,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
  Cpu,
  HardDrive,
  Activity,
  LayoutDashboard,
};

// Map of high-quality PNG / GIF assets in /images/icons/
const IMAGE_ICONS = {
  // Navigation & Core
  LayoutDashboard: '/images/icons/dashboard.png',
  dashboard: '/images/icons/dashboard.png',
  Server: '/images/icons/Server.png',
  Terminal: '/images/icons/Terminal.png',
  FolderOpen: '/images/icons/FolderOpen.png',
  Users: '/images/icons/Users.png',
  User: '/images/icons/User.png',
  Archive: '/images/icons/Archive.png',
  Calendar: '/images/icons/Calendar.png',
  Database: '/images/icons/Database.png',
  Network: '/images/icons/Network.png',
  Settings: '/images/icons/Settings.png',
  Shield: '/images/icons/Shield.png',
  LogOut: '/images/icons/LogOut.png',
  ArrowLeft: '/images/icons/ArrowLeft.png',
  PanelLeft: '/images/icons/PanelLeft.png',
  Menu: '/images/icons/Menu.png',
  X: '/images/icons/X.png',
  ChevronDown: '/images/icons/ChevronDown.png',

  // Actions & Controls
  Play: '/images/icons/Play.png',
  RotateCcw: '/images/icons/RotateCcw.png',
  Square: '/images/icons/Square.png',
  XOctagon: '/images/icons/XOctagon.png',
  PlusCircle: '/images/icons/PlusCircle.png',
  Copy: '/images/icons/Copy.png',
  Check: '/images/icons/Check.png',
  RefreshCw: '/images/icons/RefreshCw.gif',
  Loader2: '/images/icons/Loader2.gif',
  AlertCircle: '/images/icons/AlertCircle.gif',

  // Telemetry & Metrics
  Cpu: '/images/icons/Cpu.png',
  HardDrive: '/images/icons/HardDrive.png',
  Activity: '/images/icons/Activity.png',

  // Software Icons
  PaperIcon: '/images/icons/PaperIcon.png',
  VanillaIcon: '/images/icons/VanillaIcon.png',
  PurpurIcon: '/images/icons/PurpurIcon.png',
  ForgeIcon: '/images/icons/ForgeIcon.png',
  FabricIcon: '/images/icons/FabricIcon.png',
  VelocityIcon: '/images/icons/VelocityIcon.png',
};

/**
 * Universal BreezeIcon component:
 * Renders high-quality PNG/GIF assets from /images/icons/ when available,
 * and seamlessly falls back to tree-shaken SVGs for remaining icons.
 */
export const BreezeIcon = ({
  name,
  icon: IconProp,
  size = 18,
  className,
  alt = '',
  ...props
}) => {
  // 1. Determine key name
  const iconKey = typeof name === 'string'
    ? name
    : typeof IconProp === 'string'
    ? IconProp
    : IconProp?.displayName || IconProp?.name || null;

  // 2. Check if a dedicated image asset exists in /images/icons/
  if (iconKey && IMAGE_ICONS[iconKey]) {
    const src = IMAGE_ICONS[iconKey];
    return (
      <img
        src={src}
        alt={alt || iconKey}
        width={size}
        height={size}
        className={clsx('object-contain flex-shrink-0 select-none inline-block', className)}
        style={{ width: `${size}px`, height: `${size}px` }}
        {...props}
      />
    );
  }

  // 3. If direct image path provided
  if (typeof iconKey === 'string' && (iconKey.startsWith('/') || iconKey.endsWith('.png') || iconKey.endsWith('.svg') || iconKey.endsWith('.gif'))) {
    return (
      <img
        src={iconKey}
        alt={alt}
        width={size}
        height={size}
        className={clsx('object-contain flex-shrink-0 select-none inline-block', className)}
        style={{ width: `${size}px`, height: `${size}px` }}
        {...props}
      />
    );
  }

  // 4. Lucide component or fallback
  const LucideComp = typeof IconProp === 'function'
    ? IconProp
    : iconKey && LUCIDE_FALLBACKS[iconKey]
    ? LUCIDE_FALLBACKS[iconKey]
    : null;

  if (LucideComp) {
    return (
      <LucideComp
        size={size}
        className={clsx('flex-shrink-0', className)}
        {...props}
      />
    );
  }

  return null;
};

export default BreezeIcon;

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

// Explicit mapping of Lucide fallback components when custom asset not available
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

// CATEGORY A: Generic Panel UI Icons & CATEGORY C: Animated Assets
const IMAGE_ICONS = {
  // Navigation & Core
  LayoutDashboard: '/images/icons/dashboard.png',
  layoutdashboard: '/images/icons/dashboard.png',
  dashboard: '/images/icons/dashboard.png',
  Dashboard: '/images/icons/dashboard.png',
  Server: '/images/icons/Server.png',
  server: '/images/icons/Server.png',
  Terminal: '/images/icons/Terminal.png',
  terminal: '/images/icons/Terminal.png',
  FolderOpen: '/images/icons/FolderOpen.png',
  folderopen: '/images/icons/FolderOpen.png',
  Users: '/images/icons/Users.png',
  users: '/images/icons/Users.png',
  User: '/images/icons/User.png',
  user: '/images/icons/User.png',
  Archive: '/images/icons/Archive.png',
  archive: '/images/icons/Archive.png',
  Calendar: '/images/icons/Calendar.png',
  calendar: '/images/icons/Calendar.png',
  Database: '/images/icons/Database.png',
  database: '/images/icons/Database.png',
  Network: '/images/icons/Network.png',
  network: '/images/icons/Network.png',
  Settings: '/images/icons/Settings.png',
  settings: '/images/icons/Settings.png',
  Shield: '/images/icons/Shield.png',
  shield: '/images/icons/Shield.png',
  ShieldAlert: '/images/icons/ShieldAlert.png',
  shieldalert: '/images/icons/ShieldAlert.png',
  ShieldCheck: '/images/icons/ShieldCheck.png',
  shieldcheck: '/images/icons/ShieldCheck.png',
  LogOut: '/images/icons/LogOut.png',
  logout: '/images/icons/LogOut.png',
  ArrowLeft: '/images/icons/ArrowLeft.png',
  arrowleft: '/images/icons/ArrowLeft.png',
  ArrowLeftIcon: '/images/icons/ArrowLeft.png',
  ArrowRight: '/images/icons/ArrowRight.png',
  arrowright: '/images/icons/ArrowRight.png',
  ArrowDownCircle: '/images/icons/ArrowDownCircle.png',
  arrowdowncircle: '/images/icons/ArrowDownCircle.png',
  PanelLeft: '/images/icons/PanelLeft.png',
  panelleft: '/images/icons/PanelLeft.png',
  Menu: '/images/icons/Menu.png',
  menu: '/images/icons/Menu.png',
  X: '/images/icons/X.png',
  x: '/images/icons/X.png',
  Close: '/images/icons/X.png',
  close: '/images/icons/X.png',
  ChevronDown: '/images/icons/ChevronDown.png',
  chevrondown: '/images/icons/ChevronDown.png',
  ChevronRight: '/images/icons/ChevronRight.png',
  chevronright: '/images/icons/ChevronRight.png',

  // Actions & Controls
  Play: '/images/icons/Play.png',
  play: '/images/icons/Play.png',
  RotateCcw: '/images/icons/RotateCcw.png',
  rotateccw: '/images/icons/RotateCcw.png',
  RotateCw: '/images/icons/RotateCw.png',
  rotatecw: '/images/icons/RotateCw.png',
  Square: '/images/icons/Square.png',
  square: '/images/icons/Square.png',
  XOctagon: '/images/icons/XOctagon.png',
  xoctagon: '/images/icons/XOctagon.png',
  PlusCircle: '/images/icons/PlusCircle.png',
  pluscircle: '/images/icons/PlusCircle.png',
  Copy: '/images/icons/Copy.png',
  copy: '/images/icons/Copy.png',
  Check: '/images/icons/Check.png',
  check: '/images/icons/Check.png',
  CheckCircle2: '/images/icons/CheckCircle2.png',
  checkcircle2: '/images/icons/CheckCircle2.png',
  Save: '/images/icons/Save.png',
  save: '/images/icons/Save.png',
  Edit: '/images/icons/Edit.png',
  edit: '/images/icons/Edit.png',
  Trash2: '/images/icons/Trash2.png',
  trash2: '/images/icons/Trash2.png',
  Search: '/images/icons/Search.png',
  search: '/images/icons/Search.png',
  Send: '/images/icons/Send.png',
  send: '/images/icons/Send.png',
  UploadCloud: '/images/icons/UploadCloud.png',
  uploadcloud: '/images/icons/UploadCloud.png',
  FolderPlus: '/images/icons/FolderPlus.png',
  folderplus: '/images/icons/FolderPlus.png',
  FilePlus: '/images/icons/FilePlus.png',
  fileplus: '/images/icons/FilePlus.png',
  FileCode: '/images/icons/FileCode.png',
  filecode: '/images/icons/FileCode.png',
  FileText: '/images/icons/FileText.png',
  filetext: '/images/icons/FileText.png',
  UserCheck: '/images/icons/UserCheck.png',
  usercheck: '/images/icons/UserCheck.png',

  // Telemetry, Metrics & Hardware
  Cpu: '/images/icons/Cpu.png',
  cpu: '/images/icons/Cpu.png',
  HardDrive: '/images/icons/HardDrive.png',
  harddrive: '/images/icons/HardDrive.png',
  Activity: '/images/icons/Activity.png',
  activity: '/images/icons/Activity.png',
  Wifi: '/images/icons/Wifi.png',
  wifi: '/images/icons/Wifi.png',
  Clock: '/images/icons/Clock.png',
  clock: '/images/icons/Clock.png',
  Radio: '/images/icons/Radio.png',
  radio: '/images/icons/Radio.png',
  Globe: '/images/icons/Globe.png',
  globe: '/images/icons/Globe.png',
  Layers: '/images/icons/Layers.png',
  layers: '/images/icons/Layers.png',
  Hash: '/images/icons/Hash.png',
  hash: '/images/icons/Hash.png',
  Lock: '/images/icons/Lock.png',
  lock: '/images/icons/Lock.png',
  Key: '/images/icons/Key.png',
  key: '/images/icons/Key.png',
  Zap: '/images/icons/Zap.png',
  zap: '/images/icons/Zap.png',
  AlertTriangle: '/images/icons/AlertTriangle.png',
  alerttriangle: '/images/icons/AlertTriangle.png',

  // CATEGORY C: Animated / State Assets
  RefreshCw: '/images/icons/RefreshCw.gif',
  refreshcw: '/images/icons/RefreshCw.gif',
  Loader2: '/images/icons/Loader2.gif',
  loader2: '/images/icons/Loader2.gif',
  AlertCircle: '/images/icons/AlertCircle.gif',
  alertcircle: '/images/icons/AlertCircle.gif',

  // CATEGORY B: Software Icons (registered for BreezeIcon access if requested)
  PaperIcon: '/images/icons/PaperIcon.png',
  VanillaIcon: '/images/icons/VanillaIcon.png',
  PurpurIcon: '/images/icons/PurpurIcon.png',
  ForgeIcon: '/images/icons/ForgeIcon.png',
  FabricIcon: '/images/icons/FabricIcon.png',
  VelocityIcon: '/images/icons/VelocityIcon.png',
};

// Optical scale compensation factors to balance visual weight across differing asset transparent margins
const OPTICAL_SCALES = {
  ChevronDown: 1.45,
  chevrondown: 1.45,
  Search: 1.25,
  search: 1.25,
  ArrowDownCircle: 1.2,
  arrowdowncircle: 1.2,
  CheckCircle2: 1.2,
  checkcircle2: 1.2,
  FilePlus: 1.2,
  fileplus: 1.2,
  Globe: 1.2,
  globe: 1.2,
  PlusCircle: 1.15,
  pluscircle: 1.15,
  Server: 1.14,
  server: 1.14,
  Terminal: 1.12,
  terminal: 1.12,
  HardDrive: 1.12,
  harddrive: 1.12,
  FolderPlus: 1.12,
  folderplus: 1.12,
  Layers: 1.12,
  layers: 1.12,
  FileCode: 1.1,
  filecode: 1.1,
  FileText: 1.1,
  filetext: 1.1,
  Edit: 1.1,
  edit: 1.1,
  RotateCw: 1.1,
  rotatecw: 1.1,
  Hash: 1.08,
  hash: 1.08,
  Copy: 1.06,
  copy: 1.06,
  FolderOpen: 1.06,
  folderopen: 1.06,
  ShieldAlert: 1.06,
  shieldalert: 1.06,
  UploadCloud: 1.06,
  uploadcloud: 1.06,
  Menu: 1.05,
  menu: 1.05,
  PurpurIcon: 1.05,
};

/**
 * Universal BreezeIcon component:
 * Renders custom PNG/GIF assets from /images/icons/ with optical weight balancing,
 * while preserving seamless fallback for unmatched symbols.
 */
export const BreezeIcon = ({
  name,
  icon: IconProp,
  size = 18,
  className,
  alt = '',
  style,
  ...props
}) => {
  // 1. Determine key name from string prop or Component function
  const iconKey = typeof name === 'string'
    ? name
    : typeof IconProp === 'string'
    ? IconProp
    : IconProp?.displayName || IconProp?.name || null;

  // 2. Check if a dedicated image asset exists in IMAGE_ICONS
  if (iconKey && IMAGE_ICONS[iconKey]) {
    const src = IMAGE_ICONS[iconKey];
    const scale = OPTICAL_SCALES[iconKey] || 1.0;
    const innerSize = Math.round(size * scale);

    return (
      <span
        className={clsx(
          'inline-flex items-center justify-center flex-shrink-0 select-none overflow-visible',
          className,
        )}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          ...style,
        }}
        {...props}
      >
        <img
          src={src}
          alt={alt || iconKey}
          width={innerSize}
          height={innerSize}
          className="object-contain flex-shrink-0 select-none max-w-none"
          style={{
            width: `${innerSize}px`,
            height: `${innerSize}px`,
          }}
          loading="eager"
          decoding="async"
        />
      </span>
    );
  }

  // 3. If direct image path was provided
  if (
    typeof iconKey === 'string' &&
    (iconKey.startsWith('/') ||
      iconKey.endsWith('.png') ||
      iconKey.endsWith('.svg') ||
      iconKey.endsWith('.gif'))
  ) {
    return (
      <span
        className={clsx(
          'inline-flex items-center justify-center flex-shrink-0 select-none',
          className,
        )}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          ...style,
        }}
        {...props}
      >
        <img
          src={iconKey}
          alt={alt}
          width={size}
          height={size}
          className="object-contain flex-shrink-0 select-none"
          style={{ width: `${size}px`, height: `${size}px` }}
          loading="eager"
          decoding="async"
        />
      </span>
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
        style={{
          width: `${size}px`,
          height: `${size}px`,
          ...style,
        }}
        {...props}
      />
    );
  }

  return null;
};

export default BreezeIcon;

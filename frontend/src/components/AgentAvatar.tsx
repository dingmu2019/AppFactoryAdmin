
import React from 'react';
import * as Icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface AgentAvatarProps extends LucideProps {
  name?: string;
  fallback?: React.ReactNode;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({ name, fallback, size = 20, className, ...props }) => {
  if (!name) return <>{fallback || <Icons.Bot size={size} className={className} {...props} />}</>;

  // Check if the name is an emoji (simple check for non-ascii or common emoji range)
  const isEmoji = /\p{Emoji}/u.test(name) && !/^[a-zA-Z0-9]+$/.test(name);
  
  if (isEmoji) {
    return <span className={className} style={{ fontSize: typeof size === 'number' ? `${size}px` : size }}>{name}</span>;
  }

  // Otherwise, try to find a Lucide icon
  const IconComponent = (Icons as any)[name];
  
  if (IconComponent) {
    return <IconComponent size={size} className={className} {...props} />;
  }

  // Fallback to Bot icon if name is provided but not found
  return <Icons.Bot size={size} className={className} {...props} />;
};

export const AGENT_ICON_OPTIONS = [
  // Core AI & Tech
  'Bot', 'Sparkles', 'Cpu', 'Zap', 'Brain', 'MessageSquare', 'Wand2', 'Ghost', 
  'Rocket', 'Microscope', 'Lightbulb', 'Search', 'Code', 'Terminal', 'Shield', 
  'Globe', 'Users', 'Music', 'Image', 'Video', 'Fingerprint', 'Atom', 'Boxes',
  'Calculator', 'Compass', 'Database', 'Eye', 'Feather', 'FlaskConical', 'Gamepad2',
  'GitBranch', 'HardDrive', 'Layers', 'Layout', 'Link', 'Network', 'Puzzle',
  // Productivity & Roles
  'Briefcase', 'Calendar', 'Camera', 'ChartBar', 'CheckCircle', 'Clipboard',
  'Cloud', 'CreditCard', 'FileText', 'Filter', 'Flag', 'Folder', 'Gift',
  'Heart', 'Home', 'Info', 'Key', 'Lock', 'Mail', 'Map', 'Moon', 'Phone',
  'Settings', 'Star', 'Sun', 'Tag', 'Target', 'Tool', 'Trash2', 'Trophy',
  'User', 'Watch', 'Wifi', 'ZapOff',
  // Specialized
  'Activity', 'Anchor', 'Archive', 'Award', 'BadgeCheck', 'Bell', 'Bike',
  'Book', 'Bookmark', 'Box', 'Calculator', 'Chrome', 'Coffee', 'Coins',
  'Command', 'Cookie', 'Crown', 'Diamond', 'Dice5', 'DollarSign', 'Dribbble',
  'Droplet', 'Facebook', 'FastForward', 'Figma', 'File', 'Film', 'Flame',
  'Frown', 'Github', 'Gitlab', 'GlassWater', 'GripVertical', 'Hash', 'Headphones',
  'HelpCircle', 'Hexagon', 'Instagram', 'Italic', 'Languages', 'Linkedin',
  'List', 'Loader', 'LogIn', 'LogOut', 'Maximize', 'Menu', 'Mic', 'Minimize',
  'Monitor', 'MoreHorizontal', 'MousePointer', 'Move', 'Navigation', 'Octagon',
  'Package', 'Paperclip', 'Pause', 'Percent', 'PieChart', 'Play', 'PlayCircle',
  'Plus', 'Pocket', 'Power', 'Printer', 'Radio', 'RefreshCcw', 'Repeat',
  'Rewind', 'RotateCcw', 'Rss', 'Save', 'Scissors', 'Send', 'Server', 'Share2',
  'ShoppingBag', 'ShoppingCart', 'Shuffle', 'SkipBack', 'SkipForward', 'Slack',
  'Slash', 'Sliders', 'Smartphone', 'Speaker', 'Square', 'StopCircle', 'Table',
  'Tablet', 'Target', 'Thermometer', 'ThumbsDown', 'ThumbsUp', 'Ticket',
  'ToggleLeft', 'ToggleRight', 'Trash', 'Trello', 'TrendingDown', 'TrendingUp',
  'Truck', 'Tv', 'Twitch', 'Twitter', 'Type', 'Umbrella', 'Underline',
  'Unlock', 'Upload', 'VideoOff', 'Voicemail', 'Volume2', 'Watch', 'Wind',
  'Youtube'
];

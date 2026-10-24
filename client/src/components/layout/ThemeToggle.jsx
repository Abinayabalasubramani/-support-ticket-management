import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';

// One button: it shows the icon of the theme you would switch TO.
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button type="button" onClick={toggle} className="btn-icon" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

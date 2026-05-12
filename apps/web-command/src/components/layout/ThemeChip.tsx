import clsx from 'clsx';

type ThemeChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function ThemeChip({ label, active = false, onClick }: ThemeChipProps) {
  return (
    <button className={clsx('theme-chip', active && 'active')} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

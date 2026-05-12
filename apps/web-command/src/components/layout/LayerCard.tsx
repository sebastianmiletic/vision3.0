import { TacticalButton } from '../ui/TacticalButton';

type LayerCardProps = {
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: () => void;
};

export function LayerCard({ title, subtitle, enabled, onToggle }: LayerCardProps) {
  return (
    <article className="layer-card">
      <div className="layer-card-row">
        <h3>{title}</h3>
        <span className={`status-dot ${enabled ? 'online' : 'offline'}`} />
      </div>
      <p>{subtitle}</p>
      <div className="layer-actions">
        <TacticalButton size="sm">CFG</TacticalButton>
        <TacticalButton size="sm" active={enabled} onClick={onToggle}>
          {enabled ? 'ON' : 'OFF'}
        </TacticalButton>
      </div>
    </article>
  );
}

type ParameterSliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function ParameterSlider({ label, value, onChange }: ParameterSliderProps) {
  return (
    <label className="parameter-slider">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

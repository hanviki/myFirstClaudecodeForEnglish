interface Props {
  enabled: boolean
  onToggle: () => void
}

export default function TranslateToggle({ enabled, onToggle }: Props) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={enabled} onChange={onToggle} />
      <span className="toggle-label">显示中文翻译</span>
    </label>
  )
}

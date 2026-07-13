export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`logo ${compact ? 'logo--compact' : ''}`}>
      <img src={`${import.meta.env.BASE_URL}images/brand/decades-logo.png`} alt="Decades Vintage" />
    </span>
  )
}

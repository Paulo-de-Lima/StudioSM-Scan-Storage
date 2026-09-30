const CLASSES = {
  'Em estoque': 'ok',
  'Estoque baixo': 'baixo',
  'Estoque crítico': 'critico',
  'Sem estoque': 'sem',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${CLASSES[status] ?? 'ok'}`}>
      <span className="badge-ponto" aria-hidden="true" />
      {status}
    </span>
  )
}

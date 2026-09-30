import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Botão "Filtrar por" que abre um painel com as opções de filtro.
 * `grupos`: [{ nome, rotulo, opcoes: [{ valor, texto }] }]
 * `valores`: { [nome]: valor } · `aoAlterar(nome, valor)` · `aoLimpar()`
 */
export default function FiltroDropdown({ grupos, valores, aoAlterar, aoLimpar, ativos }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false)
    const esc = (e) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('touchstart', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('touchstart', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  return (
    <div className="filtro-dropdown" ref={ref}>
      <button
        type="button"
        className={`botao secundario filtro-botao ${aberto ? 'aberto' : ''}`}
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="true"
      >
        <SlidersHorizontal size={18} />
        <span className="filtro-texto">Filtrar por</span>
        {ativos > 0 && (
          <span key={ativos} className="filtro-contador">
            {ativos}
          </span>
        )}
        <ChevronDown size={16} className="seta" />
      </button>

      {aberto && (
        <div className="filtro-painel" role="dialog" aria-label="Filtros">
          {grupos.map((g) => (
            <label key={g.nome} className="campo">
              <span>{g.rotulo}</span>
              <select value={valores[g.nome]} onChange={(e) => aoAlterar(g.nome, e.target.value)}>
                {g.opcoes.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="filtro-painel-acoes">
            <button type="button" className="botao texto" onClick={aoLimpar} disabled={ativos === 0}>
              Limpar filtros
            </button>
            <button type="button" className="botao primario" onClick={() => setAberto(false)}>
              Pronto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { ChevronDown, ImageOff, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { moeda } from '../utils/formato.js'

const normalizar = (texto) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Campo para escolher um produto do estoque, com busca.
 * `disponivel(produto)` informa quantas unidades ainda podem ser vendidas.
 */
export default function SeletorProduto({ produtos, selecionado, rotuloFixo, aoEscolher, disponivel, ocultar }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('touchstart', fora)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('touchstart', fora)
    }
  }, [aberto])

  const termo = normalizar(busca.trim())
  const visiveis = produtos
    .filter((p) => p.id === selecionado?.id || !ocultar.has(p.id))
    .filter((p) => !termo || normalizar(`${p.nome} ${p.marca} ${p.codigo}`).includes(termo))

  function escolher(produto) {
    aoEscolher(produto)
    setAberto(false)
    setBusca('')
  }

  // Item de um produto que já foi excluído do estoque: não pode ser trocado.
  if (rotuloFixo) {
    return (
      <div className="seletor-botao fixo" title="Este produto foi excluído do estoque">
        <span className="seletor-nome">{rotuloFixo}</span>
        <small>Produto excluído do estoque</small>
      </div>
    )
  }

  return (
    <div className="seletor" ref={ref}>
      <button
        type="button"
        className={`seletor-botao ${aberto ? 'aberto' : ''} ${selecionado ? '' : 'vazio'}`}
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
      >
        {selecionado ? (
          <>
            <span className="seletor-nome">{selecionado.nome}</span>
            <small>
              {selecionado.marca} · {moeda(selecionado.preco)}
            </small>
          </>
        ) : (
          <span className="seletor-nome">Selecionar produto…</span>
        )}
        <ChevronDown size={18} className="seta" />
      </button>

      {aberto && (
        <div className="seletor-painel">
          <div className="busca">
            <Search size={18} className="busca-icone" aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto…"
              autoFocus
              aria-label="Buscar produto"
            />
          </div>
          <ul className="seletor-lista">
            {visiveis.map((p) => {
              const livres = disponivel(p)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`seletor-opcao ${p.id === selecionado?.id ? 'atual' : ''}`}
                    onClick={() => escolher(p)}
                    disabled={livres <= 0}
                  >
                    <span className="seletor-miniatura">
                      {p.foto_url ? <img src={p.foto_url} alt="" loading="lazy" /> : <ImageOff size={18} />}
                    </span>
                    <span className="seletor-textos">
                      <span className="seletor-nome">{p.nome}</span>
                      <small>
                        {p.marca} · ID {p.codigo}
                      </small>
                    </span>
                    <span className="seletor-extra">
                      <strong>{moeda(p.preco)}</strong>
                      <small className={livres <= 0 ? 'esgotado' : ''}>
                        {livres <= 0 ? 'Sem estoque' : `${livres} em estoque`}
                      </small>
                    </span>
                  </button>
                </li>
              )
            })}
            {visiveis.length === 0 && <li className="gerenciar-vazio">Nenhum produto encontrado.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

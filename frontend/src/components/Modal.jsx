import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Pilha de modais abertos: o Esc fecha apenas o que está por cima.
const pilha = []
const DURACAO_SAIDA = 180 // ms — igual à animação em styles.css

export default function Modal({ titulo, aoFechar, children, tamanho = 'normal' }) {
  const idRef = useRef(Symbol('modal'))
  const [saindo, setSaindo] = useState(false)
  const aoFecharRef = useRef(aoFechar)
  aoFecharRef.current = aoFechar

  // Fecha com animação de saída.
  const fechar = useCallback(() => {
    setSaindo(true)
    setTimeout(() => aoFecharRef.current(), DURACAO_SAIDA)
  }, [])

  useEffect(() => {
    const id = idRef.current
    pilha.push(id)
    document.body.classList.add('sem-rolagem')
    const aoTeclar = (e) => {
      if (e.key === 'Escape' && pilha[pilha.length - 1] === id) fechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      pilha.splice(pilha.indexOf(id), 1)
      if (pilha.length === 0) document.body.classList.remove('sem-rolagem')
    }
  }, [fechar])

  return createPortal(
    <div
      className={`modal-fundo ${saindo ? 'saindo' : ''}`}
      onMouseDown={(e) => e.target === e.currentTarget && fechar()}
    >
      <div className={`modal modal-${tamanho}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-topo">
          <h2>{titulo}</h2>
          <button type="button" className="botao-icone" onClick={fechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

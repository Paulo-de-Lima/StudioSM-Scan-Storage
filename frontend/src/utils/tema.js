import { useEffect, useState } from 'react'

const CHAVE = 'studiosm-tema'

function temaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch {
    /* armazenamento indisponível */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function useTema() {
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      tema === 'escuro' ? '#1c1519' : '#b83c6f',
    )
    try {
      localStorage.setItem(CHAVE, tema)
    } catch {
      /* armazenamento indisponível */
    }
  }, [tema])

  const alternar = () => setTema((t) => (t === 'escuro' ? 'claro' : 'escuro'))
  return [tema, alternar]
}

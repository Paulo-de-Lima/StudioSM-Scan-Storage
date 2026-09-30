import { LoaderCircle, LogOut, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { EVENTO_SESSAO_EXPIRADA, sair, verificarSessao } from './api.js'
import Cadastro from './pages/Cadastro.jsx'
import Estoque from './pages/Estoque.jsx'
import Login from './pages/Login.jsx'
import { useTema } from './utils/tema.js'

function Paginas() {
  const { pathname } = useLocation()
  const emEstoque = pathname.startsWith('/estoque')

  // As duas telas ficam montadas e apenas a atual é exibida: assim um cadastro em
  // andamento (dados e foto) não se perde ao visitar o Estoque e voltar.
  return (
    <>
      <div className="pagina" hidden={emEstoque}>
        <Cadastro />
      </div>
      <div className="pagina" hidden={!emEstoque}>
        <Estoque ativo={emEstoque} />
      </div>
    </>
  )
}

export default function App() {
  const [tema, alternarTema] = useTema()
  const [sessao, setSessao] = useState('verificando') // 'verificando' | 'ok' | 'fora' | 'expirou'
  const escuro = tema === 'escuro'

  useEffect(() => {
    verificarSessao()
      .then((r) => setSessao(r.autenticado ? 'ok' : 'fora'))
      .catch(() => setSessao('fora'))
    const aoExpirar = () => setSessao((s) => (s === 'ok' ? 'expirou' : s))
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
  }, [])

  async function sairDoSistema() {
    await sair().catch(() => {})
    setSessao('fora')
  }

  const botaoTema = (
    <button
      type="button"
      className="botao-redondo botao-tema"
      onClick={alternarTema}
      aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={escuro ? 'Modo claro' : 'Modo escuro'}
    >
      <span key={tema} className="icone-girar">
        {escuro ? <Sun size={20} /> : <Moon size={20} />}
      </span>
    </button>
  )

  if (sessao === 'verificando') {
    return (
      <div className="login-tela">
        <LoaderCircle size={36} className="girando carregando-app" />
      </div>
    )
  }

  if (sessao !== 'ok') {
    return (
      <>
        <div className="login-tema">{botaoTema}</div>
        <Login aoEntrar={() => setSessao('ok')} expirou={sessao === 'expirou'} />
      </>
    )
  }

  return (
    <div className="app">
      <header className="topo">
        <div className="marca-app">
          <span className="logo" aria-hidden="true">SM</span>
          <span>StudioSM <small>Estoque</small></span>
        </div>
        <div className="topo-direita">
          <nav className="abas">
            <NavLink to="/" end>Cadastrar</NavLink>
            <NavLink to="/estoque">Estoque</NavLink>
          </nav>
          {botaoTema}
          <button type="button" className="botao-redondo" onClick={sairDoSistema} aria-label="Sair" title="Sair">
            <LogOut size={19} />
          </button>
        </div>
      </header>
      <main className="conteudo">
        <Paginas />
      </main>
    </div>
  )
}

import { CircleCheck, DollarSign, LoaderCircle, LogOut, Moon, Sun } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { EVENTO_SESSAO_EXPIRADA, sair, verificarSessao } from './api.js'
import RegistrarVenda from './components/RegistrarVenda.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Estoque from './pages/Estoque.jsx'
import Login from './pages/Login.jsx'
import Vendas from './pages/Vendas.jsx'
import { moeda } from './utils/formato.js'
import { useTema } from './utils/tema.js'
import { VendaContexto } from './utils/vendas.js'

function Paginas() {
  const { pathname } = useLocation()
  const atual = pathname.startsWith('/estoque') ? 'estoque' : pathname.startsWith('/vendas') ? 'vendas' : 'cadastro'

  // As telas ficam montadas e apenas a atual é exibida: assim um cadastro em
  // andamento (dados e foto) não se perde ao visitar outra tela e voltar.
  return (
    <>
      <div className="pagina" hidden={atual !== 'cadastro'}>
        <Cadastro />
      </div>
      <div className="pagina" hidden={atual !== 'estoque'}>
        <Estoque ativo={atual === 'estoque'} />
      </div>
      <div className="pagina" hidden={atual !== 'vendas'}>
        <Vendas ativo={atual === 'vendas'} />
      </div>
    </>
  )
}

export default function App() {
  const [tema, alternarTema] = useTema()
  const [sessao, setSessao] = useState('verificando') // 'verificando' | 'ok' | 'fora' | 'expirou'
  const [venda, setVenda] = useState(null) // null = fechado · { venda: null | objeto }
  const [aviso, setAviso] = useState(null)
  const escuro = tema === 'escuro'

  useEffect(() => {
    verificarSessao()
      .then((r) => setSessao(r.autenticado ? 'ok' : 'fora'))
      .catch(() => setSessao('fora'))
    const aoExpirar = () => setSessao((s) => (s === 'ok' ? 'expirou' : s))
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3500)
    return () => clearTimeout(t)
  }, [aviso])

  const contextoVenda = useMemo(() => ({ abrirVenda: (v = null) => setVenda({ venda: v }) }), [])
  const fecharVenda = useCallback(() => setVenda(null), [])

  function vendaSalva(salva, editada) {
    setVenda(null)
    setAviso({ id: Date.now(), texto: `${editada ? 'Venda atualizada' : 'Venda registrada'}: ${moeda(salva.total)}` })
  }

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
    <VendaContexto.Provider value={contextoVenda}>
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
              <NavLink to="/vendas">Vendas</NavLink>
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

        {/* Atalho para registrar venda (aparece em celulares e tablets). */}
        <button
          type="button"
          className="botao-venda-flutuante"
          onClick={() => contextoVenda.abrirVenda()}
          aria-label="Registrar venda"
          title="Registrar venda"
        >
          <DollarSign size={28} strokeWidth={2.4} />
        </button>

        {venda && (
          <RegistrarVenda venda={venda.venda} aoFechar={fecharVenda} aoSalvar={vendaSalva} />
        )}

        {aviso && (
          <div key={aviso.id} className="aviso-flutuante" role="status">
            <CircleCheck size={20} /> {aviso.texto}
          </div>
        )}
      </div>
    </VendaContexto.Provider>
  )
}

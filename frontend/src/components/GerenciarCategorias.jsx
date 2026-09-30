import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { atualizarCategoria, criarCategoria, excluirCategoria } from '../api.js'
import { recarregarCatalogo, useCatalogo } from '../utils/catalogo.js'
import Modal from './Modal.jsx'

function LinhaCategoria({ categoria, aoErro }) {
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [nome, setNome] = useState(categoria.nome)
  const [ocupado, setOcupado] = useState(false)

  async function executar(acao) {
    aoErro('')
    setOcupado(true)
    try {
      await acao()
      await recarregarCatalogo()
      return true
    } catch (e) {
      aoErro(e.message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function salvar(e) {
    e.preventDefault()
    if (await executar(() => atualizarCategoria(categoria.id, { nome: nome.trim() }))) setEditando(false)
  }

  if (editando) {
    return (
      <li className="gerenciar-item editando">
        <form className="gerenciar-linha-nova" onSubmit={salvar}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={60} autoFocus aria-label="Nome da categoria" />
          <button type="button" className="botao texto icone-so" onClick={() => setEditando(false)} disabled={ocupado} aria-label="Cancelar">
            <X size={18} />
          </button>
          <button type="submit" className="botao primario icone-so" disabled={ocupado} aria-label="Salvar">
            <Check size={18} />
          </button>
        </form>
      </li>
    )
  }

  const emUso = categoria.total_produtos > 0
  return (
    <li className="gerenciar-item">
      <div className="gerenciar-info">
        <strong>{categoria.nome}</strong>
        <small>{categoria.total_produtos} produto(s)</small>
      </div>
      <div className="gerenciar-botoes">
        {confirmando ? (
          <>
            <span className="confirmar-texto">Excluir?</span>
            <button type="button" className="botao texto" onClick={() => setConfirmando(false)} disabled={ocupado}>
              Não
            </button>
            <button
              type="button"
              className="botao primario perigo-cheio"
              onClick={() => executar(() => excluirCategoria(categoria.id))}
              disabled={ocupado}
            >
              Sim
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="botao secundario icone-so"
              onClick={() => {
                setNome(categoria.nome)
                setEditando(true)
              }}
              aria-label={`Renomear ${categoria.nome}`}
              title="Renomear"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              className="botao texto perigo icone-so"
              onClick={() => setConfirmando(true)}
              disabled={emUso}
              aria-label={`Excluir ${categoria.nome}`}
              title={emUso ? 'Há produtos nesta categoria' : 'Excluir'}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export default function GerenciarCategorias({ aoFechar, aoCriar }) {
  const { categorias } = useCatalogo()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function adicionar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const criada = await criarCategoria({ nome: nome.trim() })
      await recarregarCatalogo()
      setNome('')
      aoCriar?.(criada.nome)
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const termo = nome.trim().toLowerCase()
  const visiveis = termo ? categorias.filter((c) => c.nome.toLowerCase().includes(termo)) : categorias

  return (
    <Modal titulo="Categorias" aoFechar={aoFechar} tamanho="estreito">
      <form className="gerenciar-linha-nova" onSubmit={adicionar}>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          maxLength={60}
          placeholder="Nova categoria (ex.: Perfume)"
          aria-label="Nova categoria"
        />
        <button type="submit" className="botao primario com-icone" disabled={salvando}>
          <Plus size={18} /> Adicionar
        </button>
      </form>

      {erro && <p className="alerta erro">{erro}</p>}

      <ul className="gerenciar-lista">
        {visiveis.map((c) => (
          <LinhaCategoria key={c.id} categoria={c} aoErro={setErro} />
        ))}
        {visiveis.length === 0 && <li className="gerenciar-vazio">Nenhuma categoria com esse nome.</li>}
      </ul>
    </Modal>
  )
}

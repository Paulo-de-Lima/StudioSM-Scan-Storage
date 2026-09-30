import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { criarMarca, excluirMarca } from '../api.js'
import { recarregarCatalogo, useCatalogo } from '../utils/catalogo.js'
import Modal from './Modal.jsx'

function LinhaMarca({ marca, aoErro }) {
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const emUso = marca.total_produtos > 0

  async function excluir() {
    aoErro('')
    setOcupado(true)
    try {
      await excluirMarca(marca.id)
      await recarregarCatalogo()
    } catch (e) {
      aoErro(e.message)
      setOcupado(false)
    }
  }

  return (
    <li className="gerenciar-item">
      <div className="gerenciar-info">
        <strong>{marca.nome}</strong>
        <small>{marca.total_produtos} produto(s)</small>
      </div>
      <div className="gerenciar-botoes">
        {confirmando ? (
          <>
            <span className="confirmar-texto">Excluir?</span>
            <button type="button" className="botao texto" onClick={() => setConfirmando(false)} disabled={ocupado}>
              Não
            </button>
            <button type="button" className="botao primario perigo-cheio" onClick={excluir} disabled={ocupado}>
              Sim
            </button>
          </>
        ) : (
          <button
            type="button"
            className="botao texto perigo icone-so"
            onClick={() => setConfirmando(true)}
            disabled={emUso}
            aria-label={`Excluir ${marca.nome}`}
            title={emUso ? 'Há produtos desta marca' : 'Excluir'}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </li>
  )
}

export default function GerenciarMarcas({ aoFechar, aoCriar }) {
  const { marcas } = useCatalogo()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function adicionar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const criada = await criarMarca({ nome: nome.trim() })
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
  const visiveis = termo ? marcas.filter((m) => m.nome.toLowerCase().includes(termo)) : marcas

  return (
    <Modal titulo="Marcas" aoFechar={aoFechar} tamanho="estreito">
      <form className="gerenciar-linha-nova" onSubmit={adicionar}>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          maxLength={80}
          placeholder="Nova marca (ex.: Ruby Rose)"
          aria-label="Nova marca"
        />
        <button type="submit" className="botao primario com-icone" disabled={salvando}>
          <Plus size={18} /> Adicionar
        </button>
      </form>

      {erro && <p className="alerta erro">{erro}</p>}

      <ul className="gerenciar-lista">
        {visiveis.map((m) => (
          <LinhaMarca key={m.id} marca={m} aoErro={setErro} />
        ))}
        {visiveis.length === 0 && (
          <li className="gerenciar-vazio">
            {marcas.length === 0 ? 'Nenhuma marca cadastrada ainda.' : 'Nenhuma marca com esse nome.'}
          </li>
        )}
      </ul>
    </Modal>
  )
}

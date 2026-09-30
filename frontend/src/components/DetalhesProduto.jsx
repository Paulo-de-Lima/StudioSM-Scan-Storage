import { ImageOff, Pencil, Trash2 } from 'lucide-react'
import { descreverNiveis } from '../utils/catalogo.js'
import Modal from './Modal.jsx'
import StatusBadge from './StatusBadge.jsx'

const formatarData = (valor) =>
  valor ? new Date(valor.endsWith('Z') ? valor : `${valor}Z`).toLocaleString('pt-BR') : '—'

export default function DetalhesProduto({ produto, aoFechar, aoEditar, aoExcluir }) {
  return (
    <Modal titulo={produto.nome} aoFechar={aoFechar} tamanho="largo">
      <div className="detalhes">
        <div className="detalhes-foto">
          {produto.foto_url ? (
            <img src={produto.foto_url} alt={produto.nome} />
          ) : (
            <div className="foto-vazia">
              <ImageOff size={48} strokeWidth={1.5} />
              <p>Sem foto</p>
            </div>
          )}
        </div>

        <div className="detalhes-info">
          <div className="detalhes-status">
            <StatusBadge status={produto.status} />
            <span className="detalhes-quantidade">
              <strong>{produto.quantidade}</strong> unidade(s)
            </span>
          </div>

          <dl className="detalhes-lista">
            <div><dt>ID (código)</dt><dd>{produto.codigo}</dd></div>
            <div><dt>Nome</dt><dd>{produto.nome}</dd></div>
            <div><dt>Marca</dt><dd>{produto.marca}</dd></div>
            <div><dt>Categoria</dt><dd>{produto.categoria}</dd></div>
            <div>
              <dt>Níveis de estoque</dt>
              <dd className="detalhes-niveis">
                {descreverNiveis(produto).map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </dd>
            </div>
            <div><dt>Cadastrado em</dt><dd>{formatarData(produto.criado_em)}</dd></div>
            <div><dt>Última alteração</dt><dd>{formatarData(produto.atualizado_em)}</dd></div>
          </dl>

          <div className="detalhes-acoes">
            <button type="button" className="botao secundario com-icone" onClick={aoEditar}>
              <Pencil size={16} /> Editar
            </button>
            <button type="button" className="botao texto perigo com-icone" onClick={aoExcluir}>
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

import { ImageOff, Maximize2, Pencil, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { atualizarProduto, excluirProduto, listarProdutos } from '../api.js'
import DetalhesProduto from '../components/DetalhesProduto.jsx'
import FiltroDropdown from '../components/FiltroDropdown.jsx'
import Modal from '../components/Modal.jsx'
import ProdutoForm, { formDoProduto } from '../components/ProdutoForm.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { recarregarCatalogo, STATUS, useCatalogo } from '../utils/catalogo.js'
import { moeda } from '../utils/formato.js'
import { useAoAlterarEstoque } from '../utils/vendas.js'

const FILTROS_INICIAIS = { categoria: '', marca: '', status: '', ordenar: 'nome' }

const ORDENACOES = [
  { valor: 'nome', texto: 'Nome (A–Z)' },
  { valor: 'quantidade', texto: 'Menor quantidade' },
  { valor: 'recentes', texto: 'Mais recentes' },
]

const ROTULOS = { categoria: 'Categoria', marca: 'Marca', status: 'Status', ordenar: 'Ordem' }

function EditarProduto({ produto, aoSalvar, aoFechar }) {
  const [form, setForm] = useState(() => formDoProduto(produto))
  return (
    <Modal titulo="Editar produto" aoFechar={aoFechar}>
      <ProdutoForm form={form} setForm={setForm} aoSalvar={aoSalvar} aoCancelar={aoFechar} textoBotao="Salvar alterações" />
    </Modal>
  )
}

export default function Estoque({ ativo }) {
  const { categorias, marcas } = useCatalogo()
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [detalhe, setDetalhe] = useState(null)
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [erroExclusao, setErroExclusao] = useState('')

  // Aguarda o usuário parar de digitar antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  const carregar = useCallback(() => {
    setCarregando(true)
    setErro('')
    return listarProdutos({ ...filtros, busca: buscaAplicada })
      .then(setProdutos)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false))
    // `categorias` entra aqui para recarregar quando categorias são renomeadas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, buscaAplicada, categorias])

  // A tela fica montada em segundo plano; recarrega sempre que volta a ser exibida.
  useEffect(() => {
    if (ativo) carregar()
  }, [ativo, carregar])

  // Vendas registradas/editadas/excluídas mudam as quantidades.
  useAoAlterarEstoque(() => carregar())

  const grupos = [
    {
      nome: 'categoria',
      rotulo: 'Categoria',
      opcoes: [{ valor: '', texto: 'Todas' }, ...categorias.map((c) => ({ valor: c.nome, texto: c.nome }))],
    },
    {
      nome: 'marca',
      rotulo: 'Marca',
      opcoes: [{ valor: '', texto: 'Todas' }, ...marcas.map((m) => ({ valor: m.nome, texto: m.nome }))],
    },
    {
      nome: 'status',
      rotulo: 'Status do estoque',
      opcoes: [{ valor: '', texto: 'Todos' }, ...STATUS.map((s) => ({ valor: s, texto: s }))],
    },
    { nome: 'ordenar', rotulo: 'Ordenar por', opcoes: ORDENACOES },
  ]

  const ativos = Object.entries(filtros).filter(([k, v]) => v !== FILTROS_INICIAIS[k])
  const alterarFiltro = (nome, valor) => setFiltros((f) => ({ ...f, [nome]: valor }))
  const textoFiltro = (nome, valor) =>
    nome === 'ordenar' ? ORDENACOES.find((o) => o.valor === valor)?.texto : valor

  function limparTudo() {
    setBusca('')
    setBuscaAplicada('')
    setFiltros(FILTROS_INICIAIS)
  }

  async function salvarEdicao(dados) {
    await atualizarProduto(editando.id, dados)
    setEditando(null)
    carregar()
    recarregarCatalogo().catch(() => {})
  }

  async function confirmarExclusao() {
    setErroExclusao('')
    try {
      await excluirProduto(excluindo.id)
      setExcluindo(null)
      carregar()
      recarregarCatalogo().catch(() => {})
    } catch (e) {
      setErroExclusao(e.message)
    }
  }

  const fecharDetalhe = useCallback(() => setDetalhe(null), [])
  const fecharEdicao = useCallback(() => setEditando(null), [])
  const fecharExclusao = useCallback(() => {
    setExcluindo(null)
    setErroExclusao('')
  }, [])

  const contar = (status) => produtos.filter((p) => p.status === status).length
  const temFiltro = busca || ativos.length > 0

  return (
    <section>
      <div className="cartao filtros">
        <h1>Estoque</h1>
        <div className="busca-linha">
          <div className="busca">
            <Search size={18} className="busca-icone" aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar por nome, código, marca…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar produtos"
            />
          </div>
          <FiltroDropdown
            grupos={grupos}
            valores={filtros}
            aoAlterar={alterarFiltro}
            aoLimpar={() => setFiltros(FILTROS_INICIAIS)}
            ativos={ativos.length}
          />
        </div>
        {ativos.length > 0 && (
          <div className="chips">
            {ativos.map(([nome, valor]) => (
              <button
                key={nome}
                type="button"
                className="chip"
                onClick={() => alterarFiltro(nome, FILTROS_INICIAIS[nome])}
                aria-label={`Remover filtro ${ROTULOS[nome]}`}
              >
                {ROTULOS[nome]}: {textoFiltro(nome, valor)} <X size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="resumo">
        <div><strong>{produtos.length}</strong><span>produtos</span></div>
        <div><strong>{produtos.reduce((soma, p) => soma + p.quantidade, 0)}</strong><span>unidades</span></div>
        <div className="resumo-baixo"><strong>{contar('Estoque baixo')}</strong><span>estoque baixo</span></div>
        <div className="resumo-critico"><strong>{contar('Estoque crítico')}</strong><span>estoque crítico</span></div>
        <div className="resumo-sem"><strong>{contar('Sem estoque')}</strong><span>sem estoque</span></div>
      </div>

      {erro && <p className="alerta erro aparecer">{erro}</p>}

      {!carregando && !erro && produtos.length === 0 && (
        <div className="cartao vazio aparecer">
          {temFiltro ? (
            <p>
              Nenhum produto encontrado com esses filtros.{' '}
              <button type="button" className="botao texto" onClick={limparTudo}>
                Limpar tudo
              </button>
            </p>
          ) : (
            <p>
              Nenhum produto cadastrado ainda. <Link to="/">Cadastrar o primeiro</Link>
            </p>
          )}
        </div>
      )}

      <ul className="grade-produtos">
        {produtos.map((p, i) => (
          <li key={p.id} className="produto" style={{ '--atraso': `${Math.min(i, 12) * 35}ms` }}>
            <button
              type="button"
              className="produto-foto"
              onClick={() => setDetalhe(p)}
              aria-label={`Ver detalhes de ${p.nome}`}
            >
              {p.foto_url ? (
                <img src={p.foto_url} alt="" loading="lazy" />
              ) : (
                <ImageOff size={32} strokeWidth={1.5} />
              )}
              <span className="produto-foto-ampliar" aria-hidden="true">
                <Maximize2 size={18} />
              </span>
            </button>
            <div className="produto-info">
              <div className="produto-cabecalho">
                <h3>{p.nome}</h3>
                <StatusBadge status={p.status} />
              </div>
              <p className="produto-marca">{p.marca}</p>
              <dl>
                <div><dt>ID</dt><dd>{p.codigo}</dd></div>
                <div><dt>Categoria</dt><dd>{p.categoria}</dd></div>
                <div><dt>Quantidade</dt><dd>{p.quantidade}</dd></div>
                <div><dt>Preço</dt><dd>{moeda(p.preco)}</dd></div>
              </dl>
              <div className="produto-acoes">
                <button type="button" className="botao secundario com-icone" onClick={() => setEditando(p)}>
                  <Pencil size={15} /> Editar
                </button>
                <button type="button" className="botao texto perigo com-icone" onClick={() => setExcluindo(p)}>
                  <Trash2 size={15} /> Excluir
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {detalhe && (
        <DetalhesProduto
          produto={detalhe}
          aoFechar={fecharDetalhe}
          aoEditar={() => {
            setDetalhe(null)
            setEditando(detalhe)
          }}
          aoExcluir={() => {
            setDetalhe(null)
            setExcluindo(detalhe)
          }}
        />
      )}

      {editando && (
        <EditarProduto key={editando.id} produto={editando} aoSalvar={salvarEdicao} aoFechar={fecharEdicao} />
      )}

      {excluindo && (
        <Modal titulo="Excluir produto" aoFechar={fecharExclusao} tamanho="estreito">
          <p>
            Tem certeza que deseja excluir <strong>{excluindo.nome}</strong> (ID {excluindo.codigo})?
            Essa ação não pode ser desfeita.
          </p>
          {erroExclusao && <p className="alerta erro aparecer">{erroExclusao}</p>}
          <div className="form-acoes">
            <button type="button" className="botao texto" onClick={fecharExclusao}>
              Cancelar
            </button>
            <button type="button" className="botao primario perigo-cheio com-icone" onClick={confirmarExclusao}>
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

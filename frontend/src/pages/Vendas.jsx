import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  HandCoins,
  Pencil,
  Plus,
  Receipt,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { excluirVenda, listarVendas } from '../api.js'
import Modal from '../components/Modal.jsx'
import { calcularPeriodo, deslocarPeriodo, formatarDataHora, moeda, paraApi } from '../utils/formato.js'
import {
  avisarEstoqueAlterado,
  FORMAS_PAGAMENTO,
  formaPorValor,
  useAbrirVenda,
  useAoAlterarEstoque,
} from '../utils/vendas.js'

const TIPOS = [
  { valor: 'dia', texto: 'Dia' },
  { valor: 'semana', texto: 'Semana' },
  { valor: 'mes', texto: 'Mês' },
]

function FormaBadge({ forma }) {
  const info = formaPorValor[forma]
  if (!info) return <span className="forma-badge">{forma}</span>
  const { Icone, texto } = info
  return (
    <span className={`forma-badge forma-${forma}`}>
      <Icone size={14} /> {texto}
    </span>
  )
}

export default function Vendas({ ativo }) {
  const abrirVenda = useAbrirVenda()
  const [tipo, setTipo] = useState('dia')
  const [referencia, setReferencia] = useState(() => new Date())
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [formaFiltro, setFormaFiltro] = useState('')
  const [excluindo, setExcluindo] = useState(null)
  const [erroExclusao, setErroExclusao] = useState('')

  const periodo = calcularPeriodo(tipo, referencia)
  const periodoAtual = calcularPeriodo(tipo, new Date())
  const noPeriodoAtual = periodo.inicio.getTime() === periodoAtual.inicio.getTime()
  const inicio = paraApi(periodo.inicio)
  const fim = paraApi(periodo.fim)

  const carregar = useCallback(() => {
    setErro('')
    return listarVendas({ inicio, fim })
      .then(setDados)
      .catch((e) => setErro(e.message))
  }, [inicio, fim])

  useEffect(() => {
    if (ativo) carregar()
  }, [ativo, carregar])

  useAoAlterarEstoque(() => carregar())

  async function confirmarExclusao() {
    setErroExclusao('')
    try {
      await excluirVenda(excluindo.id)
      setExcluindo(null)
      avisarEstoqueAlterado()
    } catch (e) {
      setErroExclusao(e.message)
    }
  }

  const fecharExclusao = useCallback(() => {
    setExcluindo(null)
    setErroExclusao('')
  }, [])

  const resumo = dados?.resumo
  const vendas = (dados?.vendas ?? []).filter((v) => !formaFiltro || v.forma_pagamento === formaFiltro)
  const maiorForma = Math.max(...Object.values(resumo?.por_forma ?? { x: 0 }), 0.01)

  return (
    <section>
      <div className="cartao">
        <div className="vendas-cabecalho">
          <h1>Vendas</h1>
          <button type="button" className="botao primario com-icone" onClick={() => abrirVenda()}>
            <Plus size={18} /> Registrar venda
          </button>
        </div>

        <div className="periodo">
          <div className="segmentado" role="tablist" aria-label="Período">
            {TIPOS.map((t) => (
              <button
                key={t.valor}
                type="button"
                role="tab"
                aria-selected={tipo === t.valor}
                className={tipo === t.valor ? 'ativo' : ''}
                onClick={() => setTipo(t.valor)}
              >
                {t.texto}
              </button>
            ))}
          </div>

          <div className="periodo-navegacao">
            <button
              type="button"
              className="botao-redondo"
              onClick={() => setReferencia((r) => deslocarPeriodo(tipo, r, -1))}
              aria-label="Período anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <span key={periodo.rotulo} className="periodo-rotulo aparecer">
              <CalendarDays size={18} aria-hidden="true" /> {periodo.rotulo}
            </span>
            <button
              type="button"
              className="botao-redondo"
              onClick={() => setReferencia((r) => deslocarPeriodo(tipo, r, 1))}
              aria-label="Próximo período"
            >
              <ChevronRight size={20} />
            </button>
            {!noPeriodoAtual && (
              <button type="button" className="botao texto aparecer" onClick={() => setReferencia(new Date())}>
                {tipo === 'dia' ? 'Hoje' : tipo === 'semana' ? 'Esta semana' : 'Este mês'}
              </button>
            )}
          </div>
        </div>
      </div>

      {erro && <p className="alerta erro aparecer">{erro}</p>}

      <div className="faturamento">
        <div className="faturamento-card destaque">
          <span><Receipt size={18} /> Faturado</span>
          <strong key={`t${resumo?.total}`} className="valor-animado">{moeda(resumo?.total)}</strong>
          <small>{resumo?.quantidade_vendas ?? 0} venda(s) · {resumo?.itens_vendidos ?? 0} item(ns)</small>
        </div>
        <div className="faturamento-card">
          <span><Wallet size={18} /> Recebido</span>
          <strong key={`r${resumo?.recebido}`} className="valor-animado">{moeda(resumo?.recebido)}</strong>
          <small>Dinheiro, Pix e crédito</small>
        </div>
        <div className="faturamento-card a-receber">
          <span><HandCoins size={18} /> A receber</span>
          <strong key={`f${resumo?.a_receber}`} className="valor-animado">{moeda(resumo?.a_receber)}</strong>
          <small>Vendas em que a cliente ficou devendo</small>
        </div>
      </div>

      <div className="cartao por-forma">
        <h2 className="venda-secao">Por forma de pagamento</h2>
        <p className="dica">Toque em uma forma para ver só as vendas dela.</p>
        <ul>
          {FORMAS_PAGAMENTO.map(({ valor, texto, Icone }) => {
            const quantia = resumo?.por_forma?.[valor] ?? 0
            return (
              <li key={valor}>
                <button
                  type="button"
                  className={`por-forma-linha forma-${valor} ${formaFiltro === valor ? 'marcada' : ''}`}
                  onClick={() => setFormaFiltro((f) => (f === valor ? '' : valor))}
                  aria-pressed={formaFiltro === valor}
                >
                  <span className="por-forma-nome"><Icone size={18} /> {texto}</span>
                  <span className="por-forma-barra">
                    <span style={{ width: `${(quantia / maiorForma) * 100}%` }} />
                  </span>
                  <strong>{moeda(quantia)}</strong>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="historico-topo">
        <h2>Histórico</h2>
        {formaFiltro && (
          <button type="button" className="chip" onClick={() => setFormaFiltro('')}>
            {formaPorValor[formaFiltro].texto} <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {dados && vendas.length === 0 && (
        <div className="cartao vazio aparecer">
          <ShoppingBag size={32} strokeWidth={1.5} className="vazio-icone" />
          <p>Nenhuma venda {formaFiltro ? 'com essa forma de pagamento ' : ''}neste período.</p>
        </div>
      )}

      <ul className="historico">
        {vendas.map((v, i) => (
          <li key={v.id} className="venda-card" style={{ '--atraso': `${Math.min(i, 12) * 35}ms` }}>
            <div className="venda-card-topo">
              <span className="venda-card-data">
                <Clock size={15} /> {formatarDataHora(v.data_hora)}
              </span>
              <FormaBadge forma={v.forma_pagamento} />
            </div>
            <ul className="venda-card-itens">
              {v.itens.map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{item.quantidade}×</strong> {item.produto_nome}
                    {item.quantidade > 1 && <small> ({moeda(item.preco)} cada)</small>}
                    {item.desconto > 0 && (
                      <small className="venda-desconto-info"> · desconto de {moeda(item.desconto)}</small>
                    )}
                  </span>
                  <span>{moeda(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="venda-card-rodape">
              <strong className="venda-card-total">{moeda(v.total)}</strong>
              <div className="gerenciar-botoes">
                <button
                  type="button"
                  className="botao secundario icone-so"
                  onClick={() => abrirVenda(v)}
                  aria-label="Editar venda"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="botao texto perigo icone-so"
                  onClick={() => setExcluindo(v)}
                  aria-label="Excluir venda"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {excluindo && (
        <Modal titulo="Excluir venda" aoFechar={fecharExclusao} tamanho="estreito">
          <p>
            Excluir a venda de <strong>{formatarDataHora(excluindo.data_hora)}</strong> no valor de{' '}
            <strong>{moeda(excluindo.total)}</strong>?
          </p>
          <p className="dica">Os produtos desta venda voltarão para o estoque.</p>
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

import { LoaderCircle, Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { atualizarVenda, criarVenda, listarProdutos } from '../api.js'
import { moeda, paraInputDataHora } from '../utils/formato.js'
import { avisarEstoqueAlterado, FORMAS_PAGAMENTO } from '../utils/vendas.js'
import Modal from './Modal.jsx'
import SeletorProduto from './SeletorProduto.jsx'

let proximaChave = 1
const novoItem = () => ({
  chave: proximaChave++,
  produto_id: null,
  item_id: null,
  nome: '',
  quantidade: '1',
  preco: '',
  desconto: '',
})

function itensDaVenda(venda) {
  return venda.itens.map((i) => ({
    chave: proximaChave++,
    produto_id: i.produto_id,
    item_id: i.id,
    nome: i.produto_nome,
    quantidade: String(i.quantidade),
    preco: i.preco.toFixed(2),
    desconto: i.desconto ? i.desconto.toFixed(2) : '',
  }))
}

/** Modal para registrar uma venda nova (`venda` vazio) ou editar uma existente. */
export default function RegistrarVenda({ venda, aoFechar, aoSalvar }) {
  const editando = Boolean(venda)
  const [produtos, setProdutos] = useState([])
  const [itens, setItens] = useState(() => (editando ? itensDaVenda(venda) : [novoItem()]))
  const [forma, setForma] = useState(venda?.forma_pagamento ?? '')
  const [dataHora, setDataHora] = useState(() =>
    paraInputDataHora(venda ? new Date(venda.data_hora) : new Date()),
  )
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const listaRef = useRef(null)

  useEffect(() => {
    listarProdutos({ ordenar: 'nome' })
      .then(setProdutos)
      .catch((e) => setErro(e.message))
  }, [])

  const produtoPorId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])

  // Na edição, as unidades já vendidas nesta venda voltam a ficar disponíveis.
  const jaNestaVenda = useMemo(() => {
    const mapa = new Map()
    for (const i of venda?.itens ?? []) {
      if (i.produto_id != null) mapa.set(i.produto_id, (mapa.get(i.produto_id) ?? 0) + i.quantidade)
    }
    return mapa
  }, [venda])

  const disponivel = (produto) => produto.quantidade + (jaNestaVenda.get(produto.id) ?? 0)

  const pedidoPorProduto = new Map()
  for (const i of itens) {
    if (i.produto_id != null) {
      pedidoPorProduto.set(i.produto_id, (pedidoPorProduto.get(i.produto_id) ?? 0) + (Number(i.quantidade) || 0))
    }
  }
  const excedido = (item) => {
    const produto = produtoPorId.get(item.produto_id)
    return produto && pedidoPorProduto.get(produto.id) > disponivel(produto)
  }

  const bruto = (i) => (Number(i.quantidade) || 0) * (Number(i.preco) || 0)
  const subtotal = (i) => bruto(i) - (Number(i.desconto) || 0)
  const descontoInvalido = (i) => (Number(i.desconto) || 0) > bruto(i)
  const total = itens.reduce((soma, i) => soma + subtotal(i), 0)

  const alterarItem = (chave, mudancas) =>
    setItens((lista) => lista.map((i) => (i.chave === chave ? { ...i, ...mudancas } : i)))

  function adicionarItem() {
    setItens((lista) => [...lista, novoItem()])
    // Rola até o novo item depois que ele aparecer.
    setTimeout(() => listaRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (itens.some((i) => i.produto_id == null && i.item_id == null)) {
      setErro('Selecione o produto de todos os itens.')
      return
    }
    if (!forma) {
      setErro('Escolha a forma de pagamento.')
      return
    }
    const dados = {
      data_hora: `${dataHora}:00`,
      forma_pagamento: forma,
      itens: itens.map((i) => ({
        produto_id: i.produto_id,
        item_id: i.item_id,
        quantidade: Number(i.quantidade),
        preco: Number(i.preco),
        desconto: Number(i.desconto) || 0,
      })),
    }
    setSalvando(true)
    try {
      const salva = editando ? await atualizarVenda(venda.id, dados) : await criarVenda(dados)
      avisarEstoqueAlterado()
      aoSalvar(salva, editando)
    } catch (err) {
      setErro(err.message)
      setSalvando(false)
    }
  }

  const ocultarDe = (item) =>
    new Set(itens.filter((i) => i.chave !== item.chave && i.produto_id != null).map((i) => i.produto_id))

  return (
    <Modal titulo={editando ? 'Editar venda' : 'Registrar venda'} aoFechar={aoFechar}>
      <form className="venda-form" onSubmit={enviar}>
        <section>
          <h3 className="venda-secao">Produtos</h3>
          <ul className="venda-itens" ref={listaRef}>
            {itens.map((item, indice) => {
              const produto = produtoPorId.get(item.produto_id)
              return (
                <li
                  key={item.chave}
                  className={`venda-item ${excedido(item) || descontoInvalido(item) ? 'com-erro' : ''}`}
                >
                  <div className="venda-item-topo">
                    <span className="venda-item-numero">{indice + 1}</span>
                    <SeletorProduto
                      produtos={produtos}
                      selecionado={produto}
                      rotuloFixo={item.produto_id == null && item.item_id != null ? item.nome : null}
                      disponivel={disponivel}
                      ocultar={ocultarDe(item)}
                      aoEscolher={(p) => alterarItem(item.chave, { produto_id: p.id, preco: p.preco.toFixed(2) })}
                    />
                    {itens.length > 1 && (
                      <button
                        type="button"
                        className="botao texto perigo icone-so"
                        onClick={() => setItens((lista) => lista.filter((i) => i.chave !== item.chave))}
                        aria-label="Remover produto da venda"
                        title="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="venda-item-campos">
                    <div className="campo">
                      <span>Quantidade</span>
                      <div className="quantidade">
                        <button
                          type="button"
                          className="botao secundario icone-so"
                          onClick={() => alterarItem(item.chave, { quantidade: String(Math.max(1, (Number(item.quantidade) || 1) - 1)) })}
                          aria-label="Diminuir"
                        >
                          <Minus size={18} />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          required
                          value={item.quantidade}
                          onChange={(e) => alterarItem(item.chave, { quantidade: e.target.value })}
                          aria-label="Quantidade"
                        />
                        <button
                          type="button"
                          className="botao secundario icone-so"
                          onClick={() => alterarItem(item.chave, { quantidade: String((Number(item.quantidade) || 0) + 1) })}
                          aria-label="Aumentar"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                    <label className="campo">
                      <span>Preço unitário (R$)</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        required
                        value={item.preco}
                        onChange={(e) => alterarItem(item.chave, { preco: e.target.value })}
                        placeholder="0,00"
                      />
                    </label>
                    <label className="campo">
                      <span>Desconto (R$) <small className="opcional">opcional</small></span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={item.desconto}
                        onChange={(e) => alterarItem(item.chave, { desconto: e.target.value })}
                        placeholder="0,00"
                      />
                    </label>
                    <div className="campo venda-subtotal">
                      <span>Subtotal</span>
                      <strong>{moeda(subtotal(item))}</strong>
                      {Number(item.desconto) > 0 && !descontoInvalido(item) && (
                        <small className="venda-desconto-info aparecer">de {moeda(bruto(item))}</small>
                      )}
                    </div>
                  </div>

                  {descontoInvalido(item) && (
                    <p className="niveis-erro aparecer">O desconto não pode ser maior que o valor do item.</p>
                  )}
                  {excedido(item) && (
                    <p className="niveis-erro aparecer">
                      Só há {disponivel(produto)} unidade(s) de “{produto.nome}” em estoque.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          <button type="button" className="botao secundario com-icone venda-adicionar" onClick={adicionarItem}>
            <Plus size={18} /> Adicionar outro produto
          </button>
        </section>

        <section>
          <h3 className="venda-secao">Forma de pagamento</h3>
          <div className="formas-pagamento" role="radiogroup" aria-label="Forma de pagamento">
            {FORMAS_PAGAMENTO.map(({ valor, texto, Icone }) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={forma === valor}
                className={`forma-opcao forma-${valor} ${forma === valor ? 'marcada' : ''}`}
                onClick={() => setForma(valor)}
              >
                <Icone size={22} />
                {texto}
              </button>
            ))}
          </div>
        </section>

        <label className="campo venda-data">
          <span>Data e hora da venda</span>
          <input type="datetime-local" required value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
        </label>

        {erro && <p className="alerta erro aparecer">{erro}</p>}

        <div className="venda-rodape">
          <div className="venda-total">
            <span>Total</span>
            <strong key={total.toFixed(2)}>{moeda(total)}</strong>
          </div>
          <div className="form-acoes">
            <button type="button" className="botao texto" onClick={aoFechar} disabled={salvando}>
              Cancelar
            </button>
            <button
              type="submit"
              className="botao primario com-icone"
              disabled={salvando || itens.some(excedido) || itens.some(descontoInvalido)}
            >
              {salvando && <LoaderCircle size={18} className="girando" />}
              {editando ? 'Salvar alterações' : 'Registrar venda'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

import { LoaderCircle, Minus, Plus, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { calcularStatus, useCatalogo } from '../utils/catalogo.js'
import { comprimirImagem } from '../utils/imagem.js'
import FotoInput from './FotoInput.jsx'
import GerenciarCategorias from './GerenciarCategorias.jsx'
import GerenciarMarcas from './GerenciarMarcas.jsx'
import StatusBadge from './StatusBadge.jsx'

export const FORM_VAZIO = {
  campos: {
    codigo: '',
    categoria: '',
    nome: '',
    marca: '',
    preco: '',
    limite_critico: '',
    limite_baixo: '',
    em_estoque: '',
    quantidade: '',
  },
  foto: null,
  preview: null,
  removerFoto: false,
}

export function formDoProduto(produto) {
  return {
    campos: {
      codigo: produto.codigo,
      categoria: produto.categoria,
      nome: produto.nome,
      marca: produto.marca,
      preco: produto.preco.toFixed(2),
      limite_critico: String(produto.limite_critico),
      limite_baixo: String(produto.limite_baixo),
      em_estoque: String(produto.limite_baixo + 1),
      quantidade: String(produto.quantidade),
    },
    foto: null,
    preview: produto.foto_url,
    removerFoto: false,
  }
}

const CAMPOS_ENVIADOS = ['codigo', 'categoria', 'nome', 'marca', 'preco', 'limite_critico', 'limite_baixo', 'quantidade']
const numero = (texto) => (texto === '' ? NaN : Number(texto))

function SelectGerenciavel({ id, rotulo, name, valor, opcoes, aoAlterar, aoGerenciar, vazio }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="select-com-botao">
        <select id={id} name={name} value={valor} onChange={aoAlterar} required>
          <option value="" disabled>
            {vazio}
          </option>
          {opcoes.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {/* mantém visível um valor que não está mais na lista */}
          {valor && !opcoes.includes(valor) && <option value={valor}>{valor}</option>}
        </select>
        <button type="button" className="botao secundario com-icone" onClick={aoGerenciar} title="Criar ou excluir opções">
          <Settings2 size={16} /> Gerenciar
        </button>
      </div>
    </div>
  )
}

/**
 * Formulário usado tanto no cadastro quanto na edição.
 *
 * O estado (`form`) fica com quem usa o componente, para que o rascunho não se perca
 * ao trocar de tela. `aoSalvar(formData)` deve retornar uma Promise; se ela rejeitar,
 * o erro é exibido.
 */
export default function ProdutoForm({ form, setForm, aoSalvar, textoBotao = 'Salvar', aoCancelar }) {
  const { categorias, marcas } = useCatalogo()
  const { campos, preview } = form
  const [processandoFoto, setProcessandoFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [gerenciando, setGerenciando] = useState(null) // 'categorias' | 'marcas' | null

  // Libera a URL temporária da prévia quando ela deixa de ser usada.
  useEffect(() => {
    if (!preview?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const critico = numero(campos.limite_critico)
  const baixo = numero(campos.limite_baixo)
  const quantidade = numero(campos.quantidade)
  const niveisPreenchidos = !Number.isNaN(critico) && !Number.isNaN(baixo)
  const niveisValidos = niveisPreenchidos && baixo > critico
  const statusPrevisto =
    niveisValidos && !Number.isNaN(quantidade) ? calcularStatus(quantidade, critico, baixo) : null

  const atualizarCampos = (mudancas) =>
    setForm((f) => ({ ...f, campos: { ...f.campos, ...mudancas } }))

  function alterar(e) {
    const { name, value } = e.target
    // "Baixo até" e "Em estoque a partir de" andam juntos, sem deixar lacunas.
    if (name === 'limite_baixo') {
      atualizarCampos({ limite_baixo: value, em_estoque: value === '' ? '' : String(Number(value) + 1) })
    } else if (name === 'em_estoque') {
      atualizarCampos({
        em_estoque: value,
        limite_baixo: value === '' ? '' : String(Math.max(0, Number(value) - 1)),
      })
    } else {
      atualizarCampos({ [name]: value })
    }
  }

  function ajustarQuantidade(delta) {
    atualizarCampos({ quantidade: String(Math.max(0, (Number(campos.quantidade) || 0) + delta)) })
  }

  async function selecionarFoto(arquivo) {
    setProcessandoFoto(true)
    setForm((f) => ({ ...f, preview: null }))
    const comprimida = await comprimirImagem(arquivo)
    setForm((f) => ({ ...f, foto: comprimida, preview: URL.createObjectURL(comprimida), removerFoto: false }))
    setProcessandoFoto(false)
  }

  function removerFotoAtual() {
    setForm((f) => ({ ...f, foto: null, preview: null, removerFoto: true }))
  }

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (!niveisValidos) {
      setErro('O nível "Baixo até" precisa ser maior que o "Crítico até".')
      return
    }
    const dados = new FormData()
    for (const chave of CAMPOS_ENVIADOS) dados.append(chave, String(campos[chave]).trim())
    if (form.foto) dados.append('foto', form.foto)
    if (form.removerFoto) dados.append('remover_foto', 'true')

    setSalvando(true)
    try {
      await aoSalvar(dados)
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <form className="produto-form" onSubmit={enviar}>
        <FotoInput
          preview={preview}
          aoSelecionar={selecionarFoto}
          aoRemover={removerFotoAtual}
          processando={processandoFoto}
        />

        <div className="campos">
          <label className="campo">
            <span>ID (código do produto) *</span>
            <input
              name="codigo"
              value={campos.codigo}
              onChange={alterar}
              required
              maxLength={64}
              autoComplete="off"
              placeholder="Ex.: 7891234567890"
            />
          </label>

          <SelectGerenciavel
            id="campo-categoria"
            rotulo="Categoria *"
            name="categoria"
            valor={campos.categoria}
            opcoes={categorias.map((c) => c.nome)}
            aoAlterar={alterar}
            aoGerenciar={() => setGerenciando('categorias')}
            vazio="Selecione…"
          />

          <label className="campo campo-largo">
            <span>Nome *</span>
            <input
              name="nome"
              value={campos.nome}
              onChange={alterar}
              required
              maxLength={150}
              placeholder="Ex.: Batom Matte Rosa Nude"
            />
          </label>

          <SelectGerenciavel
            id="campo-marca"
            rotulo="Marca *"
            name="marca"
            valor={campos.marca}
            opcoes={marcas.map((m) => m.nome)}
            aoAlterar={alterar}
            aoGerenciar={() => setGerenciando('marcas')}
            vazio={marcas.length ? 'Selecione…' : 'Cadastre uma marca →'}
          />

          <label className="campo">
            <span>Preço de venda (R$) *</span>
            <div className="campo-moeda">
              <span aria-hidden="true">R$</span>
              <input
                name="preco"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
                value={campos.preco}
                onChange={alterar}
                placeholder="0,00"
              />
            </div>
          </label>

          <fieldset className="niveis campo-largo">
            <legend>Níveis de estoque *</legend>
            <p className="niveis-dica">
              Defina a partir de quantas unidades o estoque deste produto é crítico, baixo ou normal.
              Sem estoque é sempre 0.
            </p>
            <div className="niveis-campos">
              <label className="campo nivel nivel-critico">
                <span>Crítico até</span>
                <input name="limite_critico" type="number" inputMode="numeric" min="0" step="1" required value={campos.limite_critico} onChange={alterar} placeholder="Ex.: 5" />
              </label>
              <label className="campo nivel nivel-baixo">
                <span>Baixo até</span>
                <input name="limite_baixo" type="number" inputMode="numeric" min="1" step="1" required value={campos.limite_baixo} onChange={alterar} placeholder="Ex.: 15" />
              </label>
              <label className="campo nivel nivel-ok">
                <span>Em estoque a partir de</span>
                <input name="em_estoque" type="number" inputMode="numeric" min="2" step="1" required value={campos.em_estoque} onChange={alterar} placeholder="Ex.: 16" />
              </label>
            </div>
            {niveisPreenchidos && !niveisValidos && (
              <p className="niveis-erro aparecer">"Baixo até" precisa ser maior que "Crítico até".</p>
            )}
          </fieldset>

          <div className="campo">
            <span>Quantidade em estoque *</span>
            <div className="quantidade">
              <button type="button" className="botao secundario icone-so" onClick={() => ajustarQuantidade(-1)} aria-label="Diminuir">
                <Minus size={18} />
              </button>
              <input
                name="quantidade"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={campos.quantidade}
                onChange={alterar}
                required
                placeholder="0"
                aria-label="Quantidade em estoque"
              />
              <button type="button" className="botao secundario icone-so" onClick={() => ajustarQuantidade(1)} aria-label="Aumentar">
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="campo">
            <span>Status do estoque</span>
            <div className="status-previsto">
              {statusPrevisto ? (
                <StatusBadge key={statusPrevisto} status={statusPrevisto} />
              ) : (
                <em>{niveisValidos ? 'Informe a quantidade' : 'Defina os níveis'}</em>
              )}
            </div>
          </div>
        </div>

        {erro && <p className="alerta erro aparecer">{erro}</p>}

        <div className="form-acoes">
          {aoCancelar && (
            <button type="button" className="botao texto" onClick={aoCancelar} disabled={salvando}>
              Cancelar
            </button>
          )}
          <button type="submit" className="botao primario com-icone" disabled={salvando || processandoFoto}>
            {salvando && <LoaderCircle size={18} className="girando" />}
            {salvando ? 'Salvando…' : textoBotao}
          </button>
        </div>
      </form>

      {/* Fora do <form>: os modais têm formulários próprios. */}
      {gerenciando === 'categorias' && (
        <GerenciarCategorias aoFechar={() => setGerenciando(null)} aoCriar={(nome) => atualizarCampos({ categoria: nome })} />
      )}
      {gerenciando === 'marcas' && (
        <GerenciarMarcas aoFechar={() => setGerenciando(null)} aoCriar={(nome) => atualizarCampos({ marca: nome })} />
      )}
    </>
  )
}

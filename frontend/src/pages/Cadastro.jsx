import { CircleCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { criarProduto } from '../api.js'
import ProdutoForm, { FORM_VAZIO } from '../components/ProdutoForm.jsx'
import { recarregarCatalogo } from '../utils/catalogo.js'

export default function Cadastro() {
  // Esta tela continua montada (só fica oculta) ao ir para o Estoque,
  // então o rascunho — inclusive a foto — é preservado.
  const [form, setForm] = useState(FORM_VAZIO)
  const [ultimo, setUltimo] = useState(null)

  useEffect(() => {
    if (!ultimo) return
    const t = setTimeout(() => setUltimo(null), 5000)
    return () => clearTimeout(t)
  }, [ultimo])

  async function salvar(dados) {
    const produto = await criarProduto(dados)
    setForm(FORM_VAZIO)
    setUltimo(produto)
    recarregarCatalogo().catch(() => {})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="cartao">
      <h1>Cadastrar produto</h1>
      <p className="subtitulo">Preencha os dados e adicione uma foto do produto.</p>

      {ultimo && (
        <p key={ultimo.id} className="alerta sucesso com-icone aparecer">
          <CircleCheck size={20} />
          <span>
            “{ultimo.nome}” cadastrado com sucesso! <Link to="/estoque">Ver estoque</Link>
          </span>
        </p>
      )}

      <ProdutoForm form={form} setForm={setForm} aoSalvar={salvar} textoBotao="Cadastrar produto" />
    </section>
  )
}

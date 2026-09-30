// Disparado quando o servidor responde 401 (sessão ausente ou expirada).
export const EVENTO_SESSAO_EXPIRADA = 'studiosm:sessao-expirada'

async function requisicao(url, opcoes, { avisarSessao = true } = {}) {
  let resposta
  try {
    resposta = await fetch(url, opcoes)
  } catch {
    throw new Error('Não foi possível conectar ao servidor.')
  }
  if (!resposta.ok) {
    if (resposta.status === 401 && avisarSessao) {
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA))
    }
    let mensagem = `Erro ${resposta.status}`
    try {
      const dados = await resposta.json()
      if (typeof dados.detail === 'string') mensagem = dados.detail
      else if (Array.isArray(dados.detail)) {
        const msg = dados.detail[0]?.msg ?? ''
        mensagem = msg.startsWith('Value error, ')
          ? msg.slice('Value error, '.length)
          : 'Verifique os campos preenchidos.'
      }
    } catch {
      /* resposta sem JSON */
    }
    throw new Error(mensagem)
  }
  return resposta.status === 204 ? null : resposta.json()
}

const json = (method, corpo) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
})

// ---------- login
export const verificarSessao = () => requisicao('/api/sessao')
export const entrar = (senha) =>
  requisicao('/api/login', json('POST', { senha }), { avisarSessao: false })
export const sair = () => requisicao('/api/logout', { method: 'POST' })

// ---------- produtos
export function listarProdutos(filtros = {}) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, valor]) => valor !== '' && valor != null),
  )
  return requisicao(`/api/produtos?${params}`)
}
export const criarProduto = (formData) =>
  requisicao('/api/produtos', { method: 'POST', body: formData })
export const atualizarProduto = (id, formData) =>
  requisicao(`/api/produtos/${id}`, { method: 'PUT', body: formData })
export const excluirProduto = (id) => requisicao(`/api/produtos/${id}`, { method: 'DELETE' })

// ---------- categorias
export const listarCategorias = () => requisicao('/api/categorias')
export const criarCategoria = (dados) => requisicao('/api/categorias', json('POST', dados))
export const atualizarCategoria = (id, dados) =>
  requisicao(`/api/categorias/${id}`, json('PUT', dados))
export const excluirCategoria = (id) => requisicao(`/api/categorias/${id}`, { method: 'DELETE' })

// ---------- marcas
export const listarMarcas = () => requisicao('/api/marcas')
export const criarMarca = (dados) => requisicao('/api/marcas', json('POST', dados))
export const excluirMarca = (id) => requisicao(`/api/marcas/${id}`, { method: 'DELETE' })

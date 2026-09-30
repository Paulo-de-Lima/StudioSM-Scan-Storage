import { Banknote, CreditCard, HandCoins, QrCode } from 'lucide-react'
import { createContext, useContext, useEffect, useRef } from 'react'

export const FORMAS_PAGAMENTO = [
  { valor: 'dinheiro', texto: 'Dinheiro', Icone: Banknote },
  { valor: 'pix', texto: 'Pix', Icone: QrCode },
  { valor: 'credito', texto: 'Crédito', Icone: CreditCard },
  { valor: 'fiado', texto: 'Ficou devendo', Icone: HandCoins },
]
export const formaPorValor = Object.fromEntries(FORMAS_PAGAMENTO.map((f) => [f.valor, f]))

// ---------- modal de venda, acessível de qualquer tela
export const VendaContexto = createContext({ abrirVenda: () => {} })
export const useAbrirVenda = () => useContext(VendaContexto).abrirVenda

// ---------- aviso de que o estoque/vendas mudaram (para as telas recarregarem)
const EVENTO = 'studiosm:estoque-alterado'
export const avisarEstoqueAlterado = () => window.dispatchEvent(new Event(EVENTO))

export function useAoAlterarEstoque(callback) {
  const ref = useRef(callback)
  ref.current = callback
  useEffect(() => {
    const ouvir = () => ref.current()
    window.addEventListener(EVENTO, ouvir)
    return () => window.removeEventListener(EVENTO, ouvir)
  }, [])
}

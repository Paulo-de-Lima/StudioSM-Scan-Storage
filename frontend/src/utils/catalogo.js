import { useEffect, useState } from 'react'
import { listarCategorias, listarMarcas } from '../api.js'

export const STATUS = ['Em estoque', 'Estoque baixo', 'Estoque crítico', 'Sem estoque']

/*
 * Categorias e marcas ficam num "armazém" compartilhado: quando o usuário cria ou
 * exclui uma delas, todas as telas abertas (formulário, filtros) são atualizadas.
 */
let estado = { categorias: [], marcas: [], carregado: false }
const ouvintes = new Set()

export async function recarregarCatalogo() {
  const [categorias, marcas] = await Promise.all([listarCategorias(), listarMarcas()])
  estado = { categorias, marcas, carregado: true }
  ouvintes.forEach((ouvinte) => ouvinte(estado))
  return estado
}

export function useCatalogo() {
  const [atual, setAtual] = useState(estado)
  useEffect(() => {
    ouvintes.add(setAtual)
    recarregarCatalogo().catch(() => {})
    return () => ouvintes.delete(setAtual)
  }, [])
  return atual
}

// Mesma regra do backend, para mostrar o status enquanto o usuário digita.
export function calcularStatus(quantidade, limiteCritico, limiteBaixo) {
  if (quantidade <= 0) return 'Sem estoque'
  if (quantidade <= limiteCritico) return 'Estoque crítico'
  if (quantidade <= limiteBaixo) return 'Estoque baixo'
  return 'Em estoque'
}

export function descreverNiveis({ limite_critico, limite_baixo }) {
  const partes = []
  if (limite_critico > 0) partes.push(`Crítico: 1 a ${limite_critico}`)
  partes.push(`Baixo: ${limite_critico + 1} a ${limite_baixo}`)
  partes.push(`Em estoque: ${limite_baixo + 1}+`)
  return partes
}

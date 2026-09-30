const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const moeda = (valor) => formatoMoeda.format(valor ?? 0)

const doisDigitos = (n) => String(n).padStart(2, '0')
const maiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)

// "2026-09-30T14:30" — formato do <input type="datetime-local">, no horário local.
export const paraInputDataHora = (data) =>
  `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}` +
  `T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`

export const paraApi = (data) => `${paraInputDataHora(data)}:00`

// Datas sem fuso vindas da API são interpretadas como horário local.
export const formatarDataHora = (texto) =>
  new Date(texto).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const inicioDoDia = (data) => new Date(data.getFullYear(), data.getMonth(), data.getDate())
const somarDias = (data, dias) => new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias)
const curta = (data) => data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })

/** Intervalo [inicio, fim) do dia, semana (domingo a sábado) ou mês que contém `referencia`. */
export function calcularPeriodo(tipo, referencia) {
  const dia = inicioDoDia(referencia)
  if (tipo === 'dia') {
    return {
      inicio: dia,
      fim: somarDias(dia, 1),
      rotulo: maiuscula(dia.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })),
    }
  }
  if (tipo === 'semana') {
    const inicio = somarDias(dia, -dia.getDay())
    const fim = somarDias(inicio, 7)
    return { inicio, fim, rotulo: `${curta(inicio)} – ${curta(somarDias(fim, -1))} de ${inicio.getFullYear()}` }
  }
  const inicio = new Date(dia.getFullYear(), dia.getMonth(), 1)
  return {
    inicio,
    fim: new Date(dia.getFullYear(), dia.getMonth() + 1, 1),
    rotulo: maiuscula(inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })),
  }
}

export function deslocarPeriodo(tipo, referencia, passos) {
  if (tipo === 'dia') return somarDias(referencia, passos)
  if (tipo === 'semana') return somarDias(referencia, passos * 7)
  return new Date(referencia.getFullYear(), referencia.getMonth() + passos, 1)
}

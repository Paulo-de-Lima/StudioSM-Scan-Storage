function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (erro) => {
      URL.revokeObjectURL(url)
      reject(erro)
    }
    img.src = url
  })
}

/**
 * Reduz fotos grandes (como as tiradas pela câmera do celular) antes do envio.
 * Se o navegador não conseguir processar a imagem, devolve o arquivo original.
 */
export async function comprimirImagem(arquivo, ladoMaximo = 1280, qualidade = 0.82) {
  try {
    const img = await carregarImagem(arquivo)
    const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * escala)
    canvas.height = Math.round(img.naturalHeight * escala)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade))
    if (!blob || blob.size >= arquivo.size) return arquivo
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' })
  } catch {
    return arquivo
  }
}

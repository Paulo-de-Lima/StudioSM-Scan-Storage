import { Camera, ImageOff, Images, LoaderCircle, Trash2 } from 'lucide-react'
import { useRef } from 'react'

/**
 * Permite tirar uma foto na hora (abre a câmera no celular) ou escolher da galeria.
 * `preview` é a URL exibida; `aoSelecionar(arquivo)` recebe o File escolhido;
 * `aoRemover()` limpa a foto.
 */
export default function FotoInput({ preview, aoSelecionar, aoRemover, processando }) {
  const cameraRef = useRef(null)
  const galeriaRef = useRef(null)

  function aoMudar(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo novamente
    if (arquivo) aoSelecionar(arquivo)
  }

  return (
    <div className="foto-input">
      <div className="foto-preview">
        {preview ? (
          <img key={preview} src={preview} alt="Foto do produto" className="aparecer" />
        ) : (
          <div className="foto-vazia">
            {processando ? <LoaderCircle size={40} className="girando" /> : <ImageOff size={40} strokeWidth={1.5} />}
            <p>{processando ? 'Processando foto…' : 'Nenhuma foto'}</p>
          </div>
        )}
      </div>

      <div className="foto-acoes">
        <button type="button" className="botao secundario com-icone" onClick={() => cameraRef.current.click()}>
          <Camera size={18} /> Tirar foto
        </button>
        <button type="button" className="botao secundario com-icone" onClick={() => galeriaRef.current.click()}>
          <Images size={18} /> Galeria
        </button>
        {preview && (
          <button type="button" className="botao texto perigo com-icone" onClick={aoRemover}>
            <Trash2 size={18} /> Remover foto
          </button>
        )}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={aoMudar} />
      <input ref={galeriaRef} type="file" accept="image/*" hidden onChange={aoMudar} />
    </div>
  )
}

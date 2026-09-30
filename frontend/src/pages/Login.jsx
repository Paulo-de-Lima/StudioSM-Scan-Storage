import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn } from 'lucide-react'
import { useState } from 'react'
import { entrar } from '../api.js'

export default function Login({ aoEntrar, expirou }) {
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0) // reinicia a animação de "tremer"
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await entrar(senha)
      aoEntrar()
    } catch (err) {
      setErro(err.message)
      setTentativa((t) => t + 1)
      setSenha('')
      setEnviando(false)
    }
  }

  return (
    <div className="login-tela">
      <form key={tentativa} className={`login-cartao ${tentativa ? 'tremer' : ''}`} onSubmit={enviar}>
        <span className="logo logo-grande" aria-hidden="true">SM</span>
        <h1>StudioSM</h1>
        <p className="subtitulo">Controle de estoque</p>

        {expirou && !erro && <p className="alerta aviso">Sua sessão terminou. Entre novamente.</p>}

        <label className="campo">
          <span>Senha</span>
          <div className="senha-campo">
            <LockKeyhole size={18} className="senha-icone" aria-hidden="true" />
            <input
              type={mostrar ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
              required
              autoComplete="current-password"
              placeholder="Digite a senha"
            />
            <button
              type="button"
              className="senha-mostrar"
              onClick={() => setMostrar((m) => !m)}
              aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {erro && <p className="alerta erro aparecer">{erro}</p>}

        <button type="submit" className="botao primario com-icone login-botao" disabled={enviando || !senha}>
          {enviando ? <LoaderCircle size={18} className="girando" /> : <LogIn size={18} />}
          Entrar
        </button>
      </form>
    </div>
  )
}

"""Trava de acesso por senha única (sem contas de usuário).

Após informar a senha correta, o navegador recebe um cookie assinado válido por
30 dias. Trocar a senha (variável de ambiente STUDIOSM_SENHA) invalida as sessões.
"""

import hashlib
import hmac
import os
import secrets
import time

from .database import DATA_DIR

SENHA = os.environ.get("STUDIOSM_SENHA", "SM180206")
COOKIE_SESSAO = "studiosm_sessao"
DURACAO_SESSAO = 30 * 24 * 3600  # segundos


def _carregar_segredo() -> bytes:
    arquivo = DATA_DIR / "segredo.key"
    if not arquivo.exists():
        arquivo.write_text(secrets.token_hex(32))
    return arquivo.read_text().strip().encode()


_CHAVE = _carregar_segredo() + SENHA.encode()


def _assinar(valor: str) -> str:
    return hmac.new(_CHAVE, valor.encode(), hashlib.sha256).hexdigest()


def senha_correta(senha: str) -> bool:
    return hmac.compare_digest(senha.encode(), SENHA.encode())


def gerar_token() -> str:
    expira = str(int(time.time()) + DURACAO_SESSAO)
    return f"{expira}.{_assinar(expira)}"


def token_valido(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    expira, assinatura = token.split(".", 1)
    if not expira.isdigit() or int(expira) < time.time():
        return False
    return hmac.compare_digest(assinatura, _assinar(expira))

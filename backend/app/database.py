import unicodedata
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

engine = create_engine(
    f"sqlite:///{DATA_DIR / 'estoque.db'}",
    connect_args={"check_same_thread": False},
)


def normalizar(texto: str | None) -> str:
    """Minúsculas e sem acentos, para buscas como "liquida" encontrarem "Líquida"."""
    if texto is None:
        return ""
    decomposto = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in decomposto if not unicodedata.combining(c)).casefold()


@event.listens_for(engine, "connect")
def _registrar_funcoes(conexao, _):
    conexao.create_function("normalizar", 1, normalizar, deterministic=True)


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, case, func
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base

# Categorias criadas automaticamente na primeira execução (o usuário pode excluí-las).
CATEGORIAS_PADRAO = [
    "Base",
    "Batom",
    "Blush",
    "Bronzer / Contorno",
    "Corretivo",
    "Delineador",
    "Gloss",
    "Iluminador",
    "Lápis",
    "Máscara de cílios",
    "Paleta de sombras",
    "Pó",
    "Primer",
    "Fixador",
    "Sobrancelha",
    "Skincare",
    "Unhas",
    "Pincéis e acessórios",
    "Outros",
]

STATUS_EM_ESTOQUE = "Em estoque"
STATUS_BAIXO = "Estoque baixo"
STATUS_CRITICO = "Estoque crítico"
STATUS_SEM = "Sem estoque"


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(60), unique=True)


class Marca(Base):
    __tablename__ = "marcas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(80), unique=True)


class Produto(Base):
    __tablename__ = "produtos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    categoria: Mapped[str] = mapped_column(String(60), index=True)
    nome: Mapped[str] = mapped_column(String(150), index=True)
    marca: Mapped[str] = mapped_column(String(80), index=True)
    quantidade: Mapped[int] = mapped_column(Integer, default=0)
    # Níveis definidos pelo usuário para este produto:
    # 1..limite_critico = crítico · até limite_baixo = baixo · acima = em estoque.
    limite_critico: Mapped[int] = mapped_column(Integer)
    limite_baixo: Mapped[int] = mapped_column(Integer)
    foto: Mapped[str | None] = mapped_column(String(80), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


# O status não é gravado: é calculado na consulta a partir da quantidade e dos níveis.
EXPR_STATUS = case(
    (Produto.quantidade <= 0, STATUS_SEM),
    (Produto.quantidade <= Produto.limite_critico, STATUS_CRITICO),
    (Produto.quantidade <= Produto.limite_baixo, STATUS_BAIXO),
    else_=STATUS_EM_ESTOQUE,
)

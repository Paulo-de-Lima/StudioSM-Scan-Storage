from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, case, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
    # Valores em dinheiro são guardados em centavos para evitar erros de arredondamento.
    preco_centavos: Mapped[int] = mapped_column(Integer, default=0)
    foto: Mapped[str | None] = mapped_column(String(80), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    @property
    def preco(self) -> float:
        return self.preco_centavos / 100


FORMAS_PAGAMENTO = ["dinheiro", "pix", "credito", "fiado"]


class Venda(Base):
    __tablename__ = "vendas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Data e hora locais informadas pelo usuário (sem fuso).
    data_hora: Mapped[datetime] = mapped_column(DateTime, index=True)
    forma_pagamento: Mapped[str] = mapped_column(String(20), index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
    itens: Mapped[list["ItemVenda"]] = relationship(
        back_populates="venda", cascade="all, delete-orphan", order_by="ItemVenda.id"
    )

    @property
    def total_centavos(self) -> int:
        return sum(item.subtotal_centavos for item in self.itens)

    @property
    def total(self) -> float:
        return self.total_centavos / 100


class ItemVenda(Base):
    __tablename__ = "itens_venda"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    venda_id: Mapped[int] = mapped_column(ForeignKey("vendas.id"), index=True)
    # Fica vazio se o produto for excluído depois; nome e código ficam guardados no item.
    produto_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    produto_nome: Mapped[str] = mapped_column(String(150))
    produto_codigo: Mapped[str] = mapped_column(String(64))
    quantidade: Mapped[int] = mapped_column(Integer)
    preco_centavos: Mapped[int] = mapped_column(Integer)
    # Desconto opcional, em centavos, retirado do valor do item (preço × quantidade).
    desconto_centavos: Mapped[int] = mapped_column(Integer, default=0)

    venda: Mapped[Venda] = relationship(back_populates="itens")

    @property
    def preco(self) -> float:
        return self.preco_centavos / 100

    @property
    def desconto(self) -> float:
        return self.desconto_centavos / 100

    @property
    def subtotal_centavos(self) -> int:
        return self.preco_centavos * self.quantidade - self.desconto_centavos

    @property
    def subtotal(self) -> float:
        return self.subtotal_centavos / 100


# O status não é gravado: é calculado na consulta a partir da quantidade e dos níveis.
EXPR_STATUS = case(
    (Produto.quantidade <= 0, STATUS_SEM),
    (Produto.quantidade <= Produto.limite_critico, STATUS_CRITICO),
    (Produto.quantidade <= Produto.limite_baixo, STATUS_BAIXO),
    else_=STATUS_EM_ESTOQUE,
)

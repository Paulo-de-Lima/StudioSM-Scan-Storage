from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field


class ProdutoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    categoria: str
    nome: str
    marca: str
    quantidade: int
    limite_critico: int
    limite_baixo: int
    preco: float
    status: str
    foto: str | None
    criado_em: datetime | None
    atualizado_em: datetime | None

    @computed_field
    @property
    def foto_url(self) -> str | None:
        return f"/uploads/{self.foto}" if self.foto else None


class CategoriaIn(BaseModel):
    nome: str = Field(min_length=1, max_length=60)


class CategoriaOut(BaseModel):
    id: int
    nome: str
    total_produtos: int


class MarcaIn(BaseModel):
    nome: str = Field(min_length=1, max_length=80)


class MarcaOut(BaseModel):
    id: int
    nome: str
    total_produtos: int


class LoginIn(BaseModel):
    senha: str = Field(max_length=200)


# ---------------------------------------------------------------- vendas

FormaPagamento = Literal["dinheiro", "pix", "credito", "fiado"]


class ItemVendaIn(BaseModel):
    produto_id: int | None = None
    # Usado na edição para manter um item cujo produto já foi excluído do estoque.
    item_id: int | None = None
    quantidade: int = Field(ge=1, le=100_000)
    preco: float = Field(ge=0, le=10_000_000)
    desconto: float = Field(default=0, ge=0, le=10_000_000)


class VendaIn(BaseModel):
    data_hora: datetime
    forma_pagamento: FormaPagamento
    itens: list[ItemVendaIn] = Field(min_length=1, max_length=200)


class ItemVendaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    produto_id: int | None
    produto_nome: str
    produto_codigo: str
    quantidade: int
    preco: float
    desconto: float
    subtotal: float


class VendaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    data_hora: datetime
    forma_pagamento: str
    itens: list[ItemVendaOut]
    total: float


class ResumoVendas(BaseModel):
    total: float
    recebido: float
    a_receber: float
    quantidade_vendas: int
    itens_vendidos: int
    por_forma: dict[str, float]


class ListaVendas(BaseModel):
    vendas: list[VendaOut]
    resumo: ResumoVendas

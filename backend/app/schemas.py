from datetime import datetime

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

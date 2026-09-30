"""Registro de vendas: cada venda dá baixa no estoque dos produtos vendidos."""

from collections import Counter
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .models import FORMAS_PAGAMENTO, ItemVenda, Produto, Venda
from .schemas import ListaVendas, ResumoVendas, VendaIn, VendaOut

router = APIRouter(prefix="/api/vendas")
DB = Annotated[Session, Depends(get_db)]


def centavos(valor: float) -> int:
    return round(valor * 100)


def buscar_venda(db: Session, venda_id: int) -> Venda:
    venda = db.get(Venda, venda_id)
    if not venda:
        raise HTTPException(404, "Venda não encontrada.")
    return venda


def devolver_ao_estoque(db: Session, venda: Venda) -> None:
    for item in venda.itens:
        if item.produto_id is not None and (produto := db.get(Produto, item.produto_id)):
            produto.quantidade += item.quantidade


def montar_itens(db: Session, dados: VendaIn, itens_antigos: dict[int, ItemVenda]) -> list[ItemVenda]:
    """Cria os itens da venda e dá baixa no estoque (o estoque antigo já deve ter sido devolvido)."""
    itens: list[ItemVenda] = []
    retirar: Counter[int] = Counter()

    for entrada in dados.itens:
        if centavos(entrada.desconto) > centavos(entrada.preco) * entrada.quantidade:
            raise HTTPException(400, "O desconto não pode ser maior que o valor do item.")
        if entrada.produto_id is None:
            # Item de um produto que foi excluído: só pode ser mantido como estava.
            antigo = itens_antigos.get(entrada.item_id or -1)
            if not antigo or antigo.produto_id is not None:
                raise HTTPException(400, "Selecione o produto de todos os itens.")
            itens.append(
                ItemVenda(
                    produto_id=None,
                    produto_nome=antigo.produto_nome,
                    produto_codigo=antigo.produto_codigo,
                    quantidade=entrada.quantidade,
                    preco_centavos=centavos(entrada.preco),
                    desconto_centavos=centavos(entrada.desconto),
                )
            )
            continue

        produto = db.get(Produto, entrada.produto_id)
        if not produto:
            raise HTTPException(400, "Um dos produtos selecionados não existe mais.")
        retirar[produto.id] += entrada.quantidade
        itens.append(
            ItemVenda(
                produto_id=produto.id,
                produto_nome=produto.nome,
                produto_codigo=produto.codigo,
                quantidade=entrada.quantidade,
                preco_centavos=centavos(entrada.preco),
                desconto_centavos=centavos(entrada.desconto),
            )
        )

    for produto_id, quantidade in retirar.items():
        produto = db.get(Produto, produto_id)
        if quantidade > produto.quantidade:
            raise HTTPException(
                400,
                f"Estoque insuficiente de \"{produto.nome}\": "
                f"{produto.quantidade} disponível(is), {quantidade} na venda.",
            )
        produto.quantidade -= quantidade

    return itens


def resumir(vendas: list[Venda]) -> ResumoVendas:
    por_forma = {forma: 0 for forma in FORMAS_PAGAMENTO}
    for venda in vendas:
        por_forma[venda.forma_pagamento] = por_forma.get(venda.forma_pagamento, 0) + venda.total_centavos
    total = sum(por_forma.values())
    return ResumoVendas(
        total=total / 100,
        recebido=(total - por_forma["fiado"]) / 100,
        a_receber=por_forma["fiado"] / 100,
        quantidade_vendas=len(vendas),
        itens_vendidos=sum(item.quantidade for venda in vendas for item in venda.itens),
        por_forma={forma: valor / 100 for forma, valor in por_forma.items()},
    )


@router.get("", response_model=ListaVendas)
def listar_vendas(
    db: DB,
    inicio: datetime | None = None,
    fim: datetime | None = None,
    forma: str | None = None,
):
    consulta = select(Venda).options(selectinload(Venda.itens)).order_by(Venda.data_hora.desc(), Venda.id.desc())
    if inicio:
        consulta = consulta.where(Venda.data_hora >= inicio)
    if fim:
        consulta = consulta.where(Venda.data_hora < fim)
    if forma:
        consulta = consulta.where(Venda.forma_pagamento == forma)
    vendas = list(db.scalars(consulta).all())
    return ListaVendas(vendas=vendas, resumo=resumir(vendas))


@router.get("/{venda_id}", response_model=VendaOut)
def obter_venda(venda_id: int, db: DB):
    return buscar_venda(db, venda_id)


@router.post("", response_model=VendaOut, status_code=201)
def criar_venda(dados: VendaIn, db: DB):
    try:
        itens = montar_itens(db, dados, {})
    except HTTPException:
        db.rollback()
        raise
    venda = Venda(data_hora=dados.data_hora, forma_pagamento=dados.forma_pagamento, itens=itens)
    db.add(venda)
    db.commit()
    return buscar_venda(db, venda.id)


@router.put("/{venda_id}", response_model=VendaOut)
def atualizar_venda(venda_id: int, dados: VendaIn, db: DB):
    venda = buscar_venda(db, venda_id)
    try:
        devolver_ao_estoque(db, venda)
        itens = montar_itens(db, dados, {item.id: item for item in venda.itens})
    except HTTPException:
        db.rollback()
        raise
    venda.data_hora = dados.data_hora
    venda.forma_pagamento = dados.forma_pagamento
    venda.itens = itens
    db.commit()
    db.refresh(venda)
    return venda


@router.delete("/{venda_id}", status_code=204)
def excluir_venda(venda_id: int, db: DB):
    venda = buscar_venda(db, venda_id)
    devolver_ao_estoque(db, venda)
    db.delete(venda)
    db.commit()
    return Response(status_code=204)

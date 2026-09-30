import asyncio
import uuid
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, inspect, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth import COOKIE_SESSAO, DURACAO_SESSAO, gerar_token, senha_correta, token_valido
from .database import FRONTEND_DIST, UPLOADS_DIR, Base, SessionLocal, engine, get_db, normalizar
from .models import (
    CATEGORIAS_PADRAO,
    EXPR_STATUS,
    Categoria,
    Marca,
    Produto,
)
from .schemas import CategoriaIn, CategoriaOut, LoginIn, MarcaIn, MarcaOut, ProdutoOut


def colunas_da_tabela(con, tabela: str) -> set[str]:
    return {linha[1] for linha in con.exec_driver_sql(f"PRAGMA table_info({tabela})")}


def migrar_banco_antigo(tabelas_existentes: set[str]) -> None:
    if "produtos" not in tabelas_existentes:
        return
    with engine.begin() as con:
        colunas_produto = colunas_da_tabela(con, "produtos")
        colunas_categoria = (
            colunas_da_tabela(con, "categorias") if "categorias" in tabelas_existentes else set()
        )

        # v1 gravava o status na tabela; agora ele é calculado.
        if "status" in colunas_produto:
            con.exec_driver_sql("DROP INDEX IF EXISTS ix_produtos_status")
            con.exec_driver_sql("ALTER TABLE produtos DROP COLUMN status")

        # v2 guardava os níveis de estoque na categoria; agora cada produto tem os seus.
        if "limite_critico" not in colunas_produto:
            con.exec_driver_sql(
                "ALTER TABLE produtos ADD COLUMN limite_critico INTEGER NOT NULL DEFAULT 5"
            )
            con.exec_driver_sql(
                "ALTER TABLE produtos ADD COLUMN limite_baixo INTEGER NOT NULL DEFAULT 15"
            )
            if "limite_critico" in colunas_categoria:
                con.exec_driver_sql(
                    """UPDATE produtos SET
                         limite_critico = (SELECT c.limite_critico FROM categorias c
                                           WHERE c.nome = produtos.categoria),
                         limite_baixo = (SELECT c.limite_baixo FROM categorias c
                                         WHERE c.nome = produtos.categoria)
                       WHERE EXISTS (SELECT 1 FROM categorias c WHERE c.nome = produtos.categoria)"""
                )
        if "limite_critico" in colunas_categoria:
            con.exec_driver_sql("ALTER TABLE categorias DROP COLUMN limite_critico")
            con.exec_driver_sql("ALTER TABLE categorias DROP COLUMN limite_baixo")


def preparar_banco() -> None:
    tabelas_existentes = set(inspect(engine).get_table_names())
    migrar_banco_antigo(tabelas_existentes)

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        if "categorias" not in tabelas_existentes:
            usadas = db.scalars(select(Produto.categoria).distinct()).all()
            nomes = dict.fromkeys([*CATEGORIAS_PADRAO, *usadas])
            db.add_all(Categoria(nome=nome) for nome in nomes)
        if "marcas" not in tabelas_existentes:
            usadas = db.scalars(select(Produto.marca).distinct()).all()
            db.add_all(Marca(nome=nome) for nome in usadas)
        db.commit()


preparar_banco()

app = FastAPI(title="StudioSM - Estoque")

TAMANHO_MAX_FOTO = 10 * 1024 * 1024  # 10 MB
EXTENSOES_FOTO = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
}

DB = Annotated[Session, Depends(get_db)]
TextoObrigatorio = Annotated[str, Form(min_length=1)]


# ----------------------------------------------------------------- login

ROTAS_LIVRES = {"/api/login", "/api/logout", "/api/sessao"}


@app.middleware("http")
async def exigir_login(request: Request, call_next):
    caminho = request.url.path
    protegido = caminho.startswith("/uploads/") or (
        caminho.startswith("/api/") and caminho not in ROTAS_LIVRES
    )
    if protegido and not token_valido(request.cookies.get(COOKIE_SESSAO)):
        return JSONResponse({"detail": "Faça login para continuar."}, status_code=401)
    return await call_next(request)


@app.post("/api/login")
async def login(dados: LoginIn, response: Response):
    if not senha_correta(dados.senha):
        await asyncio.sleep(1)  # dificulta tentativas em sequência
        raise HTTPException(401, "Senha incorreta.")
    response.set_cookie(
        COOKIE_SESSAO, gerar_token(), max_age=DURACAO_SESSAO, httponly=True, samesite="lax"
    )
    return {"autenticado": True}


@app.post("/api/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_SESSAO)
    return {"autenticado": False}


@app.get("/api/sessao")
def sessao(request: Request):
    return {"autenticado": token_valido(request.cookies.get(COOKIE_SESSAO))}


# ------------------------------------------------------------ auxiliares


async def salvar_foto(foto: UploadFile) -> str:
    extensao = EXTENSOES_FOTO.get(foto.content_type or "")
    if not extensao:
        raise HTTPException(400, "Formato de imagem não suportado. Use JPG, PNG ou WEBP.")
    conteudo = await foto.read()
    if len(conteudo) > TAMANHO_MAX_FOTO:
        raise HTTPException(413, "A foto é muito grande (máximo 10 MB).")
    nome_arquivo = f"{uuid.uuid4().hex}{extensao}"
    (UPLOADS_DIR / nome_arquivo).write_bytes(conteudo)
    return nome_arquivo


def apagar_foto(nome_arquivo: str | None) -> None:
    if nome_arquivo:
        (UPLOADS_DIR / nome_arquivo).unlink(missing_ok=True)


def consulta_produtos():
    return select(Produto, EXPR_STATUS)


def com_status(linhas) -> list[ProdutoOut]:
    resultado = []
    for produto, status in linhas:
        produto.status = status
        resultado.append(ProdutoOut.model_validate(produto))
    return resultado


def produto_com_status(db: Session, produto_id: int) -> ProdutoOut:
    linha = db.execute(consulta_produtos().where(Produto.id == produto_id)).first()
    if not linha:
        raise HTTPException(404, "Produto não encontrado.")
    return com_status([linha])[0]


def buscar(db: Session, modelo, item_id: int, descricao: str):
    item = db.get(modelo, item_id)
    if not item:
        raise HTTPException(404, f"{descricao} não encontrada.")
    return item


def nome_em_uso(db: Session, modelo, nome: str, ignorar_id: int | None = None) -> bool:
    consulta = select(modelo.id).where(func.normalizar(modelo.nome) == normalizar(nome))
    if ignorar_id is not None:
        consulta = consulta.where(modelo.id != ignorar_id)
    return db.scalar(consulta) is not None


def validar_categoria_e_marca(db: Session, categoria: str, marca: str) -> None:
    if not db.scalar(select(Categoria.id).where(Categoria.nome == categoria)):
        raise HTTPException(400, f"A categoria \"{categoria}\" não existe mais. Escolha outra.")
    if not db.scalar(select(Marca.id).where(Marca.nome == marca)):
        raise HTTPException(400, f"A marca \"{marca}\" não existe mais. Escolha outra.")


def validar_niveis(limite_critico: int, limite_baixo: int) -> None:
    if limite_baixo <= limite_critico:
        raise HTTPException(
            400, "O nível de estoque baixo deve ser maior que o de estoque crítico."
        )


def commit_ou_conflito(db: Session, codigo: str) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"Já existe um produto com o código \"{codigo}\".")


def contagem_por(db: Session, coluna) -> dict[str, int]:
    return dict(db.execute(select(coluna, func.count()).group_by(coluna)).all())


# ------------------------------------------------------------ categorias


def categoria_out(categoria: Categoria, contagem: dict[str, int]) -> CategoriaOut:
    return CategoriaOut(
        id=categoria.id, nome=categoria.nome, total_produtos=contagem.get(categoria.nome, 0)
    )


@app.get("/api/categorias", response_model=list[CategoriaOut])
def listar_categorias(db: DB):
    contagem = contagem_por(db, Produto.categoria)
    categorias = db.scalars(select(Categoria).order_by(func.normalizar(Categoria.nome))).all()
    return [categoria_out(c, contagem) for c in categorias]


@app.post("/api/categorias", response_model=CategoriaOut, status_code=201)
def criar_categoria(dados: CategoriaIn, db: DB):
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(400, "Informe o nome da categoria.")
    if nome_em_uso(db, Categoria, nome):
        raise HTTPException(409, f"A categoria \"{nome}\" já existe.")
    categoria = Categoria(nome=nome)
    db.add(categoria)
    db.commit()
    return categoria_out(categoria, {})


@app.put("/api/categorias/{categoria_id}", response_model=CategoriaOut)
def atualizar_categoria(categoria_id: int, dados: CategoriaIn, db: DB):
    categoria = buscar(db, Categoria, categoria_id, "Categoria")
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(400, "Informe o nome da categoria.")
    if nome_em_uso(db, Categoria, nome, ignorar_id=categoria_id):
        raise HTTPException(409, f"A categoria \"{nome}\" já existe.")
    if nome != categoria.nome:
        db.execute(update(Produto).where(Produto.categoria == categoria.nome).values(categoria=nome))
    categoria.nome = nome
    db.commit()
    return categoria_out(categoria, contagem_por(db, Produto.categoria))


@app.delete("/api/categorias/{categoria_id}", status_code=204)
def excluir_categoria(categoria_id: int, db: DB):
    categoria = buscar(db, Categoria, categoria_id, "Categoria")
    em_uso = contagem_por(db, Produto.categoria).get(categoria.nome, 0)
    if em_uso:
        raise HTTPException(
            409,
            f"Não é possível excluir \"{categoria.nome}\": {em_uso} produto(s) usam esta categoria.",
        )
    db.delete(categoria)
    db.commit()
    return Response(status_code=204)


# ---------------------------------------------------------------- marcas


@app.get("/api/marcas", response_model=list[MarcaOut])
def listar_marcas(db: DB):
    contagem = contagem_por(db, Produto.marca)
    marcas = db.scalars(select(Marca).order_by(func.normalizar(Marca.nome))).all()
    return [MarcaOut(id=m.id, nome=m.nome, total_produtos=contagem.get(m.nome, 0)) for m in marcas]


@app.post("/api/marcas", response_model=MarcaOut, status_code=201)
def criar_marca(dados: MarcaIn, db: DB):
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(400, "Informe o nome da marca.")
    if nome_em_uso(db, Marca, nome):
        raise HTTPException(409, f"A marca \"{nome}\" já existe.")
    marca = Marca(nome=nome)
    db.add(marca)
    db.commit()
    return MarcaOut(id=marca.id, nome=marca.nome, total_produtos=0)


@app.delete("/api/marcas/{marca_id}", status_code=204)
def excluir_marca(marca_id: int, db: DB):
    marca = buscar(db, Marca, marca_id, "Marca")
    em_uso = contagem_por(db, Produto.marca).get(marca.nome, 0)
    if em_uso:
        raise HTTPException(
            409, f"Não é possível excluir \"{marca.nome}\": {em_uso} produto(s) usam esta marca."
        )
    db.delete(marca)
    db.commit()
    return Response(status_code=204)


# -------------------------------------------------------------- produtos


@app.get("/api/produtos", response_model=list[ProdutoOut])
def listar_produtos(
    db: DB,
    busca: str | None = None,
    categoria: str | None = None,
    marca: str | None = None,
    status: str | None = None,
    ordenar: Annotated[str, Query(pattern="^(nome|quantidade|recentes)$")] = "nome",
):
    consulta = consulta_produtos()
    if busca:
        termo = f"%{normalizar(busca.strip())}%"
        consulta = consulta.where(
            or_(
                *(
                    func.normalizar(coluna).like(termo)
                    for coluna in (Produto.nome, Produto.codigo, Produto.marca, Produto.categoria)
                )
            )
        )
    if categoria:
        consulta = consulta.where(Produto.categoria == categoria)
    if marca:
        consulta = consulta.where(Produto.marca == marca)
    if status:
        consulta = consulta.where(EXPR_STATUS == status)

    if ordenar == "quantidade":
        consulta = consulta.order_by(Produto.quantidade, func.normalizar(Produto.nome))
    elif ordenar == "recentes":
        consulta = consulta.order_by(Produto.id.desc())
    else:
        consulta = consulta.order_by(func.normalizar(Produto.nome))

    return com_status(db.execute(consulta).all())


@app.get("/api/produtos/{produto_id}", response_model=ProdutoOut)
def obter_produto(produto_id: int, db: DB):
    return produto_com_status(db, produto_id)


@app.post("/api/produtos", response_model=ProdutoOut, status_code=201)
async def criar_produto(
    db: DB,
    codigo: TextoObrigatorio,
    categoria: TextoObrigatorio,
    nome: TextoObrigatorio,
    marca: TextoObrigatorio,
    quantidade: Annotated[int, Form(ge=0)],
    limite_critico: Annotated[int, Form(ge=0)],
    limite_baixo: Annotated[int, Form(ge=1)],
    foto: Annotated[UploadFile | None, File()] = None,
):
    validar_niveis(limite_critico, limite_baixo)
    validar_categoria_e_marca(db, categoria.strip(), marca.strip())
    produto = Produto(
        codigo=codigo.strip(),
        categoria=categoria.strip(),
        nome=nome.strip(),
        marca=marca.strip(),
        quantidade=quantidade,
        limite_critico=limite_critico,
        limite_baixo=limite_baixo,
    )
    if foto and foto.filename:
        produto.foto = await salvar_foto(foto)

    db.add(produto)
    try:
        commit_ou_conflito(db, produto.codigo)
    except HTTPException:
        apagar_foto(produto.foto)
        raise
    return produto_com_status(db, produto.id)


@app.put("/api/produtos/{produto_id}", response_model=ProdutoOut)
async def atualizar_produto(
    produto_id: int,
    db: DB,
    codigo: TextoObrigatorio,
    categoria: TextoObrigatorio,
    nome: TextoObrigatorio,
    marca: TextoObrigatorio,
    quantidade: Annotated[int, Form(ge=0)],
    limite_critico: Annotated[int, Form(ge=0)],
    limite_baixo: Annotated[int, Form(ge=1)],
    remover_foto: Annotated[bool, Form()] = False,
    foto: Annotated[UploadFile | None, File()] = None,
):
    produto = buscar(db, Produto, produto_id, "Produto")
    validar_niveis(limite_critico, limite_baixo)
    validar_categoria_e_marca(db, categoria.strip(), marca.strip())
    foto_antiga = produto.foto
    nova_foto = await salvar_foto(foto) if foto and foto.filename else None

    produto.codigo = codigo.strip()
    produto.categoria = categoria.strip()
    produto.nome = nome.strip()
    produto.marca = marca.strip()
    produto.quantidade = quantidade
    produto.limite_critico = limite_critico
    produto.limite_baixo = limite_baixo
    if nova_foto:
        produto.foto = nova_foto
    elif remover_foto:
        produto.foto = None

    try:
        commit_ou_conflito(db, produto.codigo)
    except HTTPException:
        apagar_foto(nova_foto)
        raise
    if foto_antiga != produto.foto:
        apagar_foto(foto_antiga)
    return produto_com_status(db, produto.id)


@app.delete("/api/produtos/{produto_id}", status_code=204)
def excluir_produto(produto_id: int, db: DB):
    produto = buscar(db, Produto, produto_id, "Produto")
    foto = produto.foto
    db.delete(produto)
    db.commit()
    apagar_foto(foto)
    return Response(status_code=204)


# ---------------------------------------------------------- arquivos

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

if (FRONTEND_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")


@app.get("/{caminho:path}", include_in_schema=False)
def frontend(caminho: str):
    if caminho.startswith("api/"):
        raise HTTPException(404, "Rota não encontrada.")
    index = FRONTEND_DIST / "index.html"
    if not index.is_file():
        return Response(
            "Frontend ainda não compilado. Rode 'npm run build' na pasta frontend.",
            media_type="text/plain; charset=utf-8",
            status_code=503,
        )
    arquivo = (FRONTEND_DIST / caminho).resolve()
    if caminho and arquivo.is_file() and arquivo.is_relative_to(FRONTEND_DIST.resolve()):
        return FileResponse(arquivo)
    return FileResponse(index)

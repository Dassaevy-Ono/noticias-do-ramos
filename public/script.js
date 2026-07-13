let todasNoticias = [];
let todasCategorias = [];

async function carregarHome() {

    const respostaNoticias = await fetch("/api/noticias");
    const noticias = await respostaNoticias.json();

    const respostaCategorias = await fetch("/api/categorias");
    const categorias = await respostaCategorias.json();

    todasNoticias = noticias;
    todasCategorias = categorias;

    montarMenu(categorias);
    montarDestaque(noticias);
    montarUltimas(noticias);
    montarCategorias(noticias, categorias);

}

function limparTexto(html) {
    return (html || "")
        .replace(/<[^>]*>/g, "")
        .substring(0, 150);
}

function linkNoticia(noticia) {
    return `/noticia/${noticia.id}/${noticia.slug}`;
}

function cardNoticia(noticia) {

    return `
        <div class="card">

            ${
                noticia.imagem
                ? `<img src="${noticia.imagem}">`
                : ""
            }

            <div class="conteudo">

                <span class="categoria">
                    ${noticia.categoria}
                </span>

                <h3>
                    <a href="${linkNoticia(noticia)}">
                        ${noticia.titulo}
                    </a>
                </h3>

                <p>${limparTexto(noticia.texto)}...</p>

                <a href="${linkNoticia(noticia)}" class="ler-mais">
                    Ler mais
                </a>

            </div>

        </div>
    `;

}

function montarMenu(categorias) {

    const menu = document.getElementById("menuCategorias");

    categorias.forEach(categoria => {

        menu.innerHTML += `
            <a href="#${categoria.slug}">
                ${categoria.nome}
            </a>
        `;

    });

}

function montarDestaque(noticias) {

    const destaque = document.getElementById("destaque");

    if (noticias.length === 0) return;

    const noticia = noticias[0];

    destaque.innerHTML = `
        <h2>🔥 Destaque Principal</h2>

        <div class="card destaque">

            ${
                noticia.imagem
                ? `<img src="${noticia.imagem}">`
                : ""
            }

            <div class="conteudo">

                <span class="categoria">
                    ${noticia.categoria}
                </span>

                <h3>
                    <a href="${linkNoticia(noticia)}">
                        ${noticia.titulo}
                    </a>
                </h3>

                <p>${limparTexto(noticia.texto)}...</p>

                <a href="${linkNoticia(noticia)}" class="ler-mais">
                    Ler mais
                </a>

            </div>

        </div>
    `;

}

function montarUltimas(noticias) {

    const container = document.getElementById("ultimasNoticias");

    const ultimas = noticias.slice(1, 7);

    container.innerHTML = ultimas
        .map(cardNoticia)
        .join("");

}

function montarCategorias(noticias, categorias) {

    const container = document.getElementById("categoriasHome");

    container.innerHTML = "";

    categorias.forEach(categoria => {

        const noticiasCategoria =
            noticias
            .filter(n => n.categoria === categoria.nome)
            .slice(0, 3);

        if (noticiasCategoria.length === 0) return;

        container.innerHTML += `
            <section id="${categoria.slug}" class="secao-categoria">

                <h2>${categoria.nome}</h2>

                <div class="grid">
                    ${noticiasCategoria.map(cardNoticia).join("")}
                </div>

            </section>
        `;

    });

}

function pesquisarNoticias(){

    const termo =
        document
        .getElementById("buscaPublica")
        .value
        .toLowerCase();

    if(termo.trim() === ""){

        montarDestaque(todasNoticias);
        montarUltimas(todasNoticias);
        montarCategorias(todasNoticias, todasCategorias);
        return;

    }

    const filtradas =
        todasNoticias.filter(n => {

            const titulo =
                (n.titulo || "").toLowerCase();

            const texto =
                (n.texto || "")
                .replace(/<[^>]*>/g, "")
                .toLowerCase();

            const categoria =
                (n.categoria || "").toLowerCase();

            return (
                titulo.includes(termo) ||
                texto.includes(termo) ||
                categoria.includes(termo)
            );

        });

    document.getElementById("destaque").innerHTML = "";

    document.getElementById("ultimasNoticias").innerHTML =
        filtradas.length
        ? filtradas.map(cardNoticia).join("")
        : "<p>Nenhuma notícia encontrada.</p>";

    document.getElementById("categoriasHome").innerHTML = "";

}

document
.addEventListener("input", (e) => {

    if(e.target.id === "buscaPublica"){
        pesquisarNoticias();
    }

});
carregarHome();
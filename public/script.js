let todasNoticias = [];
let todasCategorias = [];

const el = {
    destaque: document.getElementById("destaque"),
    ultimas: document.getElementById("ultimasNoticias"),
    categorias: document.getElementById("categoriasHome"),
    menu: document.getElementById("menuCategorias"),
    busca: document.getElementById("buscaPublica"),
    estadoVazio: document.getElementById("estadoVazio"),
    botaoMenu: document.getElementById("botaoMenu"),
    voltarTopo: document.getElementById("voltarTopo"),
    maisLidas: document.getElementById("maisLidas"),
    mancheteAgora: document.getElementById("mancheteAgora")
};

async function carregarHome() {
    mostrarCarregamento();

    try {
        const [resNoticias, resCategorias] = await Promise.all([
            fetch("/api/noticias"),
            fetch("/api/categorias")
        ]);

        if (!resNoticias.ok || !resCategorias.ok) {
            throw new Error("Não foi possível carregar os dados do portal.");
        }

        const [noticias, categorias] = await Promise.all([
            resNoticias.json(),
            resCategorias.json()
        ]);

        todasNoticias = Array.isArray(noticias) ? noticias : [];
        todasCategorias = Array.isArray(categorias) ? categorias : [];

        montarMenu(todasCategorias);
        renderizarHome(todasNoticias);
    } catch (erro) {
        console.error(erro);
        mostrarErro();
    }
}

function escaparHtml(valor = "") {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function limparTexto(html = "", limite = 150) {
    const texto = String(html)
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return texto.length > limite ? `${texto.slice(0, limite).trim()}…` : texto;
}

function linkNoticia(noticia) {
    const id = encodeURIComponent(noticia.id);
    return noticia.slug
        ? `/noticia/${id}/${encodeURIComponent(noticia.slug)}`
        : `/noticia/${id}`;
}

function formatarData(data) {
    if (!data) return "Agora";
    const valor = new Date(data);
    if (Number.isNaN(valor.getTime())) return "Agora";

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(valor);
}

function imagemOuPlaceholder(noticia, classe = "") {
    const titulo = escaparHtml(noticia.titulo || "Notícia");
    const imagem = noticia.imagem ? escaparHtml(noticia.imagem) : "";

    return imagem
        ? `<img class="${classe}" src="${imagem}" alt="${titulo}" loading="lazy">`
        : `<div class="image-placeholder ${classe}" aria-hidden="true"><span>N</span></div>`;
}

function cardHero(noticia, principal = false) {
    if (!noticia) return "";

    const titulo = escaparHtml(noticia.titulo || "Notícia sem título");
    const categoria = escaparHtml(noticia.categoria || "Geral");
    const resumo = escaparHtml(limparTexto(noticia.texto, 180));

    return `
        <article class="${principal ? "hero-main" : "hero-small"}">
            <a href="${linkNoticia(noticia)}">
                <div class="hero-media">${imagemOuPlaceholder(noticia)}</div>
                <div class="hero-overlay-copy">
                    <span class="category-tag">${categoria}</span>
                    <${principal ? "h2" : "h3"}>${titulo}</${principal ? "h2" : "h3"}>
                    ${principal && resumo ? `<p>${resumo}</p>` : ""}
                </div>
            </a>
        </article>
    `;
}

function cardLista(noticia) {
    const titulo = escaparHtml(noticia.titulo || "Notícia sem título");
    const categoria = escaparHtml(noticia.categoria || "Geral");
    const resumo = escaparHtml(limparTexto(noticia.texto, 175));

    return `
        <article class="latest-card">
            <a class="latest-image" href="${linkNoticia(noticia)}">
                ${imagemOuPlaceholder(noticia)}
            </a>
            <div class="latest-content">
                <span class="category-label">${categoria}</span>
                <h3><a href="${linkNoticia(noticia)}">${titulo}</a></h3>
                ${resumo ? `<p>${resumo}</p>` : ""}
                <div class="meta-row">
                    <span>${formatarData(noticia.createdAt)}</span>
                    <a href="${linkNoticia(noticia)}">Leia mais →</a>
                </div>
            </div>
        </article>
    `;
}

function cardCategoria(noticia) {
    const titulo = escaparHtml(noticia.titulo || "Notícia sem título");
    const categoria = escaparHtml(noticia.categoria || "Geral");

    return `
        <article class="category-card">
            <a class="category-image" href="${linkNoticia(noticia)}">
                ${imagemOuPlaceholder(noticia)}
            </a>
            <div class="category-content">
                <span>${categoria}</span>
                <h3><a href="${linkNoticia(noticia)}">${titulo}</a></h3>
                <small>${formatarData(noticia.createdAt)}</small>
            </div>
        </article>
    `;
}

function montarMenu(categorias) {
    el.menu.innerHTML = `<a href="/" class="active">Início</a>`;

    categorias.forEach(categoria => {
        const nome = escaparHtml(categoria.nome || "Geral");
        const slug = escaparHtml(categoria.slug || nome.toLowerCase().replace(/\s+/g, "-"));
        el.menu.insertAdjacentHTML("beforeend", `<a href="#${slug}">${nome}</a>`);
    });
}

function montarDestaque(noticias) {
    if (!noticias.length) {
        el.destaque.innerHTML = "";
        return;
    }

    const principal = noticias[0];
    const laterais = noticias.slice(1, 5);

    el.mancheteAgora.innerHTML = `<a href="${linkNoticia(principal)}">${escaparHtml(principal.titulo || "Acompanhe as principais notícias")}</a>`;

    el.destaque.innerHTML = `
        <div class="hero-grid">
            ${cardHero(principal, true)}
            <div class="hero-side-grid">
                ${laterais.map(n => cardHero(n)).join("")}
            </div>
        </div>
    `;
}

function montarUltimas(noticias) {
    const ultimas = noticias.slice(5, 13);
    el.ultimas.innerHTML = ultimas.length
        ? ultimas.map(cardLista).join("")
        : `<p class="muted">Novas notícias serão exibidas aqui.</p>`;
}

function montarMaisLidas(noticias) {
    const ranking = [...noticias]
        .sort((a, b) => Number(b.visualizacoes || b.views || b.id || 0) - Number(a.visualizacoes || a.views || a.id || 0))
        .slice(0, 5);

    el.maisLidas.innerHTML = ranking.map((noticia, indice) => `
        <li>
            <span class="rank-number">${String(indice + 1).padStart(2, "0")}</span>
            <a href="${linkNoticia(noticia)}">${escaparHtml(noticia.titulo || "Notícia sem título")}</a>
        </li>
    `).join("");
}

function montarCategorias(noticias, categorias) {
    el.categorias.innerHTML = "";

    categorias.forEach(categoria => {
        const lista = noticias
            .filter(noticia => noticia.categoria === categoria.nome)
            .slice(0, 4);

        if (!lista.length) return;

        const nome = escaparHtml(categoria.nome || "Geral");
        const slug = escaparHtml(categoria.slug || nome.toLowerCase().replace(/\s+/g, "-"));

        el.categorias.insertAdjacentHTML("beforeend", `
            <section id="${slug}" class="category-section">
                <div class="section-title">
                    <div>
                        <span>Notícias por assunto</span>
                        <h2>${nome}</h2>
                    </div>
                    <div class="title-line"></div>
                </div>
                <div class="category-grid">
                    ${lista.map(cardCategoria).join("")}
                </div>
            </section>
        `);
    });
}

function renderizarHome(noticias) {
    el.estadoVazio.hidden = noticias.length > 0;
    montarDestaque(noticias);
    montarUltimas(noticias);
    montarMaisLidas(noticias);
    montarCategorias(noticias, todasCategorias);
}

function pesquisarNoticias() {
    const termo = el.busca.value.trim().toLowerCase();

    if (!termo) {
        renderizarHome(todasNoticias);
        return;
    }

    const filtradas = todasNoticias.filter(noticia => {
        const titulo = String(noticia.titulo || "").toLowerCase();
        const texto = String(noticia.texto || "").replace(/<[^>]*>/g, " ").toLowerCase();
        const categoria = String(noticia.categoria || "").toLowerCase();
        return titulo.includes(termo) || texto.includes(termo) || categoria.includes(termo);
    });

    el.destaque.innerHTML = "";
    el.categorias.innerHTML = "";
    el.maisLidas.innerHTML = "";
    el.estadoVazio.hidden = filtradas.length > 0;
    el.ultimas.innerHTML = filtradas.map(cardLista).join("");
}

function mostrarCarregamento() {
    el.destaque.innerHTML = `<div class="loading-box">Carregando notícias...</div>`;
    el.ultimas.innerHTML = "";
    el.categorias.innerHTML = "";
}

function mostrarErro() {
    el.destaque.innerHTML = `<div class="empty-state"><strong>Não foi possível carregar as notícias</strong><p>Atualize a página ou tente novamente em alguns instantes.</p></div>`;
    el.ultimas.innerHTML = "";
    el.categorias.innerHTML = "";
}


function configurarPesquisaMobile() {
    const caixaPesquisa = document.querySelector(".search-box");
    const botaoPesquisa = document.getElementById("botaoBusca");

    if (!caixaPesquisa || !el.busca || !botaoPesquisa) return;

    const estaNoMobile = () => window.innerWidth <= 760;

    function abrirPesquisa() {
        caixaPesquisa.classList.add("mobile-open");
        requestAnimationFrame(() => el.busca.focus());
    }

    function fecharPesquisa() {
        caixaPesquisa.classList.remove("mobile-open");
    }

    caixaPesquisa.addEventListener("submit", evento => {
        evento.preventDefault();

        if (estaNoMobile() && !caixaPesquisa.classList.contains("mobile-open")) {
            abrirPesquisa();
            return;
        }

        pesquisarNoticias();
    });

    botaoPesquisa.addEventListener("click", evento => {
        if (!estaNoMobile()) return;

        if (!caixaPesquisa.classList.contains("mobile-open")) {
            evento.preventDefault();
            abrirPesquisa();
        }
    });

    document.addEventListener("click", evento => {
        if (
            estaNoMobile() &&
            caixaPesquisa.classList.contains("mobile-open") &&
            !caixaPesquisa.contains(evento.target)
        ) {
            fecharPesquisa();
        }
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            fecharPesquisa();
            el.busca.blur();
        }
    });

    window.addEventListener("resize", () => {
        if (!estaNoMobile()) fecharPesquisa();
    });
}

function configurarInterface() {
    const agora = new Date();
    document.getElementById("anoAtual").textContent = agora.getFullYear();
    document.getElementById("dataAtual").textContent = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
    }).format(agora);

    el.busca.addEventListener("input", pesquisarNoticias);

    el.botaoMenu.addEventListener("click", () => {
        const aberto = el.menu.classList.toggle("open");
        el.botaoMenu.setAttribute("aria-expanded", String(aberto));
        document.body.classList.toggle("menu-open", aberto);
    });

    el.menu.addEventListener("click", evento => {
        if (!evento.target.matches("a")) return;
        el.menu.classList.remove("open");
        el.botaoMenu.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
    });

    window.addEventListener("scroll", () => {
        el.voltarTopo.classList.toggle("visible", window.scrollY > 500);
    });

    el.voltarTopo.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

configurarInterface();
configurarPesquisaMobile();
carregarHome();
require("dotenv").config();


const express = require("express");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./db");

function gerarSlug(texto){
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

const app = express();

// Configuração do upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads");
    },

    filename: (req, file, cb) => {
        cb(
            null,
            Date.now() + "-" + file.originalname
        );
    }
});

const upload = multer({ storage });

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use(express.static("public"));


// Página inicial
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

function verificarLogin(req, res, next){

    if(req.session.logado){
        return next();
    }

    res.redirect("/login");

}

// Página de login
app.get("/login",(req,res)=>{

    res.sendFile(
        path.join(__dirname,"views","login.html")
    );

});


// Processar login
app.post("/login", async (req, res) => {

    const { usuario, senha } = req.body;

    try {

        const [usuarios] = await db.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [usuario]
        );

        if (usuarios.length === 0) {
            return res.send("Usuário ou senha inválidos");
        }

        const usuarioBanco = usuarios[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuarioBanco.senha
        );

        if (!senhaCorreta) {
            return res.send("Usuário ou senha inválidos");
        }

        req.session.logado = true;
        req.session.usuario = {
            id: usuarioBanco.id,
            nome: usuarioBanco.nome,
            usuario: usuarioBanco.usuario
        };

        res.redirect("/admin");

    } catch (erro) {

        console.error("ERRO NO LOGIN:", erro);
        res.send("Erro ao fazer login");

    }

});


// Logout
app.get("/logout",(req,res)=>{

    req.session.destroy();

    res.redirect("/login");

});

// Painel administrativo
app.get("/admin", verificarLogin, (req, res) => {
    res.sendFile(
        path.join(__dirname, "views", "admin.html")
    );
});

// Listar notícias
app.get("/api/noticias", async (req, res) => {

    try {

        const [noticias] = await db.query(
            "SELECT * FROM noticias ORDER BY id DESC"
        );

        res.json(noticias);

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: "Erro ao buscar notícias"
        });

    }

});

// Cadastrar notícia
app.post(
    "/api/noticias",
    upload.single("imagem"),
    async (req, res) => {

        try {

            const imagem = req.file
                ? "/uploads/" + req.file.filename
                : "";

            const slug = gerarSlug(req.body.titulo);

            await db.query(
                `
                INSERT INTO noticias
                (titulo, categoria, texto, imagem, slug)
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    req.body.titulo,
                    req.body.categoria,
                    req.body.texto,
                    imagem,
                    slug
                ]
            );

            res.json({
                mensagem: "Notícia publicada!"
            });

        } catch (erro) {

            console.error("ERRO AO SALVAR:", erro);

            res.status(500).json({
                erro: "Erro ao publicar notícia"
            });

        }

    }
);

// Editar notícia
app.put(
    "/api/noticias/:id",
    upload.single("imagem"),
    async (req, res) => {

        try {

            const id = req.params.id;
            const slug = gerarSlug(req.body.titulo);

            if (req.file) {

                await db.query(
                    `
                    UPDATE noticias
                    SET titulo = ?, categoria = ?, texto = ?, imagem = ?, slug = ?
                    WHERE id = ?
                    `,
                    [
                        req.body.titulo,
                        req.body.categoria,
                        req.body.texto,
                        "/uploads/" + req.file.filename,
                        slug,
                        id
                    ]
                );

            } else {

                await db.query(
                    `
                    UPDATE noticias
                    SET titulo = ?, categoria = ?, texto = ?, slug = ?
                    WHERE id = ?
                    `,
                    [
                        req.body.titulo,
                        req.body.categoria,
                        req.body.texto,
                        slug,
                        id
                    ]
                );

            }

            res.json({
                mensagem: "Notícia atualizada!"
            });

        } catch (erro) {

            console.error("ERRO AO ATUALIZAR:", erro);

            res.status(500).json({
                erro: "Erro ao atualizar notícia"
            });

        }

    }
);

// Excluir notícia
app.delete("/api/noticias/:id", async (req, res) => {

    try {

        await db.query(
            "DELETE FROM noticias WHERE id = ?",
            [req.params.id]
        );

        res.json({
            mensagem: "Notícia excluída!"
        });

    } catch (erro) {

        console.error("ERRO AO EXCLUIR:", erro);

        res.status(500).json({
            erro: "Erro ao excluir notícia"
        });

    }

});

// Página da notícia antiga
app.get("/noticia/:id", (req, res) => {

    res.sendFile(
        path.join(__dirname, "views", "noticia.html")
    );

});

// Página da notícia com URL amigável
app.get("/noticia/:id/:slug", (req, res) => {

    res.sendFile(
        path.join(__dirname, "views", "noticia.html")
    );

});

// Listar categorias
app.get("/api/categorias", async (req, res) => {

    try {

        const [categorias] = await db.query(
            "SELECT * FROM categorias ORDER BY nome ASC"
        );

        res.json(categorias);

    } catch (erro) {

        console.error("ERRO AO BUSCAR CATEGORIAS:", erro);

        res.status(500).json({
            erro: "Erro ao buscar categorias"
        });

    }

});


const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {

    console.log(`
==================================
NOTÍCIAS DO RAMOS
Servidor iniciado!

Rodando na porta ${PORT}
==================================
    `);

});
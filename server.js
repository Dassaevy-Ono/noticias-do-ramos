require("dotenv").config();

const express = require("express");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./db");
const cloudinary = require("./cloudinary");

const app = express();
const PORT = process.env.PORT || 3000;

function gerarSlug(texto = "") {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function validarConfiguracao() {
    const obrigatorias = [
        "DB_HOST",
        "DB_USER",
        "DB_PASSWORD",
        "DB_NAME",
        "SESSION_SECRET",
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET"
    ];

    const ausentes = obrigatorias.filter((nome) => !process.env[nome]);

    if (ausentes.length > 0) {
        throw new Error(
            `Variáveis ausentes no .env: ${ausentes.join(", ")}`
        );
    }
}

async function inicializarBanco() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS noticias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo VARCHAR(255) NOT NULL,
            categoria VARCHAR(100) NOT NULL,
            texto TEXT NOT NULL,
            imagem VARCHAR(500),
            slug VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS categorias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL UNIQUE,
            slug VARCHAR(120) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            usuario VARCHAR(50) NOT NULL UNIQUE,
            senha VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.query(`
        INSERT IGNORE INTO categorias (nome, slug)
        VALUES
            ('Geral', 'geral'),
            ('Política', 'politica'),
            ('Economia', 'economia'),
            ('Esportes', 'esportes'),
            ('Tecnologia', 'tecnologia')
    `);

    console.log("✅ Banco de dados inicializado!");
}

async function sincronizarAdministrador() {
    const usuario = process.env.ADMIN_USER;
    const senhaHash = process.env.ADMIN_PASSWORD_HASH;

    if (!usuario || !senhaHash) {
        console.log("ℹ️ Sincronização do administrador não configurada.");
        return;
    }

    const [usuarios] = await db.query(
        "SELECT id FROM usuarios WHERE usuario = ?",
        [usuario]
    );

    if (usuarios.length > 0) {
        await db.query(
            "UPDATE usuarios SET senha = ? WHERE usuario = ?",
            [senhaHash, usuario]
        );

        console.log("✅ Senha do administrador atualizada!");
        return;
    }

    await db.query(
        `
        INSERT INTO usuarios (nome, usuario, senha)
        VALUES (?, ?, ?)
        `,
        ["Administrador", usuario, senhaHash]
    );

    console.log("✅ Usuário administrador criado!");
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(
                new Error("Formato inválido. Use JPG, PNG ou WEBP.")
            );
        }

        cb(null, true);
    }
});

function enviarImagemCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const preset = process.env.CLOUDINARY_UPLOAD_PRESET;

        const callback = (erro, resultado) => {
            if (erro) {
                return reject(erro);
            }

            resolve(resultado);
        };

        let stream;

        if (preset) {
            stream = cloudinary.uploader.unsigned_upload_stream(
                preset,
                {
                    folder: "noticias-do-ramos",
                    resource_type: "image"
                },
                callback
            );
        } else {
            stream = cloudinary.uploader.upload_stream(
                {
                    folder: "noticias-do-ramos",
                    resource_type: "image"
                },
                callback
            );
        }

        stream.end(buffer);
    });
}

function verificarLogin(req, res, next) {
    if (req.session.logado) {
        return next();
    }

    if (req.path.startsWith("/api/")) {
        return res.status(401).json({
            erro: "Sessão expirada. Faça login novamente."
        });
    }

    return res.redirect("/login");
}

function validarNoticia(req, res, next) {
    const { titulo, categoria, texto } = req.body;

    if (!titulo?.trim() || !categoria?.trim() || !texto?.trim()) {
        return res.status(400).json({
            erro: "Título, categoria e texto são obrigatórios."
        });
    }

    next();
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.post("/login", async (req, res) => {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
        return res.status(400).send("Informe usuário e senha.");
    }

    try {
        const [usuarios] = await db.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [usuario]
        );

        if (usuarios.length === 0) {
            return res.status(401).send("Usuário ou senha inválidos");
        }

        const usuarioBanco = usuarios[0];
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuarioBanco.senha
        );

        if (!senhaCorreta) {
            return res.status(401).send("Usuário ou senha inválidos");
        }

        req.session.logado = true;
        req.session.usuario = {
            id: usuarioBanco.id,
            nome: usuarioBanco.nome,
            usuario: usuarioBanco.usuario
        };

        return res.redirect("/admin");
    } catch (erro) {
        console.error("ERRO NO LOGIN:", erro.message);
        return res.status(500).send("Erro ao fazer login");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

app.get("/admin", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "admin.html"));
});

app.get("/api/noticias", async (req, res) => {
    try {
        const [noticias] = await db.query(
            "SELECT * FROM noticias ORDER BY id DESC"
        );

        res.json(noticias);
    } catch (erro) {
        console.error("ERRO AO BUSCAR NOTÍCIAS:", erro.message);
        res.status(500).json({
            erro: "Erro ao buscar notícias"
        });
    }
});

app.post(
    "/api/noticias",
    verificarLogin,
    upload.single("imagem"),
    validarNoticia,
    async (req, res) => {
        try {
            let imagem = "";

            if (req.file) {
                const resultadoUpload = await enviarImagemCloudinary(
                    req.file.buffer
                );

                imagem = resultadoUpload.secure_url;
            }

            const slug = gerarSlug(req.body.titulo);

            await db.query(
                `
                INSERT INTO noticias
                    (titulo, categoria, texto, imagem, slug)
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    req.body.titulo.trim(),
                    req.body.categoria.trim(),
                    req.body.texto,
                    imagem,
                    slug
                ]
            );

            res.status(201).json({
                mensagem: "Notícia publicada!"
            });
        } catch (erro) {
            console.error("ERRO AO SALVAR:", {
                message: erro.message,
                http_code: erro.http_code,
                name: erro.name
            });

            const mensagem =
                erro.http_code === 403
                    ? "O Cloudinary recusou o upload. Verifique o Upload Preset e as permissões da conta."
                    : "Erro ao publicar notícia.";

            res.status(500).json({
                erro: mensagem
            });
        }
    }
);

app.put(
    "/api/noticias/:id",
    verificarLogin,
    upload.single("imagem"),
    validarNoticia,
    async (req, res) => {
        try {
            const id = req.params.id;
            const slug = gerarSlug(req.body.titulo);
            let imagemNova = null;

            if (req.file) {
                const resultadoUpload = await enviarImagemCloudinary(
                    req.file.buffer
                );

                imagemNova = resultadoUpload.secure_url;
            }

            if (imagemNova) {
                await db.query(
                    `
                    UPDATE noticias
                    SET titulo = ?,
                        categoria = ?,
                        texto = ?,
                        imagem = ?,
                        slug = ?
                    WHERE id = ?
                    `,
                    [
                        req.body.titulo.trim(),
                        req.body.categoria.trim(),
                        req.body.texto,
                        imagemNova,
                        slug,
                        id
                    ]
                );
            } else {
                await db.query(
                    `
                    UPDATE noticias
                    SET titulo = ?,
                        categoria = ?,
                        texto = ?,
                        slug = ?
                    WHERE id = ?
                    `,
                    [
                        req.body.titulo.trim(),
                        req.body.categoria.trim(),
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
            console.error("ERRO AO ATUALIZAR:", {
                message: erro.message,
                http_code: erro.http_code,
                name: erro.name
            });

            res.status(500).json({
                erro: "Erro ao atualizar notícia"
            });
        }
    }
);

app.delete(
    "/api/noticias/:id",
    verificarLogin,
    async (req, res) => {
        try {
            await db.query(
                "DELETE FROM noticias WHERE id = ?",
                [req.params.id]
            );

            res.json({
                mensagem: "Notícia excluída!"
            });
        } catch (erro) {
            console.error("ERRO AO EXCLUIR:", erro.message);

            res.status(500).json({
                erro: "Erro ao excluir notícia"
            });
        }
    }
);

app.get("/noticia/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "noticia.html"));
});

app.get("/noticia/:id/:slug", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "noticia.html"));
});

app.get("/api/categorias", async (req, res) => {
    try {
        const [categorias] = await db.query(
            "SELECT * FROM categorias ORDER BY nome ASC"
        );

        res.json(categorias);
    } catch (erro) {
        console.error(
            "ERRO AO BUSCAR CATEGORIAS:",
            erro.message
        );

        res.status(500).json({
            erro: "Erro ao buscar categorias"
        });
    }
});

app.use((erro, req, res, next) => {
    if (erro instanceof multer.MulterError) {
        const mensagem =
            erro.code === "LIMIT_FILE_SIZE"
                ? "A imagem deve ter no máximo 5 MB."
                : erro.message;

        return res.status(400).json({
            erro: mensagem
        });
    }

    if (erro) {
        console.error("ERRO NÃO TRATADO:", erro.message);

        return res.status(400).json({
            erro: erro.message || "Erro inesperado."
        });
    }

    next();
});

async function iniciarServidor() {
    try {
        validarConfiguracao();
        await db.query("SELECT 1");
        console.log("✅ Conectado ao MySQL!");

        await inicializarBanco();
        await sincronizarAdministrador();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`
==================================
NOTÍCIAS DO RAMOS
Servidor iniciado!

Rodando na porta ${PORT}
==================================
            `);
        });
    } catch (erro) {
        console.error(
            "❌ Não foi possível iniciar o servidor:",
            erro.message
        );
        process.exit(1);
    }
}

iniciarServidor();

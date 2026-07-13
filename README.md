# 📰 Notícias do Ramos

Portal de notícias desenvolvido com **Node.js**, **Express** e **MySQL**, com painel administrativo para gerenciamento de notícias.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)
![Node.js](https://img.shields.io/badge/Node.js-✓-green)
![MySQL](https://img.shields.io/badge/MySQL-✓-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

# 📸 Telas do Sistema

> Em breve serão adicionadas capturas de tela da aplicação.

- Página Inicial
- Página da Notícia
- Painel Administrativo
- Login

---

# 🚀 Tecnologias utilizadas

- Node.js
- Express.js
- MySQL
- HTML5
- CSS3
- JavaScript
- CKEditor
- Multer
- Express Session
- bcrypt
- dotenv

---

# ✨ Funcionalidades

- Cadastro de notícias
- Edição de notícias
- Exclusão de notícias
- Upload de imagens
- Sistema de Login
- Logout
- Dashboard Administrativo
- Editor de texto (CKEditor)
- URLs amigáveis (Slug)
- Categorias
- Busca de notícias
- Destaque principal
- SEO básico

---

# 📂 Estrutura do Projeto

```
Site de Noticias
│
├── public/
│   ├── uploads/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── views/
│   ├── admin.html
│   ├── login.html
│   └── noticia.html
│
├── server.js
├── db.js
├── package.json
├── .env
└── README.md
```

---

# ⚙️ Instalação

Clone o projeto

```bash
git clone https://github.com/SEU-USUARIO/site-de-noticias.git
```

Entre na pasta

```bash
cd site-de-noticias
```

Instale as dependências

```bash
npm install
```

Configure o arquivo `.env`

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=noticias_db

SESSION_SECRET=uma-chave-segura
```

Inicie o servidor

```bash
node server.js
```

Acesse:

```
http://localhost:3000
```

Painel administrativo:

```
http://localhost:3000/admin
```

---

# 📈 Roadmap

- ✅ CRUD de notícias
- ✅ Upload de imagens
- ✅ Login
- ✅ Dashboard
- ✅ Slug automático
- ✅ Categorias
- 🔲 Comentários
- 🔲 Compartilhamento em redes sociais
- 🔲 Notícias relacionadas
- 🔲 Sistema de usuários
- 🔲 Recuperação de senha
- 🔲 Publicação agendada
- 🔲 SEO avançado
- 🔲 API REST

---

# 👨‍💻 Autor

**Dassaevy Ono**

Desenvolvido como projeto de estudo em Node.js, Express e MySQL.

---

# 📄 Licença

Este projeto está licenciado sob a licença MIT.
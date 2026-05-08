# 🧠 MindMap App — Guia de Instalação no VPS

## Stack
- **Frontend**: React + Vite (código no artifact)
- **Backend**: Node.js 18+ / Express
- **Banco**: MySQL 5.7+ ou MariaDB 10.3+

---

## 1. Banco de Dados (MySQL)

```bash
mysql -u root -p
```
```sql
CREATE USER 'mindmap_user'@'localhost' IDENTIFIED BY 'senha_segura';
GRANT ALL PRIVILEGES ON mindmap_db.* TO 'mindmap_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
mysql -u mindmap_user -p mindmap_db < schema.sql
```

---

## 2. Backend

```bash
cd mindmap-backend
cp .env.example .env
# Edite o .env com suas credenciais
nano .env

npm install
```

### Produção com PM2
```bash
npm install -g pm2
pm2 start server.js --name mindmap
pm2 save
pm2 startup
```

---

## 3. Frontend (React + Vite)

```bash
# Na pasta do frontend (onde está o código React)
npm create vite@latest mindmap-frontend -- --template react
# Cole o arquivo App.jsx / main.jsx
npm install
npm run build
# Copie dist/ para a pasta public/ do backend:
cp -r dist/* ../mindmap-backend/public/
```

---

## 4. Nginx (proxy reverso)

```nginx
server {
    listen 80;
    server_name seudomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Arquivos de upload
    location /uploads/ {
        alias /caminho/para/mindmap-backend/uploads/;
        expires 30d;
    }
}
```

```bash
sudo certbot --nginx -d seudomain.com   # HTTPS com Let's Encrypt
```

---

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/maps` | Listar meus mapas |
| POST | `/api/maps` | Criar mapa |
| GET | `/api/maps/:id` | Buscar mapa |
| PUT | `/api/maps/:id` | Salvar mapa |
| DELETE | `/api/maps/:id` | Deletar mapa |
| POST | `/api/maps/:id/share` | Compartilhar |
| GET | `/api/share/:token` | Mapa público |
| POST | `/api/maps/:id/upload` | Upload de imagem |
| GET | `/api/maps/:id/history` | Versões anteriores |
| POST | `/api/maps/:id/history/:histId/restore` | Restaurar versão |

---

## Salvar o mapa do frontend (exemplo)

```javascript
// Após edições, chame esta função
async function saveMap(mapId, mapData) {
  await fetch(`/api/maps/${mapId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      title: 'Meu Mapa',
      bg_color: '#0d0d14',
      data: mapData  // { nodes: {}, extras: [] }
    })
  });
}
```

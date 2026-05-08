/**
 * MindMap App — Backend (Node.js / Express + MySQL)
 * ---------------------------------------------------
 * Instalar dependências:  npm install
 * Executar em dev:        node server.js
 * Executar em produção:   pm2 start server.js --name mindmap
 */

require('dotenv').config();
const express      = require('express');
const mysql        = require('mysql2/promise');
const bcrypt       = require('bcrypt');
const jwt          = require('jsonwebtoken');
const cors         = require('cors');
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const { v4: uuid } = require('uuid');
const crypto       = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'troque-por-secret-forte';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── DB Pool ───────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME     || 'mindmap_db',
  waitForConnections: true,
  connectionLimit: 10,
});

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public'))); // frontend build

// ─── Upload (multer) ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => cb(null, uuid() + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/gif','image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Auth middleware ─────────────────────────────────────────
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token obrigatório' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// ═══════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios' });

    const [rows] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (rows.length) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(password, 10);
    const id = uuid();
    await pool.query('INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)', [id,name,email,hash]);
    const token = jwt.sign({ id, email, name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciais inválidas' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
//  MAPS — CRUD
// ═══════════════════════════════════════════════════════════

/** Lista mapas do usuário logado */
app.get('/api/maps', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, bg_color, is_public, share_token, thumbnail_url, created_at, updated_at FROM maps WHERE user_id=? ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Busca um mapa (do usuário ou público) */
app.get('/api/maps/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM maps WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Mapa não encontrado' });
    const map = rows[0];
    if (map.user_id !== req.user.id && !map.is_public)
      return res.status(403).json({ error: 'Sem permissão' });
    res.json(map);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Acesso por share_token (sem auth) */
app.get('/api/share/:token', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, bg_color, data, thumbnail_url FROM maps WHERE share_token=? AND is_public=1',
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Mapa não encontrado ou privado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Cria novo mapa */
app.post('/api/maps', auth, async (req, res) => {
  try {
    const { title = 'Novo Mapa', bg_color = '#0d0d14', data } = req.body;
    const id = uuid();
    const defaultData = data || {
      nodes: {
        root: { id:'root', text:'Meu Mapa Mental', x:-80, y:-25, w:160, h:50, bg:'#4ECDC4', fg:'#fff', fs:18, ff:'Poppins', parent:null, children:[], link:'', note:'' }
      },
      extras: []
    };
    await pool.query(
      'INSERT INTO maps(id,user_id,title,bg_color,data) VALUES(?,?,?,?,?)',
      [id, req.user.id, title, bg_color, JSON.stringify(defaultData)]
    );
    res.status(201).json({ id, title, bg_color, data: defaultData });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Atualiza mapa (salva nova versão no histórico) */
app.put('/api/maps/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM maps WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Mapa não encontrado' });

    // Salva histórico (mantém últimas 20 versões)
    await pool.query('INSERT INTO map_history(map_id, data) VALUES(?,?)', [req.params.id, rows[0].data]);
    await pool.query('DELETE FROM map_history WHERE map_id=? AND id NOT IN (SELECT id FROM (SELECT id FROM map_history WHERE map_id=? ORDER BY saved_at DESC LIMIT 20) t)', [req.params.id, req.params.id]);

    const { title, bg_color, data, is_public, thumbnail_url } = req.body;
    await pool.query(
      'UPDATE maps SET title=COALESCE(?,title), bg_color=COALESCE(?,bg_color), data=COALESCE(?,data), is_public=COALESCE(?,is_public), thumbnail_url=COALESCE(?,thumbnail_url) WHERE id=?',
      [title||null, bg_color||null, data ? JSON.stringify(data) : null, is_public!=null?is_public:null, thumbnail_url||null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Gera ou revoga link de compartilhamento */
app.post('/api/maps/:id/share', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM maps WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Mapa não encontrado' });

    const { action = 'enable' } = req.body; // 'enable' | 'disable'
    if (action === 'disable') {
      await pool.query('UPDATE maps SET is_public=0, share_token=NULL WHERE id=?', [req.params.id]);
      return res.json({ shared: false });
    }
    const token = crypto.randomBytes(24).toString('hex');
    await pool.query('UPDATE maps SET is_public=1, share_token=? WHERE id=?', [token, req.params.id]);
    res.json({ shared: true, token, url: `${process.env.BASE_URL || 'http://localhost:3001'}/share/${token}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Deleta mapa */
app.delete('/api/maps/:id', auth, async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM maps WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Mapa não encontrado' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Histórico de versões */
app.get('/api/maps/:id/history', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, saved_at FROM map_history WHERE map_id=? ORDER BY saved_at DESC LIMIT 20',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Restaura versão específica */
app.post('/api/maps/:id/history/:histId/restore', auth, async (req, res) => {
  try {
    const [hrows] = await pool.query('SELECT data FROM map_history WHERE id=? AND map_id=?', [req.params.histId, req.params.id]);
    if (!hrows.length) return res.status(404).json({ error: 'Versão não encontrada' });
    await pool.query('UPDATE maps SET data=? WHERE id=? AND user_id=?', [hrows[0].data, req.params.id, req.user.id]);
    res.json({ success: true, data: JSON.parse(hrows[0].data) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
//  UPLOADS DE IMAGEM
// ═══════════════════════════════════════════════════════════
app.post('/api/maps/:id/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const id = uuid();
    const url = `/uploads/${req.file.filename}`;
    await pool.query(
      'INSERT INTO uploads(id,user_id,map_id,filename,mime_type,size_bytes,url) VALUES(?,?,?,?,?,?,?)',
      [id, req.user.id, req.params.id, req.file.filename, req.file.mimetype, req.file.size, url]
    );
    res.json({ id, url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SPA fallback ──────────────────────────────────────────
app.get('*', (req, res) => {
  const index = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(404).json({ error: 'Frontend não encontrado. Coloque o build em ./public' });
});

// ─── Start ─────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🧠 MindMap API rodando na porta ${PORT}`));

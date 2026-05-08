-- ============================================================
--  MindMap App — MySQL Schema
--  Compatível com MySQL 5.7+ / MariaDB 10.3+
-- ============================================================

CREATE DATABASE IF NOT EXISTS mindmap_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mindmap_db;

-- ─────────────────────────────────────────────────────────────
--  Usuários
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,          -- bcrypt hash
  avatar_url   VARCHAR(500) DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
--  Mapas mentais
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maps (
  id            VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id       VARCHAR(36)  NOT NULL,
  title         VARCHAR(255) NOT NULL DEFAULT 'Meu Mapa Mental',
  bg_color      VARCHAR(30)  NOT NULL DEFAULT '#0d0d14',
  data          JSON         NOT NULL,           -- { nodes:{}, extras:[] }
  is_public     TINYINT(1)   NOT NULL DEFAULT 0,
  share_token   VARCHAR(64)  UNIQUE DEFAULT NULL, -- token de compartilhamento
  thumbnail_url VARCHAR(500) DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_maps_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
--  Uploads de imagem (nós com imagem)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploads (
  id         VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  map_id     VARCHAR(36)  NOT NULL,
  filename   VARCHAR(255) NOT NULL,
  mime_type  VARCHAR(100) NOT NULL,
  size_bytes INT          NOT NULL DEFAULT 0,
  url        VARCHAR(500) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_uploads_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_uploads_map  FOREIGN KEY (map_id)
    REFERENCES maps(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
--  Histórico / versões de cada mapa  (últimas 20 versões)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS map_history (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  map_id     VARCHAR(36)  NOT NULL,
  data       JSON         NOT NULL,
  saved_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_history_map FOREIGN KEY (map_id)
    REFERENCES maps(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Índices úteis
CREATE INDEX idx_maps_user     ON maps(user_id);
CREATE INDEX idx_maps_share    ON maps(share_token);
CREATE INDEX idx_history_map   ON map_history(map_id, saved_at DESC);
CREATE INDEX idx_uploads_map   ON uploads(map_id);

-- ─────────────────────────────────────────────────────────────
--  Usuário e mapa de demonstração
-- ─────────────────────────────────────────────────────────────
INSERT INTO users (id, name, email, password) VALUES
  ('usr-demo-0001', 'Demo User', 'demo@mindmap.local',
   '$2b$10$examplehashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

INSERT INTO maps (id, user_id, title, bg_color, data) VALUES (
  'map-demo-0001',
  'usr-demo-0001',
  'Mapa de Exemplo',
  '#0d0d14',
  JSON_OBJECT(
    'nodes', JSON_OBJECT(
      'root', JSON_OBJECT(
        'id','root','text','Meu Mapa Mental',
        'x',-80,'y',-25,'w',160,'h',50,
        'bg','#4ECDC4','fg','#fff','fs',18,'ff','Poppins',
        'parent',NULL,'children',JSON_ARRAY('a','b'),'link','','note',''
      ),
      'a', JSON_OBJECT(
        'id','a','text','Tópico 1',
        'x',180,'y',-90,'w',130,'h',42,
        'bg','#FF6B6B','fg','#fff','fs',14,'ff','Poppins',
        'parent','root','children',JSON_ARRAY('c'),'link','','note',''
      ),
      'b', JSON_OBJECT(
        'id','b','text','Tópico 2',
        'x',180,'y',60,'w',130,'h',42,
        'bg','#45B7D1','fg','#fff','fs',14,'ff','Poppins',
        'parent','root','children',JSON_ARRAY(),'link','','note',''
      ),
      'c', JSON_OBJECT(
        'id','c','text','Sub-tópico',
        'x',400,'y',-90,'w',120,'h',38,
        'bg','#FFCA3A','fg','#333','fs',13,'ff','Poppins',
        'parent','a','children',JSON_ARRAY(),'link','','note',''
      )
    ),
    'extras', JSON_ARRAY()
  )
);

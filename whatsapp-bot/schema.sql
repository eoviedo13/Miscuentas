CREATE TABLE IF NOT EXISTS movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('g','i')),
  monto INTEGER NOT NULL,
  cat TEXT NOT NULL,
  descr TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL,
  t INTEGER NOT NULL,
  texto TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_mov_numero_fecha ON movimientos (numero, fecha);

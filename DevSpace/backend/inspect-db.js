import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./devspace.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Erro abrindo o DB:', err.message);
    process.exit(1);
  }
});

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

try {
  const users = await queryAll('SELECT id, username, handle, email, senha, bio, criadoEm FROM users');
  const posts = await queryAll('SELECT id, username, handle, email, texto, criadoEm, comments, likes, shares, bookmarks FROM posts');
  console.log('USERS', users.length);
  console.table(users);
  console.log('POSTS', posts.length);
  console.table(posts);
} catch (error) {
  console.error('Erro na consulta:', error);
} finally {
  db.close();
}

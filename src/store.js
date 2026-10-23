export async function persistRun(db,run,key){
  await db.prepare("INSERT OR IGNORE INTO runs (request_key,created_at,payload) VALUES (?,?,?)").bind(key,run.capturedAt,JSON.stringify(run)).run();
  const row=await db.prepare("SELECT payload FROM runs WHERE request_key=?").bind(key).first();
  return JSON.parse(row.payload);
}


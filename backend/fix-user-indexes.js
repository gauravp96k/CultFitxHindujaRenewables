// Indexes the current User model needs
const KEEP = ['_id_', 'email_1', 'employeeId_1'];

print('Before:');
printjson(db.users.getIndexes().map((i) => ({ name: i.name, unique: !!i.unique })));

db.users.getIndexes().forEach((i) => {
  if (!KEEP.includes(i.name)) {
    db.users.dropIndex(i.name);
    print('Dropped old index: ' + i.name);
  }
});

// Make sure email is unique (the field login uses)
if (!db.users.getIndexes().some((i) => i.name === 'email_1')) {
  db.users.createIndex({ email: 1 }, { name: 'email_1', unique: true });
  print('Created email_1');
}

print('After:');
printjson(db.users.getIndexes().map((i) => ({ name: i.name, unique: !!i.unique, partial: i.partialFilterExpression || null })));
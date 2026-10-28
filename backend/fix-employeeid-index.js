print('Before:');
printjson(db.users.getIndexes().map((i) => ({ name: i.name, unique: !!i.unique, partial: i.partialFilterExpression || null })));

// Remove the old index that treats a missing employeeId as a duplicate null
if (db.users.getIndexes().some((i) => i.name === 'employeeId_1')) {
  db.users.dropIndex('employeeId_1');
  print('Dropped old employeeId_1');
}

// Unique only when an Employee ID is actually filled in
db.users.createIndex(
  { employeeId: 1 },
  { name: 'employeeId_1', unique: true, partialFilterExpression: { employeeId: { $type: 'string' } } }
);
print('Created new employeeId_1 (unique only when present)');

print('After:');
printjson(db.users.getIndexes().map((i) => ({ name: i.name, unique: !!i.unique, partial: i.partialFilterExpression || null })));
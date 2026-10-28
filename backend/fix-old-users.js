const old = db.users.find({ email: { $exists: false } }).toArray();
print(`Users without email: ${old.length}`);

old.forEach((u) => {
  const email = String(u.officialEmail || '').trim().toLowerCase();
  print('\n--- ' + u._id);
  printjson({ officialEmail: u.officialEmail, fullName: u.fullName, employeeId: u.employeeId, role: u.role, workLocation: u.workLocation });

  if (!email) {
    print('SKIPPED: no officialEmail either. Check this user manually in Compass.');
    return;
  }

  // Someone already logged in with this address under the new model?
  const dup = db.users.findOne({ email, _id: { $ne: u._id } });
  if (dup) {
    print(`SKIPPED: ${email} already exists as user ${dup._id} (created by the new login).`);
    print('Keep one of them: tell me both _ids and roles and I will help merge.');
    return;
  }

  const set = { email };
  if (!u.location && u.workLocation) set.location = u.workLocation;
  if (!u.fullName) set.fullName = email.split('@')[0];
  db.users.updateOne({ _id: u._id }, { $set: set });
  print(`FIXED: email set to ${email}`);
});

print(`\nRemaining without email: ${db.users.countDocuments({ email: { $exists: false } })}`);

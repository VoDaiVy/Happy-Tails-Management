const fs = require('fs');

const files = [
  '../frontend/src/components/service/BoardingDetail.jsx',
  '../frontend/src/components/service/ServiceBookingPanel.jsx',
  '../frontend/src/pages/Cart.jsx',
  '../frontend/src/pages/Service.jsx',
  '.env',
  'src/api/modules/adminApi.ts',
  'src/api/modules/serviceApi.ts',
  'src/navigation/StaffAdminTabNavigator.tsx',
  'src/navigation/types.ts',
  'src/screens/management/StaffBookingsScreen.tsx'
];

let out = "";
for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const matches = [...content.matchAll(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> origin\/khoi/g)];
    if (matches.length > 0) {
      out += `\n\n============= FILE: ${file} =============\n`;
      matches.forEach((m, idx) => {
        out += `\n--- CONFLICT ${idx + 1} ---\n`;
        out += `(HEAD):\n${m[1]}`;
        out += `(KHOI):\n${m[2]}`;
      });
    }
  } catch (e) {
    //
  }
}

fs.writeFileSync('all_conflicts.txt', out);

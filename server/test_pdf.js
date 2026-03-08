const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

try {
    const doc = new jsPDF();
    console.log('Testing autoTable...');
    
    autoTable(doc, {
        head: [['Name', 'Email', 'Country']],
        body: [
            ['David', 'david@example.com', 'Sweden'],
            ['Castille', 'castille@example.com', 'Spain'],
        ],
    });
    
    console.log('✅ autoTable successful!');
    process.exit(0);
} catch (err) {
    console.error('❌ autoTable failed:', err.message);
    process.exit(1);
}

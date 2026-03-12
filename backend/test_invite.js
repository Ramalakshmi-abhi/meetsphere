require('dotenv').config();
const { sendInvitation } = require('./config/email');

async function test() {
    console.log('Testing sendInvitation directly...');
    const result = await sendInvitation('madurasolution0024@gmail.com', 'test-room-123', 'Maduranga');
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
}

test();

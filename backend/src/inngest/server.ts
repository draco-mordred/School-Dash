// I want to biuld a server that runs a local host port based on the .env file config

import configDotenv  from "dotenv";
import { exec, spawn } from 'child_process';
import readline from 'readline';


configDotenv.config();

const PORT = process.env.PORT || 3000;

console.log(PORT)

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter the port number for Inngest: ', (port) => {
    const targetUrl = `http://localhost:${port}/api/inngest`;
    
    console.log(`Starting Inngest on port ${port}...`);
    
    spawn('npx', ['inngest-cli@latest', 'dev', '-u', targetUrl], { 
        shell: true, 
        stdio: 'inherit' 
    });

    rl.close();
});

// import { spawn } from 'child_process';

// // Define your configuration variables

// const targetUrl = `http://localhost:${PORT}/api/inngest`;

// // The first argument is the base command ('npx')
// // The second argument is an array of all parameters separated by commas
// const child = spawn(
//     'npx', 
//     [`inngest-cli@latest dev -u ${targetUrl}`], 
//     { 
//         shell: true, 
//         stdio: 'inherit' 
//     }
// );

// child.on('error', (err) => console.error('Error:', err));

const { exec } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function setupDatabase() {
    console.log('Setting up database...');
    
    // Create database if it doesn't exist
    const createDbCommand = 'psql -U postgres -c "CREATE DATABASE chess_app;"';
    
    exec(createDbCommand, (error, stdout, stderr) => {
        if (error) {
            if (error.code === 1) {
                console.log('Database already exists, continuing...');
            } else {
                console.error('Error creating database:', error);
                process.exit(1);
            }
        } else {
            console.log('Database created successfully');
        }
        
        // Run migrations
        const sequelize = require('./db');
        sequelize.authenticate()
            .then(() => {
                console.log('Database setup completed successfully');
                process.exit(0);
            })
            .catch(err => {
                console.error('Error during database setup:', err);
                process.exit(1);
            });
    });
}

setupDatabase(); 
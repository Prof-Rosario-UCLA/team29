#!/bin/bash

# Update package lists
sudo apt-get update

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create a PostgreSQL user and database
sudo -u postgres psql -c "CREATE USER chessuser WITH PASSWORD 'chesspassword';"
sudo -u postgres psql -c "CREATE DATABASE chessdb;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chessdb TO chessuser;"

# Install project dependencies
cd /path/to/your/project
npm install

# Set up environment variables
echo "DATABASE_URL=postgres://chessuser:chesspassword@localhost:5432/chessdb" > .env
echo "JWT_SECRET=your_jwt_secret_here" >> .env

# Run database migrations
node runMigration.js

echo "Setup completed successfully!" 
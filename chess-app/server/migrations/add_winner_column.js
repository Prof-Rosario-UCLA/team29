const sequelize = require('../db');

async function up() {
    try {
        await sequelize.query(`
            ALTER TABLE "Games"
            ADD COLUMN IF NOT EXISTS "winner" INTEGER REFERENCES "Users"("id");
        `);
        console.log('Added winner column to Games table');
    } catch (error) {
        console.error('Error adding winner column:', error);
        throw error;
    }
}

async function down() {
    try {
        await sequelize.query(`
            ALTER TABLE "Games"
            DROP COLUMN IF EXISTS "winner";
        `);
        console.log('Removed winner column from Games table');
    } catch (error) {
        console.error('Error removing winner column:', error);
        throw error;
    }
}

module.exports = { up, down }; 
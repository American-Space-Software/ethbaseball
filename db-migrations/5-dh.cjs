'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.context.sequelize.query(`
      ALTER TABLE game
      ADD COLUMN useDH BOOLEAN NULL DEFAULT FALSE;
    `)
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.context.sequelize.query(`
      ALTER TABLE game
      DROP COLUMN useDH;
    `)
  }
}
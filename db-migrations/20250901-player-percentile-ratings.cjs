'use strict';

const fs = require("fs")
const path = require("path")

let MIGRATION_QUERY = fs.readFileSync(path.resolve(__dirname, "player-percentile-ratings.sql"), "utf-8").toString()

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {    
    return queryInterface.context.sequelize.query(MIGRATION_QUERY)
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.context.sequelize.query(``)
  }
};

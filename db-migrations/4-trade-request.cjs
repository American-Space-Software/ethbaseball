'use strict';

const fs = require("fs")
const path = require("path")

let query = fs.readFileSync(path.resolve(__dirname, "sql/4-trade-request.sql"), "utf-8").toString()

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {    
    return queryInterface.context.sequelize.query(query)
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.context.sequelize.query(``)
  }
};

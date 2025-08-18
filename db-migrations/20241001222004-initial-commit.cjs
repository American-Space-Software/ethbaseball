'use strict';

const fs = require("fs")
const path = require("path")

let INITIAL_DATABASE = fs.readFileSync(path.resolve(__dirname, "initial-commit.sql"), "utf-8").toString()

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {    
    return queryInterface.context.sequelize.query(INITIAL_DATABASE)
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.context.sequelize.query(``)
  }
};

const sequelize = require("../config/database");
const Job = require("./job.model");

const db = {};
db.sequelize = sequelize;
db.Job = Job;

module.exports = db;

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
id = "job_model_code";
const Job = sequelize.define(
  "Job",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    organization: DataTypes.STRING,
    location: DataTypes.STRING,
    link: { type: DataTypes.STRING, unique: true },
    lastDate: DataTypes.STRING,
    qualification: DataTypes.TEXT,
    experience: DataTypes.STRING,
    isRelevant: DataTypes.BOOLEAN,
    source: DataTypes.STRING,
  },
  {
    tableName: "jobs",
    freezeTableName: true,
    timestamps: true,
  },
);

module.exports = Job;

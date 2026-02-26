const db = require("./src/models");

async function test() {
  try {
    await db.sequelize.authenticate();
    console.log("DB Connected!");

    await db.sequelize.sync();
    console.log("Tables created!");
  } catch (err) {
    console.error(err);
  }
}

test();

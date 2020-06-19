const Sequelize = require("sequelize");
const config = require("../config/config.json");
// const config = require(__dirname + '/../config/config.json');

// Initializes Sequalize and designing the book model
const sequelize = new Sequelize(config.development);

(async ()=> {
    try {
        await sequelize.authenticate();
        console.log("Connection to the database successful!");
    } catch (error) {
        console.error("Error connecting to the database: ", error);
    }
})();

const database = {
    sequelize,
    Sequelize,
    models: {},
};

database.models.User = require("./models/User.js")(sequelize);
database.models.Course = require("./models/Course.JS")(sequelize);

Object.keys(database.models).forEach(modelItem => {
    if (database.models[modelItem].associate) {
       database.models[modelItem].associate(database.models); 
    }
})

module.exports = database;
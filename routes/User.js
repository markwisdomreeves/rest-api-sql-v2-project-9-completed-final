const express = require("express");
const router = express.Router();
// getting the User's data from the Sequelize Database modal
const User = require("../database").models.User;
// password hashing
const { check, validationResult } = require("express-validator");
const bcryptjs = require("bcryptjs");
const auth = require("basic-auth");
let userArray = [];


// A global error handler function that wrap all routes
function asyncErrorHandler(cb) {
    return async (req, res, next) => {
        try {
            await cb(req, res, next)
        } catch (error) {
            if (error.name === "SequelizeValidationError") {
                const errors = error.errors.map(err => err.message);
                res.status(400).json(errors);
            } else {
                return next(error)
            }
        }
    }
};


/* We are validating our with the Express Data validations */
const validateFirstName = check("firstName")
.exists({
    checkFalsy: true,
    checkNull: true
})
.withMessage("Please provide a First Name value");

const validateLastName= check("lastName")
.exists({
    checkFalsy: true,
    checkNull: true
})
.withMessage("Please provide a Last Name value");

const validateEmailAddress= check("emailAddress")
.exists({
    checkFalsy: true,
    checkNull: true
})
.withMessage("Please provide an Email Address value");

const validatePassword= check("password")
.exists({
    checkFalsy: true,
    checkNull: true
})
.withMessage("Please provide a Password value");

/* deconstructing all validated data */
const userErrorValidationsHandler = [
    validateFirstName, 
    validateLastName, 
    validateEmailAddress, 
    validatePassword
];


/* Authentication hanlder to authenticate routes*/
const userAuthentication =  asyncErrorHandler(async (req, res, next) => {
    let message = null;
    /* Parsing the user's credentials from the Authorization header */
    const credentials = auth(req);
    /* If there are user's credentials*/
    if (credentials) {
        /* Then, get or find all user data or imformations in the database by their user's name*/
        const user = await User.findOne({
            where: {
                emailAddress: credentials.name
            }
        })
        // const users = await UserData.findAll();
        // const user = await User.find(u => u.emailAddress === credentials.name);
        /* And if the user was successfully retrieved from the database */
        if(user) {
            /* Then we use the bcryptjs to compare the user's
            password (from the Authorization header) 
            to the user's password that was retrieved from the data store.*/
            const authenticatedUser = bcryptjs.compareSync(credentials.pass, user.password);
            /* Now we are checking If the two passwords are match */
            if (authenticatedUser) {
                /* Then we store the retrieved user object on the request object to allow any middleware functions to have access to the user's information. */
                req.currentUser =  {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    emailAddress: user.emailAddress
                };
            } else {
                message = `Authentication failed: ${user.username}`;
            }   
        } else {
            message = `User not found: ${credentials.name}`;
        }
    } else {
        message = "Authentication header not found";
    }
    /* We are checking the error validation message for user authentication failure */
    if (message) {
        console.warn(message);
        /* And If there is a user authentication failure, we send a 404 / 401 error status code message */
        res.status(401).json({ message: "Access Denied"});
    } else {
        /* But if the user authentication succeeded, 
        we call or proceed to the next() method below */
        next();
    }
})


/* User Routes section */
/* GET ROUTER: get users list */
router.get('/users', userAuthentication, asyncErrorHandler(async (req, res) => {
    const user = req.currentUser;
    res.status(200).json(user).end();
}));


/* POST ROUTER: create a single user */
router.post('/users', userErrorValidationsHandler, asyncErrorHandler(async (req, res) => {
    /* We are validating the requested object*/
    const errors = validationResult(req);
    /* We are checking if there is error or not */
    if(!errors.isEmpty()) {
        /* We are looping through all the errors messages 
        and send it to the user with 404 status code */
        const validatedErrorMessages = errors.array().map(error => error.msg);
        res.status(400).json({
            errors: validatedErrorMessages
        })
        /* If all checked was successful.. */
    } else { 
        /* Then we hash the user password and create a new user and 
        than we push that user to User array */
        req.body.password = await bcryptjs.hashSync(req.body.password);
        const user = await User.create(req.body);
        userArray.push(user);
        res.status(201).location('/').end();
    }
}))



module.exports = router;

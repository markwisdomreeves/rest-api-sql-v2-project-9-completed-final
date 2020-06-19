const express = require("express")
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../database").models.User;
const Course = require("../database").models.Course;
const bcryptjs = require("bcryptjs");
const auth = require("basic-auth");
let courseArray = [];
// let usersArray = [];


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
const validateTitle = check("title")
.exists({
    checkFalsy: true,
    checkNull: true
})
.withMessage("Please provide a Title Name value");

const validateDescription= check("description")
.exists({
    checkFalsy: true,
    checkNull: true
})
.withMessage("Please provide a Last Description value");

/* deconstructing all validated data */
const courseErrorValidationsHandler = [
    validateTitle,
    validateDescription
];


/* Authentication hanlder to authenticate routes*/
const courseAuthentication = asyncErrorHandler(async (req, res, next) => {
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
        // const user = await users.find(u => u.emailAddress === credentials.name);

        /* And if the user was successfully retrieved from the database */
        if(user) {
            /* Then we use the bcryptjs to compare the user's
            password (from the Authorization header) 
            to the user's password that was retrieved from the data store.*/
            const authenticatedUser = bcryptjs.compareSync(credentials.pass, user.password);
            /* Now we are checking If the two passwords are match */
            if (authenticatedUser) {
                /* Then we store the retrieved user object on the request object to allow any middleware functions to have access to the user's information. */
                // req.currentUser =  user;
                req.currentUser = {
                    id: user.id,
                    firstName: user.firstName,
                    lastname: user.lastname,
                    emailAddress: user.emailAddress
                }
            } else {
                message = `Authentication failed: ${user.username}`;
            }   
        } else {
            message = `User not found: ${credentials.name}`;
        }
    } else {
        message = `Authentication hear not found`;
    }
    /* We are checking the error validation message for user authentication failure */
    if (message) {
        console.warn(message);
        /* And If there is a user authentication failure, we send a 404 / 401 error status code message */
        res.status(401).json({
            message: "Access Denied"
        });
    } else {
        /* But if the user authentication succeeded, 
        we call or proceed to the next() method below */
        next();
    }
});


/* GET ROUTE: Listing / Getting all courses */
router.get('/courses', asyncErrorHandler(async(req, res) => {
    const courses = await Course.findAll({
        include: [{
            model: User
        }]
    });
    res.status(200).json(courses);
}));


/* GET ROUTE: Get a single Course from list */
router.get('/courses/:id', asyncErrorHandler(async (req, res) => {
    const course = await Course.findByPk(req.params.id, {
        include: [{
            model: User
        }]
    })
    if (course) {
        res.status(200).json(course);
    } else {
        throw error = {
            status: 400,
            message: "course does not exist"
        }
    };
}));


/* POST ROUTE: Creating a new course */
router.post('/courses', courseErrorValidationsHandler, courseAuthentication, asyncErrorHandler(async(req, res) => {
   const course = await Course.create(req.body);
   const errors = validationResult(req);
   if(!errors.isEmpty()) {
       const validatedErrorMessage = errors.array().map(error => error.msg);
       res.status(400).json({
           errors: validatedErrorMessage
       })
   } else {
       courseArray.push(course);
    // redirect by to the the course route
       res.status(201).location(`/courses/` + course.id).end();
    //    res.status(201).location(`/courses/:${course.id}`).end();
   }
}))


/* PUT ROUTE / UPDATE ROUTE: Update courses route */
router.put('/courses/:id', [
    check("title")
        .exists({ checkFalsy: true, checkNull: true })
        .withMessage("Please provide a value for the title field"),
    check("description")
        .exists({ checkFalsy: true, checkNull: true })
        .withMessage("Please provide a value for the description field"),
], courseAuthentication, asyncErrorHandler(async(req, res) => {
    const errors = validationResult(req);
    // When there is error validations
    if (!errors.isEmpty()) {
        // Then, we will use the Array method to loop over the list of error messages.
        const errorMessages = errors.array().map(error => error.msg)
        /* After that, we will show the validation error messages  
        to the users and with a 400 error message but if  */
        res.status(400).json({ errors: errorMessages });
    } else {
        const course = await Course.findByPk(req.params.id);
        if(course) {
            await course.update(req.body);
            res.status(204).end();
        } else {
            res.status(404).json({ message: "Course Not Found" });
        }
    } 
}));


/*DELETE ROUTE: Delete a single Course */
router.delete('/courses/:id', courseAuthentication, asyncErrorHandler(async(req, res) => {
    const course = await Course.findByPk(req.params.id);
    if(course) {
        await course.destroy();
        res.sendStatus(204);
    } else {
        res.sendStatus(404);
        throw error;
    }
}));



module.exports = router;
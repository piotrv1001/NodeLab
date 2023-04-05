var express         = require('express');
const Sequelize = require('sequelize')
const cors = require('cors');
var session = require('express-session');
var app             = express();
var PORT            = process.env.PORT || 8080;
var server          = app.listen(PORT,() => console.log(`Listening on ${ PORT }`));
// test commit 3

const sequelize = new Sequelize('database', 'root', 'root', {
    dialect: 'sqlite',
    storage: 'orm-db.sqlite',
});

const sessionParser = session({
    saveUninitialized: true,
    secret: '$secret',
    resave: false
});

app.use(express.json());
app.use(cors());
app.use(sessionParser);

const User = sequelize.define('user', {
    user_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_name: Sequelize.STRING,
    user_password: Sequelize.STRING
})

sequelize.sync({ force: true }).then(() => {
  console.log(`Database & tables created!`)
})


function testGet(request, response){
    response.send("testGet working");
}

function register(request, response) {
    console.log(request.body)
    var user_name = request.body.user_name;
    var user_password = request.body.user_password;
    if (user_name && user_password) {

        User.count({ where: { user_name: user_name } }).then(
            count => {
                if (count != 0) {
                    response.send({ register: false });
                } else {
                    User.create({user_name: user_name, user_password: user_password})
                        .then(() => response.send({ register: true }))
                        .catch(function (err) { response.send({ register: true })
                      });
                }
            })
    } else {
        response.send({ register: false });
    }
}

function login(request, response) {
    console.log(request.body);
    var user_name = request.body.user_name;
    var user_password = request.body.user_password;
    if (user_name && user_password) {
        User.findOne({ where: { user_name: user_name, user_password: user_password } } ).then(
            user => {
                if(user === null || user === undefined) {
                    response.send({ loggedin: false });
                } else {
                    request.session.loggedin = true;
                    request.session.user_id = user.user_id;
                    response.send({ loggedin: true });
                }
            }
        )
    } else {
        response.send({ loggedin: false });
    }
}

function loginTest(request, response) {
    response.send({ loggedin: true });
}

function logout(request, response) {
    request.session.destroy()
    response.send({ loggedin: false });
}

function checkSessions(request, response, next) {
    if (request.session.loggedin) {
        next();
    } else {
        response.send({ loggedin: false });
    }
}

function getUsers(request, response) {
    User.findAll().then(
        users => {
            response.send({ data: users });
        }
    )
}

app.get('/api/test-get', testGet);

app.post('/api/register/', [register]);

app.post('/api/login/', [login]);

app.get('/api/login-test/', [checkSessions, loginTest]);

app.get('/api/logout/', [checkSessions, logout]);

app.get('/api/users/', [checkSessions, getUsers]);

// PART 1
// test commit
// another test commit
// one more commit
// lmao
var express         = require('express');
const Sequelize = require('sequelize')
const cors = require('cors');
var session = require('express-session');
var app             = express();
var PORT            = process.env.PORT || 8080;
var server          = app.listen(PORT,() => console.log(`Listening on ${ PORT }`));

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
app.use(express.static(__dirname + '/second-part/'));

const User = sequelize.define('user', {
    user_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_name: Sequelize.STRING,
    user_password: Sequelize.STRING,
    online: Sequelize.BOOLEAN
})

const Message = sequelize.define('message', {
    message_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    message_from_user_id: Sequelize.INTEGER,
	message_to_user_id: Sequelize.INTEGER,
    message_text: Sequelize.STRING
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

let onlineUsers = {};

function getUsers(request, response) {
    User.findAll().then(
        users => {
            users = users.map(user => {
                if(user.user_id in onlineUsers) {
                    user.online = true;
                } else {
                    user.online = false;
                }
                return user;
            });
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

// PART 2
const WebSocket = require('ws');

const wss = new WebSocket.Server({
    noServer: true,
});


server.on('upgrade', function (request, socket, head) {
    sessionParser(request, {}, () => {
        if (!request.session.user_id) {
            socket.destroy();
            return;
        }
        wss.handleUpgrade(request, socket, head, function (ws) {
            wss.emit('connection', ws, request);
        });
    });
});

wss.on('connection', function (ws, request) {

    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ status: 2 }));
        }
    });
    onlineUsers[request.session.user_id] = ws;

    ws.on('message', function (message) {
        try {
            var data = JSON.parse(message);
            // wss.clients.forEach(function each(client) {
            //     if (client.readyState === WebSocket.OPEN) {
            //         client.send(JSON.stringify({ data: data, status: 1 }));
            //     }
            // });
        } catch (error) {
            return;
        }
    });

    ws.on('close', () => {
        delete onlineUsers[request.session.user_id];
    })

});

// PART 3
function sendMessages(request, response) {
    var message_text = request.body.message_text;
    var to = request.body.message_to_user_id;
    console.log(`Received message => ${message_text} from ${request.session.user_id} to ${to}`);

    User.findAll({ where: { user_id: to } }).then(
        users => {
            if (users.length >= 1) {
                var mes = {
                    message_from_user_id: request.session.user_id,
                    message_to_user_id: users[0].user_id,
                    message_text: message_text,
                }
                var user = users[0];
                Message.create(mes)
                        .then((mes) => 
                        {
                            if (user.user_id in onlineUsers) {
                                onlineUsers[mes.message_to_user_id].send(JSON.stringify({ data: message_text, status: 1 }));
                            }
                            if (mes.message_from_user_id !== mes.message_to_user_id) {
                                if (mes.message_from_user_id in onlineUsers) {
                                    onlineUsers[mes.message_from_user_id].send(JSON.stringify({ data: message_text, status: 1 }));
                                }
                            }

                            response.send({ sending: true })
                        })
                        .catch(function (err) { console.log(err); response.send({ error: err })
                      });

            } else {
                response.send({ error: "User not exists" });
            }
        })
}

async function getMessages(request, response) {
	const sent_messages = await Message.findAll({
		where: {
		message_from_user_id: request.session.user_id,
		message_to_user_id: request.params.id
		}})
		
	const received_messages = await Message.findAll({
		where: {
		message_from_user_id: request.params.id,
		message_to_user_id: request.session.user_id
		}})
	
	response.send({
		data: received_messages.concat(sent_messages),
	})
}


app.get('/api/messages/:id', [checkSessions, getMessages]);
app.post('/api/messages/', [checkSessions, sendMessages]);


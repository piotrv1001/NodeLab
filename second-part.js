const WebSocket = require('ws');

app.use(express.static(__dirname + '/second-part/'));


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

let onlineUsers = {};

wss.on('connection', function (ws, request) {

    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ status: 2 }));
        }
    });
    onlineUsers[request.session.user_id] = ws;

    ws.on('message', function (message) {
        console.log(message)
        try {
            var data = JSON.parse(message);
        } catch (error) {
            return;
        }
    });

    ws.on('close', () => {
        delete onlineUsers[request.session.user_id];
    })

});



// In the user retrieval function, it is worth using the code provided to map 
// database objects to JSON objects
//users = users.map(user => {
//        return user.toJSON();
//});
            
// Going through the objects in the list of objects and adding an appropriate field to them
//for (user of users) {
//    user.online = true;
//}

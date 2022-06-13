const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express();

// middleware 
app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j9ihy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        await client.connect();

        const playersCollection = client.db("CRB_club").collection("players");
        const userCollection = client.db("CRB_club").collection("user");
        const bestPlayerCollection = client.db("CRB_club").collection("bestplayer");
        const ClubMatchHistoryCollection = client.db("CRB_club").collection("clubMatchHistory");

        app.get('/players', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = playersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/players/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await playersCollection.findOne(query);
            res.send(result);
        })

        app.put('/players/:id', async (req, res) => {
            const id = req.params.id;
            const updatedDetails = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: updatedDetails,
            };
            const result = await playersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.delete('/players/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await playersCollection.deleteOne(query);
            res.send(result);
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });
            res.send({ result, token });
        })

        // get all users collection to make admin in dashboard page
        app.get('/user', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const options = { upsert: true };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc, options);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' });
            }

        })

        app.put('/user/removeadmin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $unset: { role: '' },
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // FOR USE ADMIN HOOK and CHECK ADMIN
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })

        app.post('/addplayer', async (req, res) => {
            const player = req.body;
            const result = await playersCollection.insertOne(player);
            res.send(result);
        })

        app.put('/bestplayer/:id', async (req, res) => {
            const id = req.params.id;
            const bestPlayer = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: bestPlayer,
            };
            const result = await bestPlayerCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.get('/bestplayer', async (req, res) => {
            const query = {};
            const cursor = bestPlayerCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })
        app.delete('/bestplayer/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bestPlayerCollection.deleteOne(query);
            res.send(result);
        })

        app.post('/addmatchrecord', async (req, res) => {
            const matchHistory = req.body;
            const result = await ClubMatchHistoryCollection.insertOne(matchHistory);
            res.send(result);
        })

        app.get('/matchrecord', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = ClubMatchHistoryCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.delete('/matchrecord/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ClubMatchHistoryCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('CRB is running');
})
app.listen(port, (req, res) => {
    console.log('app is listening', port);
})
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const cors = require('cors');
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ha1geqx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const productsCollection = client.db('ProdPeek').collection('products')
        const usersCollection = client.db('ProdPeek').collection('users')


        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' })
            res.send({ token })
        })




        // middlewares
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next()
            })
        }


        //  users related api

        app.put('/user', async (req, res) => {
            const user = req.body
            const query = { email: user?.email }
            // check if user already exists in db
            const isExist = await usersCollection.findOne(query)
            if (isExist) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            //  save user for first time
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ...user,
                }
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send((result))
        })

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            const result = await usersCollection.findOne({ email })
            res.send(result)
        })









        //  Product Section api
        app.post('/product', async (req, res) => {
            const product = req.body
            const result = await productsCollection.insertOne(product)
            res.send(result)
        })
        app.get('/my-product/:email', async (req, res) => {
            const result = await productsCollection.find({ 'adder.email': req.params.email })
                .sort({ status: 1 })
                .toArray();
            res.send(result)
        })
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(query)
            res.send(result)
        })

        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });

        app.put('/product/:id', async (req, res) => {
            const id = req.params.id
            const product = req.body
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedProduct = {
                $set: {
                    productName: product.productName,
                    tags: product.tags,
                    description: product.description,
                    link: product.link,
                    productPhoto: product.productPhoto
                }
            }
            const result = await productsCollection.updateOne(filter, updatedProduct, options)
            res.send(result)

        })
        app.get('/product', async (req, res) => {
            const product = await productsCollection.find().toArray()
            product.sort((a, b) => {
                const orderStatus = {
                    'pending': 1,
                    'accept': 2,
                    'reject': 3
                }
                return orderStatus[a.status] - orderStatus[b.status]
            })
            res.send(product)
        })

        app.patch('/reject-product/:id', async (req, res) => {
            const { id } = req.params;
            const result = await productsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'reject' } }
            );
            res.send(result);
        });

        app.patch('/accept-product/:id', async (req, res) => {
            const { id } = req.params;
            const result = await productsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'accept' } }
            );
            res.send(result);
        });









        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);











app.get('/', (req, res) => {
    res.send('Assignment 12 is Running')
})

app.listen(port, () => {
    console.log(`Assign 12 is Running on port: ${port}`);
})
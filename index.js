const express = require('express');
const jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
        const featuredCollection = client.db('ProdPeek').collection('featured')
        const reviewCollection = client.db('ProdPeek').collection('review')
        const reportCollection = client.db('ProdPeek').collection('report')
        const paymentCollection = client.db('ProdPeek').collection('payments')
        const couponCollection = client.db('ProdPeek').collection('coupon')





        // middlewares
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' });
                }
                req.decoded = decoded;
                next();
            });
        };


        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' })
            res.send({ token })
        })



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
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            const result = await usersCollection.findOne({ email })
            res.send(result)
        })


        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/users/moderator/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'moderator'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })


        //  statistics 
        app.get('/statistics', async (req, res) => {
            const totalUsers = await usersCollection.countDocuments()
            const totalReviews = await reviewCollection.countDocuments()
            const totalProducts = await featuredCollection.countDocuments()
            const priceDetails = await paymentCollection
                .find(
                    {},
                    {
                        projection: {
                            price: 1,
                        },
                    }
                )
                .toArray()
            const totalPrice = priceDetails.reduce(
                (sum, booking) => sum + booking.price,
                0
            )

            res.send({ totalUsers, totalReviews, totalProducts, totalPrice })
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


        //featured product section 

        app.patch('/featured-product/:id', async (req, res) => {
            const { id } = req.params;
            const product = await productsCollection.findOne({ _id: new ObjectId(id) });

            if (!product) {
                return res.status(404).send({ message: 'Product not found' });
            }


            const result = await featuredCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: product },
                { upsert: true }
            );

            res.send(result);
        });


        app.get('/featured', async (req, res) => {
            const size = parseInt(req.query.size)
            const page = parseInt(req.query.page) - 1
            const search = req.query.search;
            let query = {};

            if (typeof search === 'string') {
                query = {
                    tags: { $regex: search, $options: 'i' }
                };
            }
            const result = await featuredCollection.find(query).sort({ date: -1 })
                .skip(page * size)
                .limit(size)
                .toArray()
            res.send(result);
        });



        app.get('/featured/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await featuredCollection.findOne(query)
            res.send(result)
        })


        app.patch('/up-vote/:id', async (req, res) => {
            const { id } = req.params;
            const userId = req.body.email;

            const product = await featuredCollection.findOne({ _id: new ObjectId(id) });

            if (!product) {
                return res.status(404).send({ message: 'Product not found' });
            }

            if (product.upVoters && product.upVoters.includes(userId)) {
                return res.status(400).send({ message: 'User has already upvoted this product' });
            }

            const result = await featuredCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { upVote: 1 }, $push: { upVoters: userId } }
            );

            res.send(result);
        });


        app.get('/featured-count', async (req, res) => {
            const count = await featuredCollection.countDocuments()
            res.send({ count })
        })

        // trending
        app.get('/trending', async (req, res) => {
            const result = await featuredCollection.find().sort({ upVote: -1 }).toArray()
            res.send(result)
        })







        // review section 

        app.post('/review', async (req, res) => {
            const product = req.body
            const result = await reviewCollection.insertOne(product)
            res.send(result)
        })

        app.get('/reviews/:product_id', async (req, res) => {
            const product_id = req.params.product_id;
            const reviews = await reviewCollection.find({ product_id: product_id }).sort({ date: -1 }).toArray();
            res.send(reviews);
        });



        // report Section
        app.post('/report', async (req, res) => {
            const report = req.body
            const result = await reportCollection.insertOne(report)
            res.send(result)
        })
        app.get('/report', async (req, res) => {
            const result = await reportCollection.find().toArray()
            res.send(result)
        })

        app.delete('/report/:product_id', async (req, res) => {
            const product_id = req.params.product_id;

            await reportCollection.deleteOne({ product_id: product_id });
            await featuredCollection.deleteOne({ _id: new ObjectId(product_id) });

            res.send({ message: 'Product and report successfully deleted' });
        });


        // payment section

        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);

            if (paymentResult.insertedId) {
                const email = payment.email;
                const filter = { email: email };
                const updateDoc = {
                    $set: {
                        status: 'verified'
                    }
                };
                await usersCollection.updateOne(filter, updateDoc);
            }
            res.send(paymentResult);
        });

        //  coupon api
        app.post('/coupon', async(req,res)=>{
            const coupon = req.body
            const result = await couponCollection.insertOne(coupon)
            res.send(result)
        })
        app.get('/coupon', async(req,res)=>{
            const result = await couponCollection.find().toArray()
            res.send(result)
        })
        app.get('/coupon/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await couponCollection.findOne(query)
            res.send(result)
        })
        app.put('/coupon/:id', async (req, res) => {
            const id = req.params.id
            const coupon = req.body
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedCoupon = {
                $set: {
                    code: coupon.code,
                    date: coupon.date,
                    description: coupon.description,
                    amount: coupon.amount,
                }
            }
            const result = await couponCollection.updateOne(filter, updatedCoupon, options)
            res.send(result)

        })

        app.delete('/coupon/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await couponCollection.deleteOne(query);
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
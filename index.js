const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
    res.send('Assignment 12 is Running')
  })
  
  app.listen(port, () => {
    console.log(`Assign 12 is Running on port: ${port}`);
  })
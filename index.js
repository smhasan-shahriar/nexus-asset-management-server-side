const express = require('express');
const port = process.env.PORT || 5000;
const app = express();



app.get('/', (req, res) => {
    res.send('Server is up and running')
})

app.listen(port, ()=> {
    console.log(`server is running on ${port}`)
})
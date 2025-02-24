const express = require('express');
const app = express();
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const port = process.env.PORT || 3001;
const pool = require('./src/utils/pool');
const cors = require('cors');
const xlsx = require("xlsx");
// const mysql = require("mysql2");
// const ex = require('')


app.use(bodyParser.json());
app.use(cors());
// app.use(cors({ origin: 'http://localhost:5173' }));



// property route here
const propertyRoutes = require('./src/routes/propertyRoutes');
app.use('/property' , propertyRoutes);


// for new property routes
const newPropertyRoutes = require('./src/routes/NewPropertyRoutes');
app.use('/new-property' , newPropertyRoutes);
  

// for auth routes
const authRoutes = require('./src/routes/AuthRoute');
app.use('/' , authRoutes);
  


app.listen(port , (err)=>{
    if(err){
        console.log(`error in port ${port}`);
        return;
    }
    console.log(`listening to port ${port}`);
    
});




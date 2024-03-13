import dotenv from "dotenv";
//import mongoose from "mongoose";
//import { DB_NAME } from "./constants";
import connectDB from "./db/db.js";

//require('dotenv').config({path: './env'});

dotenv.config({
    path: "./env"
})

connectDB();
















//...code first basic approche....
/*
import express from "express";
const app = express();

(async () => {
   try {
      await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
      app.on("error", (error) => {
         console.log("ERRR: ", error);
         throw error 
      })
         
     app.listen(process.env.PORT, () =>{
        console.log(`App is listening on port ${process.env.PORT}`);
     }) 
       
   } catch (error) {
      console.log("ERROR: ", error);
      throw error;
   }


})();

*/
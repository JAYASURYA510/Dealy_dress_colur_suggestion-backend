import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const mongodb = process.env.MONGODB_CONNECTION_STRING;


const ConnectDb = async () => {
    try {

        const connection = await mongoose.connect(mongodb)
        console.log("connected to MongooseDb scussfuly ")

        return connection;
    } catch (error) {
        console.log(error);
    }
}

export default ConnectDb;
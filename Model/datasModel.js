import mongoose from "mongoose";


// Create a schema for the image collection
const imageSchema = new mongoose.Schema({
    title: String,
    description: String,
    imageUrl: String,
    dressType: String,
    color: String,
  });
  
  const Image = mongoose.model('Image', imageSchema);
  

export default Image;

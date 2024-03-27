import mongoose from "mongoose";


// Define User schema
const userSchema = new mongoose.Schema({
  // username: {
  //   type: String,
  //   required: true,
  //   unique: true,
  // },
  // user_Id:{
  //   type:String,
  //   required:true,
  //  },

  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
//   verificationToken:{
//     type:String
//  },
  

resetToken: String,
  resetTokenExpiration: Date,
  role : {
    type: String,
    default: "visitor"
   }
});

const userModel = mongoose.model('userModel', userSchema);


export default userModel;
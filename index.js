// index.js
import express, { response } from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import jwt from "jsonwebtoken"; 
import { authMiddleware } from './Middleware/athu.middleware.js';
import  ConnectDb  from './Database/DbConfig.js'
import userModel from './Model/userModel.js';
import multer from 'multer';
import path from 'path';
import bodyParser from 'body-parser';
import Image from './Model/datasModel.js';

dotenv.config()

const app = express();

const PORT = process.env.PORT;

app.use(express.json());


app.use(cors({
  origin: 'https://dealy-dress-colur-suggestion.netlify.app',
  methods: ["GET","POST"],
  credentials: true,

}));

app.use(cookieParser())

app.use(express.static('uploads'))

ConnectDb();




// Signup route
app.post('/signup', async (req, res) => {
  try {
    const {  email, password } = req.body;

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error:'User already exists'});
    }
    

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(("hashpassword", hashedPassword));
// Example usage of bcrypt.hash()

    // Create a new user with hashed password
    const newUser = new userModel({
     
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ signupError: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error:"Invalid password , please enter a valid password" });
    }

    // Generate a JWT token for the user
        const token = jwt.sign({_id: user._id , role: user.role},
                       process.env.SECTERT_KEY, {expiresIn: '1d'} )
                       res.cookie('token', token)
    // Send the token in the response
    res.status(200).json({ Status: "successful", role: user.role, token:token  });

  } catch (error) {
    console.error({error:"Error during login:"});
    res.status(500).json({ message: "Internal server error" });
  }
})




app.get('/app/users', authMiddleware,  async (req, res) => {
  try {
    const users = await userModel.find();
    res.json(users);
  } catch (error) {
    console.error({error: 'Error fetching users'});
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete all user data


// Forgot password route
app.post('/forgot-password', (req, res) => {
    const {email} = req.body;
    userModel.findOne({email: email})
    .then(user => {
        if(!user) {
            return res.send({Status: "User not existed"})
        } 
        const token = jwt.sign({id: user._id}, process.env.SECTERT_KEY, {expiresIn: "1d"})
        var transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
              },
          });
          
          var mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: 'Reset Password Link from dealy dress colour suggstion ',
            text: `https://dealy-dress-colur-suggestion.netlify.app/reset-passwod/${user._id}/${token}`
          };
          
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              return res.send({Status: "Success"})
            }
          });
    })
})

//reset 
app.post('/reset-password/:id/:token', (req, res) => {
  const {id, token} = req.params
  const {password} = req.body

  jwt.verify(token, process.env.SECTERT_KEY, (err, decoded) => {
      if(err) {
          return res.json({Status: "Error with token"})
      } else {
          bcrypt.hash(password, 10)
          .then(hash => {
            userModel.findByIdAndUpdate({_id: id}, {password: hash})
              .then(u => res.send({Status: "Success"}))
              .catch(err => res.send({Status: err}))
          })
          .catch(err => res.send({Status: err}))
      }
  })
});





// Create a schema for the image collection


// Multer setup for file upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage :storage });

// POST method to upload image with title and description
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { title, description, dressType, color } = req.body;
    const imageUrl = req.file.path;

    if (!title || !description || !imageUrl || !dressType || !color) {
      return res.status(400).json({ error: 'Please provide title, description, dress type, color, and image' });
    }

    const newImage = new Image({ title, description, imageUrl, dressType, color });
    await newImage.save();

    res.json({ message: 'Image uploaded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while uploading the image' });
  }
});
app.get('/images', async (req, res) => {
  try {
    const images = await Image.find({}, 'title description imageUrl dressType color');
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching images' });
  }
});
// Define routes
let currentImages = {}; // Object to store current images for each dress type
let expirationTimes = {}; // Object to store expiration times for each current image

app.get('/random-image', async (req, res) => {
  try {
    const { dressType } = req.query;

    if (!dressType) {
      return res.status(400).json({ error: 'Dress type parameter is required' });
    }

    // Check if current image for the dress type is still valid
    if (currentImages[dressType] && expirationTimes[dressType] && Date.now() < expirationTimes[dressType]) {
      return res.json(currentImages[dressType]);
    }

    const images = await Image.find({ dressType }, 'title description imageUrl dressType color');
    
    if (images.length === 0) {
      return res.status(404).json({ error: `No images found for dress type: ${dressType}` });
    }

    const randomIndex = Math.floor(Math.random() * images.length);
    const randomImage = images[randomIndex];

    // Set the current image and its expiration time (1 day from now) for the dress type
    currentImages[dressType] = randomImage;
    expirationTimes[dressType] = Date.now() + (1 * 24 * 60 * 60 * 1000); // 1 day in milliseconds
    
    res.json(randomImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching a random image' });
  }
});

// Backend route to get uploaded image data
app.put('/images/clear', async (req, res) => {
  try {
    await Image.updateMany({}, { $unset: { title: 1, description: 1, image :1 } });
    res.json({ message: 'Titles and descriptions cleared from all images' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while clearing titles and descriptions from images' });
  }
});


const verifyuser = (req, res, next) =>{
  const token = req.cookies.token;
  if (!token) {
    return res.json("Token is missing")
  }else{
    jwt.verify(token, process.env.SECTERT_KEY, (err,decode) =>{
      if (err) {
        return res.json("Error with token")
      } else {
        if (decode.role === "admin") {
          next()
        }else{
          return res.json("not admin")
        }
      }
    })
  }
}


app.get('/dashboard', verifyuser , (req, res) =>{
  res.json("Success")
})

const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.json({ status: false, message: "no token"});
    }
    const decoded = await jwt.verify(token, process.env.SECTERT_KEY);
    next()
  } catch (err) {
    return res.json(err);
  }
};



app.get("/verify",verifyToken,(req, res) =>{
  return res.json({Status: true, message:"authorized"})
});


const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
      return res.status(401).send('Access Denied');
  }

  jwt.verify(token, process.env.SECTERT_KEY, (err, user) => {
      if (err) {
          return res.status(403).send('Invalid token');
      }
      req.user = user;
      next();
  });
};




app.get('/verifys', authenticateToken, (req, res) => {
  // Only verified users can access this route
  res.send('Welcome to the suggestion page!');
});






app.get("/", async (req, res) => {
  try {
    res
      .status(313)
      .json({
        message: "APP WORKING is Successfully",
      });
    console.log("singup login forgetpsw athu created successfully.");
  } catch (error) {
    res.status(500).json({ message: " error server starting" });
    console.log("Error");
  }
});



 //start server
 app.listen(PORT, () => console.log(`server started in localhost:${PORT}`));


import mongoose, { Schema } from "mongoose";
import Jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({

   username: {
      type: String,
      required: true,
      unique: true,
      lowecase: true,
      trim: true,
      index: true
   },

   email: {
      type: String,
      required: true,
      unique: true,
      lowecase: true,
      trim: true,
      index: true
   },

   fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,

   },
   avatar: {
      type: String, // cloudinary url 
      required: true,
   },
   coverImage: {
      type: String, // cloudinary url 
   },
   watchHistory: [
      {
         type: Schema.Types.ObjectId,
         ref: "Video"
      }

   ],
   password: {
      type: String,
      required: [true, 'Password is required ']
   },
   refreshToken: {
      type: String,
   }
},
   {
      timestamps: true,
   }


)

//...direct increption can't possiable so i use mongoose pre hooked..

//..pre - jbb password modified hoga vo usko change krga...  used to incrept the password... 
userSchema.pre("save", async function (next) {
   if (!this.isModified("password")) return next();
   this.password = await bcrypt.hash(this.password, 10);
   next();
})
//..custom methode design..

userSchema.methods.isPasswordCorrect = async function (password) {
   return await bcrypt.compare(password, thid.password);

}

userSchema.methods.generateAccessToken = function () {
   return Jwt.sign(
      {
         _id: this._id,
         email: this.email,
         username: this.username,
         fullName: this.fullName
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
         expiresIn: process.env.ACCESS_TOKEN_EXPIRY
      }
   )
}
// refersh m information kamm hoti hai 
userSchema.methods.generateRefreshToken = function () {
   return Jwt.sign(
      {
         _id: this._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
         expiresIn: process.env.REFRESH_TOKEN_EXPIRY
      }
   )
}

export const User = mongoose.model("User", userSchema);


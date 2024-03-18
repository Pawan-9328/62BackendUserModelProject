import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { jwt } from "jsonwebtoken";
import { User } from "../models/user.model";
 
// in prodection code case if suppose we can't used res then we fill here _ [underscore] that means response  
export const verifyJWT = asyncHandler(async (req, _, next) => {
   try {
      // access cookies also check custom header in app senerio 
      const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
      // token nhi h 
      if (!token) {
         throw new ApiError(401, " Unauthorized request ");
      }
      // suppose token hai then 
      // verify token then give access decoded information..
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
      // data base request - findbyID.
      const user = await User.findById(decodedToken?._id).select("-password , -refreshToken")
      // no user 
      if (!user) {
         // NEXT_VIDEO: discuss about frontend...
         throw new ApiError(401, "Invalid Access Token ")
      }
      // if user exits [now add new object ]
      req.user = user;
      next();
   } catch (error) {

      throw new ApiError(401, error?.message || "Invalid access token ")

   }
})
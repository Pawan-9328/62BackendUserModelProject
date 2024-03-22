import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { jwt } from "jsonwebtoken";
import mongoose from "mongoose";




const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    // add value in object 
    user.refreshToken = refreshToken
    // user now save 
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token ")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend 
  // validation - not empty 
  // check if user already exits: username, email
  // check for images, check for avatar 
  // upload then to cloudinary, avatar
  // create user object- create entry in db
  // remove password and refresh token field from response
  // check for user creation 
  // return res 

  // extrat all data points with help f req.body...
  const { fullName, email, username, password } = req.body
  //console.log("email: ", email);
  //....passed on single if... 
  // if(fullName === "") {
  //     throw new ApiError(400, "Fullname is required ")
  // }
  //..pass on all data in single array no need multiple if condition passing..
  // check here anyone can send any empty string or not 
  if (
    [fullName, email, username, password].some((field) =>
      field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required ");
  }
  // check already user can exits 
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with email or username aleardy exits");
  }
  //console.log(req.files);

  // multer gives these access 
  // find local path of avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //.. if avatar not find to send error 
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required ")
  }
  // if avatar find now upload on cloudinary...
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  // show error to avatar can't upload 
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required ");
  }
  //...entry in databases... 
  //..create object..  
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    //...conner case hai to url liklo nhi to empty send krdo...
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  // show error if user can't create 
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user ")

  }
  // create successfully 
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully ")
  )
})



const loginUser = asyncHandler(async (req, res) => {
  // req body -> data 
  // username or email 
  // find the user 
  // password check
  //access and refresh token 
  //send cookies 

  const { email, username, password } = req.body
  console.log(email);

  if (!username && !email) {
    throw new ApiError(400, "username or password is required ")
  }
  // Here is alternative of above code based on logic descuss 
  // if (!username || !email) {
  //   throw new ApiError(400, "username or password is required ")
  // }

  const user = await User.findOne({
    $or: [{ username }, { email }]

  })

  if (!user) {
    throw new ApiError(404, "User does not exits ")

  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
  // access logged features 
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  //send cookies design options 
  const options = {
    // now modified only from server not frontend 
    httpOnly: true,
    secure: true,
  }
  return res
    .status(200).cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          // handle case user save own loggedUser and accessToken 
          user: loggedInUser, accessToken,
          refreshToken
        },
        "User logged In Succesfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  // reset refresh token..
  await User.findByIdAndUpdate(
    // find user 
    req.user._id,
    // now here you define what is i update
    {
      // for  used mongodb operator
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    // modified only from server not from frontend 
    httpOnly: true,
    secure: true,
  }
  // return cookies 
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


// end point of refreshToken
const refreshAccesssToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.
    refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(400, "unauthorized request ")
  }
  // verify upcoming token using jwt
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    // find decodedToken User 
    const user = await User.findById(decodedToken?._id)
    // No user 
    if (!user) {
      throw new ApiError(401, "Invalid refresh token ")
    }
    // match before give user access 
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")


    }

    //on that particular point all is done now we generate new tokens to user 
    const options = {
      httpOnly: true,
      secure: true,
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          " Access token refreshed "
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || " Invalid refresh Token ")
  }

})

//..change current password from user side...
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confPassword } = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password ")
  }
  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed successfully "))




})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched succesfully ")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required ")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email
      }
    },
    { new: true }

  ).select("-password")

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})
//update user avatar 

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar ")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }
  ).select("-password")
  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Avatar image updated successfully ")
    )
})
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverLocalImage = req.file?.path

  if (!coverLocalImage) {
    throw new ApiError(400, "Cover image file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverLocalImage)

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on CoverImage")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    { new: true }
  ).select("-password")
  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Cover image updated successfully ")
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

  const { username } = req.params;
  // optionally trim 
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing ")
  }
  const channel = await User.aggregate([
    // we write our first pipelines 
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      // find subscriber like how many subscriber to chaiorcode 
      $lookup: {
        from: "Subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    // this lokup define how many subscriber i subscribe
    {
      $lookup: {
        from: "Subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      // addFields operator store this valua and also add some additional fileds 
      $addFields: {
        subscribersCount: {
          // count all docs using size enter $ before subscribers because now is fields..
          $size: "$subscribers"
        },
        channelSubscribedCount: {
          $size: "#subscribedTo"
        },
        // show on screen is follow or not 
        isSubscribed: {
          $cond: {
            // in calculate in array and object both 
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }
    },
    // for projection like saare chize ko jo vo demand kr rh hai vo nhii dne k vjhe selected chize dna 
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }

  ])
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists ")
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
  // convert mongodb id string 
  const user = await User.aggregate([
    {
      // aggregation pipeline code send directly so we create mongoose object id 
      $match: {
        _id: new mongoose.Types.ObjectId(req.user, _id)

      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                },
                {
                  $addFields: {
                    owner: {
                      $first: "$owner"
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ])

   return res
   .status(200)
   .json(
     new ApiResponse(
        200,
         user[0].watchHistory,
         " Watch history fetched Succesfully "
     ) 
   )
})


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccesssToken,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
}





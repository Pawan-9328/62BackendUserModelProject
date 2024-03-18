import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAcessToken()
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

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data 
  // username or email 
  // find the user 
  // password check
  //access and refresh token 
  //send cookies 

  const { email, username, password } = req.body

  if (!username || !email) {
    throw new ApiError(400, "username or password is required ")
  }

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

export {
  registerUser,
  loginUser,
  logoutUser
}



import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

//..cloudinary configration..
cloudinary.config({

   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET,

});

const uploadOnCloudinary = async (localFilePath) => {
   try {
      if (!localFilePath) return null;
      //upload the file on cloudinary 
      const response = await cloudinary.uploader.upload(localFilePath, {
         resource_type: "auto"

      })
      // files has been uploaded succesfully 
     // console.log("file is uploaded on cloudinary", response.url);
     // unlink the file 
     fs.unlinkSync(localFilePath);
      return response;
   } catch (error) {
      fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload opertaion got failed 
      return null;
   }
}

export { uploadOnCloudinary };


// cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" },
//   function(error, result) {console.log(result); });
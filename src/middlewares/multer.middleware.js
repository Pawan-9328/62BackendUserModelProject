import multer from "multer";

//both are used diskstorage/memoryStorage 

const storage = multer.diskStorage({
   // this have multer 
   destination: function (req, file, cb) {
      cb(null, "./public/temp")
   },
   filename: function (req, file, cb) {
      // jiss name see username ne save ki hai 
      cb(null, file.originalname)
   }
})

export const upload = multer({ 
   storage,
 })
class ApiResponse {

   constructor(statusCode,data,message = "Success") {
       this.statusCode = statusCode
       this.data = data
       this.message = message
       // server status code[client error response]
       this.success = statusCode < 400
   }


}